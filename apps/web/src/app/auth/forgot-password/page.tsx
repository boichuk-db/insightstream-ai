"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Sparkles } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post("/auth/forgot-password", { email });
    },
    onSuccess: () => setSubmitted(true),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 text-brand-fg font-medium">
          <Sparkles className="text-brand-accent" />
          <span>InsightStream AI</span>
        </div>

        {submitted ? (
          <div data-testid="success-message" className="space-y-4">
            <h2 className="text-2xl font-bold">Check your inbox</h2>
            <p className="text-brand-muted">
              If an account with <strong>{email}</strong> exists, we&apos;ve
              sent a reset link. Check your spam folder too.
            </p>
            <Link
              href="/"
              className="text-brand-accent hover:text-brand-accent/80 text-sm"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Forgot your password?</h2>
              <p className="text-brand-muted text-sm">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-brand-muted ml-1">
                  Email
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    data-testid="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
                </div>
              </div>

              {mutation.isError && (
                <p className="text-red-400 text-sm">
                  Something went wrong. Please try again.
                </p>
              )}

              <Button
                type="submit"
                data-testid="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={mutation.isPending}
              >
                Send reset link
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-brand-muted">
              <Link href="/" className="text-brand-accent hover:text-brand-accent/80">
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
