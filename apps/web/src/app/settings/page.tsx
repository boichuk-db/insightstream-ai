'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PLAN_CONFIGS, PlanType, formatLimit, getPlanConfig } from '@/lib/plans';
import { Sparkles, ArrowLeft, User, Mail, Calendar, Loader2, Check, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const PLAN_ORDER = [PlanType.FREE, PlanType.PRO, PlanType.BUSINESS] as const;

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data;
    },
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['planUsage'],
    queryFn: async () => {
      const { data } = await api.get('/plans/usage');
      return data;
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const { data } = await api.patch('/plans/upgrade', { plan });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['planUsage'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    },
    onError: () => {
      alert('Failed to change plan. Please try again.');
    },
  });

  const currentPlan = (userProfile?.plan as PlanType) || PlanType.FREE;

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Back */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors mb-10"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-neutral-500 mb-10">Manage your account and subscription plan.</p>

        {/* Profile Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900/60 border border-neutral-800/50 rounded-2xl p-6 mb-8"
        >
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-neutral-400" /> Profile
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-neutral-950/50 rounded-xl border border-neutral-800/50">
              <Mail className="h-4 w-4 text-neutral-500" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Email</p>
                <p className="text-sm text-neutral-200">{userProfile?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-neutral-950/50 rounded-xl border border-neutral-800/50">
              <Calendar className="h-4 w-4 text-neutral-500" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Member since</p>
                <p className="text-sm text-neutral-200">
                  {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Usage Section */}
        {usage && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-neutral-900/60 border border-neutral-800/50 rounded-2xl p-6 mb-8"
          >
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-neutral-400" /> Current Usage
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <UsageMeter label="Projects" current={usage.projects.current} max={usage.projects.max} />
              <UsageMeter label="Feedbacks this month" current={usage.feedbacksThisMonth.current} max={usage.feedbacksThisMonth.max} />
              <div className="p-4 bg-neutral-950/50 rounded-xl border border-neutral-800/50">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">AI Analysis</p>
                <p className="text-lg font-bold text-white capitalize">{usage.features.aiAnalysis}</p>
              </div>
            </div>
          </motion.section>
        )}

        {/* Plan Selection */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-neutral-900/60 border border-neutral-800/50 rounded-2xl p-6"
        >
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" /> Subscription Plan
          </h2>
          <p className="text-sm text-neutral-500 mb-6">Select a plan that fits your needs. Changes take effect immediately.</p>

          <div className="grid md:grid-cols-3 gap-4">
            {PLAN_ORDER.map((planType) => {
              const config = PLAN_CONFIGS[planType];
              const isCurrent = currentPlan === planType;
              const isUpgrading = upgradeMutation.isPending;

              return (
                <div
                  key={planType}
                  className={cn(
                    "relative flex flex-col p-5 rounded-xl border transition-all",
                    isCurrent
                      ? "border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                      : "border-neutral-800/50 bg-neutral-950/50 hover:border-neutral-700"
                  )}
                >
                  {isCurrent && (
                    <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold uppercase rounded">
                      Current
                    </div>
                  )}

                  <h3 className="text-base font-bold mb-1">{config.name}</h3>
                  <p className="text-xs text-neutral-500 mb-3">{config.description}</p>

                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-extrabold">
                      {config.price === 0 ? 'Free' : `$${config.price}`}
                    </span>
                    {config.price > 0 && <span className="text-neutral-500 text-xs">/mo</span>}
                  </div>

                  <div className="flex-1 space-y-2 mb-4 text-xs text-neutral-400">
                    <p>{formatLimit(config.maxProjects)} project{config.maxProjects !== 1 ? 's' : ''}</p>
                    <p>{formatLimit(config.maxFeedbacksPerMonth)} feedbacks/mo</p>
                    <p>AI: {config.aiAnalysis}</p>
                    <p>Digest: {config.weeklyDigest ? 'Yes' : 'No'}</p>
                    <p>Export: {config.dataExport ? 'Yes' : 'No'}</p>
                  </div>

                  {isCurrent ? (
                    <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-semibold">
                      <Check className="h-3.5 w-3.5" /> Active Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => upgradeMutation.mutate(planType)}
                      disabled={isUpgrading}
                      className={cn(
                        "py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50",
                        planType === PlanType.BUSINESS
                          ? "bg-amber-500 hover:bg-amber-600 text-black"
                          : planType === PlanType.PRO
                            ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                            : "bg-neutral-800 hover:bg-neutral-700 text-white"
                      )}
                    >
                      {isUpgrading ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Changing...
                        </span>
                      ) : (
                        `Switch to ${config.name}`
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function UsageMeter({ label, current, max }: { label: string; current: number; max: number | null }) {
  const pct = max ? Math.min(100, (current / max) * 100) : 0;
  return (
    <div className="p-4 bg-neutral-950/50 rounded-xl border border-neutral-800/50">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">{label}</p>
      <p className="text-lg font-bold text-white">
        {current} <span className="text-neutral-500 text-sm font-normal">/ {max ?? '\u221e'}</span>
      </p>
      {max && (
        <div className="mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-indigo-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
