'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    setIsLoggedIn(!!accessToken);
  }, []);

  const { data: info, isLoading, isError } = useQuery({
    queryKey: ['invitationInfo', token],
    queryFn: async () => {
      const { data } = await api.get(`/invitations/info?token=${token}`);
      return data;
    },
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/invitations/accept', { token });
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem('activeTeamId', data.teamId);
      setTimeout(() => router.push('/dashboard'), 1500);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to accept invitation');
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-zinc-400 text-center">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h1 className="text-xl font-bold text-white mb-2">Invalid Link</h1>
          <p>No invitation token found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-brand-surface/60 border border-brand-border/50 rounded-2xl p-8 text-center"
      >
        {isLoading ? (
          <div className="py-8">
            <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Loading invitation...</p>
          </div>
        ) : isError ? (
          <div>
            <XCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <h1 className="text-xl font-bold text-white mb-2">Invitation Not Found</h1>
            <p className="text-zinc-400 mb-6">This invitation link may be invalid or expired.</p>
            <a href="/" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
              Go to homepage
            </a>
          </div>
        ) : info?.status === 'expired' ? (
          <div>
            <Clock className="h-12 w-12 mx-auto mb-4 text-amber-400" />
            <h1 className="text-xl font-bold text-white mb-2">Invitation Expired</h1>
            <p className="text-zinc-400 mb-6">
              This invitation to <strong className="text-white">{info.teamName}</strong> has expired.
              Ask the team admin to send a new one.
            </p>
          </div>
        ) : info?.status === 'accepted' ? (
          <div>
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
            <h1 className="text-xl font-bold text-white mb-2">Already Accepted</h1>
            <p className="text-zinc-400 mb-6">
              You've already joined <strong className="text-white">{info.teamName}</strong>.
            </p>
            <Button 
              variant="primary" 
              size="md" 
              onClick={() => router.push('/dashboard')}
            >
              Go to Dashboard
            </Button>
          </div>
        ) : acceptMutation.isSuccess ? (
          <div>
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
            <h1 className="text-xl font-bold text-white mb-2">Welcome to the team!</h1>
            <p className="text-neutral-400">Redirecting to dashboard...</p>
          </div>
        ) : (
          <div>
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
              <Users className="h-8 w-8 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Team Invitation</h1>
            <p className="text-neutral-400 mb-1">
              You've been invited to join
            </p>
            <p className="text-lg font-bold text-white mb-1">{info?.teamName}</p>
            {info?.inviterEmail && (
              <p className="text-sm text-neutral-500 mb-1">by {info.inviterEmail}</p>
            )}
            {info?.role && (
              <p className="text-sm text-neutral-400 mb-6">
                as <span className="font-semibold text-indigo-400 capitalize">{info.role}</span>
              </p>
            )}

            {isLoggedIn ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => acceptMutation.mutate()}
                isLoading={acceptMutation.isPending}
                className="w-full"
              >
                Join Team
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-neutral-500 mb-4">Sign in or create an account to join.</p>
                <a href={`/auth?redirect=/invite/accept?token=${token}`} className="block w-full">
                  <Button variant="primary" size="lg" className="w-full">
                    Sign In to Join
                  </Button>
                </a>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
