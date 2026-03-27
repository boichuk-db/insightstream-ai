'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ArrowRight, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Show OAuth error if redirected back from failed OAuth
  const oauthError = searchParams.get('error');
  const resetSuccess = searchParams.get('reset') === 'success';

  const authMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg('');
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const { data } = await api.post(endpoint, { email, password });
      return data;
    },
    onSuccess: (data) => {
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        router.push('/dashboard');
      } else if (!isLogin) {
        setIsLogin(true);
        setPassword('');
      }
    },
    onError: (error: any) => {
      const serverMsg = error.response?.data?.message;
      if (typeof serverMsg === 'string') {
        setErrorMsg(serverMsg);
      } else if (Array.isArray(serverMsg)) {
        setErrorMsg(serverMsg[0]);
      } else {
        setErrorMsg(
          isLogin ? 'Invalid email or password.' : 'Failed to create account. User might already exist.',
        );
      }
    },
  });

  return (
    <div className="w-full max-w-sm mx-auto relative z-10">
      <div className="mb-10 text-center lg:text-left">
        <h2 className="text-3xl font-bold tracking-tight mb-2">
          {isLogin ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="text-zinc-400">
          {isLogin
            ? 'Enter your credentials to access your dashboard.'
            : 'Sign up to start analyzing feedback with AI.'}
        </p>
      </div>

      {/* OAuth buttons */}
      <div className="space-y-3 mb-6">
        <a
          href={`${API_URL}/auth/google`}
          className="flex items-center justify-center gap-3 w-full px-4 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition-colors text-sm font-medium text-zinc-200"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </a>

        <a
          href={`${API_URL}/auth/github`}
          className="flex items-center justify-center gap-3 w-full px-4 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition-colors text-sm font-medium text-zinc-200"
        >
          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          Continue with GitHub
        </a>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-950 px-2 text-zinc-500">or</span>
        </div>
      </div>

      {resetSuccess && (
        <div className="mb-4 p-3 bg-green-950/40 border border-green-800/50 rounded text-green-400 text-sm text-center">
          Password updated successfully. Please sign in.
        </div>
      )}

      {(oauthError || errorMsg) && (
        <div className="mb-4 p-3 bg-red-950/40 border border-red-800/50 rounded text-red-400 text-sm text-center">
          {oauthError === 'oauth_failed'
            ? 'OAuth sign-in failed. Please try again.'
            : oauthError === 'no_email'
            ? 'Your OAuth account has no public email. Please use email/password.'
            : errorMsg}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          authMutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 ml-1">Email</label>
          <div className="relative">
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-300 ml-1">Password</label>
            {isLogin && (
              <Link
                href="/auth/forgot-password"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
            />
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-6"
          isLoading={authMutation.isPending}
        >
          {isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-zinc-500">
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors focus:outline-none"
        >
          {isLogin ? 'Sign up' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Product showcase */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-zinc-900 p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] mix-blend-screen translate-x-1/2 -translate-y-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[100px] mix-blend-screen -translate-x-1/4 translate-y-1/4 pointer-events-none" />
        <div className="relative z-10 text-white font-medium flex items-center gap-2 text-xl">
          <Sparkles className="text-indigo-400" /> InsightStream AI
        </div>
        <div className="relative z-10 max-w-lg mt-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl font-bold font-sans tracking-tight mb-6"
          >
            Turn every feedback into actionable insights.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-zinc-400 text-lg sm:text-xl leading-relaxed"
          >
            A powerful, AI-driven platform for collecting, analyzing, and acting upon user feedback at scale.
          </motion.p>
        </div>
        <div className="relative z-10 mt-12 text-sm text-brand-muted">
          © {new Date().getFullYear()} InsightStream. All rights reserved.
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 relative bg-zinc-950">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[120px] mix-blend-screen translate-x-1/2 -translate-y-1/4 pointer-events-none lg:hidden" />
        <Suspense fallback={null}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
