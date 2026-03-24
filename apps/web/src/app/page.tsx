'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ArrowRight, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

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
        // If registered successfully without token return, switch to login
        setIsLogin(true);
        setPassword('');
      }
    },
    onError: (error: any) => {
      console.error('Authentication Error:', error);
      const serverMsg = error.response?.data?.message;
      if (typeof serverMsg === 'string') {
        setErrorMsg(serverMsg);
      } else if (Array.isArray(serverMsg)) {
        setErrorMsg(serverMsg[0]);
      } else {
        setErrorMsg(isLogin ? 'Invalid email or password.' : 'Failed to create account. User might already exist.');
      }
    },
  });

  return (
    <div className="flex min-h-screen">
      {/* Left side - Product showcase */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-neutral-900 p-12 relative overflow-hidden">
        {/* Decorative dynamic shapes */}
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
            className="text-neutral-400 text-lg sm:text-xl leading-relaxed"
          >
            A powerful, AI-driven platform for collecting, analyzing, and acting upon user feedback at scale. Welcome to the future of product development.
          </motion.p>
        </div>

        <div className="relative z-10 mt-12 text-sm text-neutral-500">
          © {new Date().getFullYear()} InsightStream. All rights reserved.
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 relative bg-neutral-950">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[120px] mix-blend-screen translate-x-1/2 -translate-y-1/4 pointer-events-none lg:hidden" />
        
        <div className="w-full max-w-sm mx-auto relative z-10">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-neutral-400">
              {isLogin 
                ? 'Enter your credentials to access your dashboard.' 
                : 'Sign up to start analyzing feedback with AI.'}
            </p>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              authMutation.mutate();
            }} 
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300 ml-1">Email</label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300 ml-1">Password</label>
              <div className="relative">
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-6" 
              isLoading={authMutation.isPending}
            >
              {isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            {errorMsg && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm text-center">
                {errorMsg}
              </div>
            )}
          </form>

          <div className="mt-8 text-center text-sm text-neutral-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors focus:outline-none"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
