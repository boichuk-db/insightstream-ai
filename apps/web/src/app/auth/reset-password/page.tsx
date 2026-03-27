'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Sparkles } from 'lucide-react';

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [clientError, setClientError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/reset-password', { token, newPassword });
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => router.push('/?reset=success'), 2000);
    },
  });

  if (!token) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Invalid link</h2>
        <p className="text-zinc-400">This reset link is missing a token.</p>
        <Link href="/auth/forgot-password" className="text-indigo-400 hover:text-indigo-300 text-sm">
          Request a new reset link →
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Password updated!</h2>
        <p className="text-zinc-400">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Set a new password</h2>
        <p className="text-zinc-400 text-sm">Must be at least 8 characters.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setClientError('');
          if (newPassword.length < 8) {
            setClientError('Password must be at least 8 characters.');
            return;
          }
          if (newPassword !== confirm) {
            setClientError('Passwords do not match.');
            return;
          }
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 ml-1">New password</label>
          <div className="relative">
            <Input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10"
              required
            />
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 ml-1">Confirm password</label>
          <div className="relative">
            <Input
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="pl-10"
              required
            />
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          </div>
        </div>

        {(clientError || mutation.isError) && (
          <p className="text-red-400 text-sm">
            {clientError ||
              ((mutation.error as any)?.response?.data?.message ?? 'This link has expired. Please request a new one.')}
          </p>
        )}

        {mutation.isError && !clientError && (
          <Link href="/auth/forgot-password" className="text-indigo-400 hover:text-indigo-300 text-sm block">
            Request a new reset link →
          </Link>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={mutation.isPending}
        >
          Update password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 text-white font-medium">
          <Sparkles className="text-indigo-400" />
          <span>InsightStream AI</span>
        </div>
        <Suspense fallback={<p className="text-zinc-400">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
