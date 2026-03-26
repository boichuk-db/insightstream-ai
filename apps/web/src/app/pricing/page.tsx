'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, X, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { PLAN_CONFIGS, PlanType, formatLimit } from '@/lib/plans';
import { api } from '@/lib/api';

const FEATURES = [
  { key: 'maxProjects', label: 'Projects' },
  { key: 'maxFeedbacksPerMonth', label: 'Feedbacks / month' },
  { key: 'aiAnalysis', label: 'AI Analysis' },
  { key: 'weeklyDigest', label: 'Weekly AI Digest' },
  { key: 'widgetCustomization', label: 'Widget Customization' },
  { key: 'dataExport', label: 'Data Export (CSV)' },
] as const;

function formatFeatureValue(key: string, value: any): string | boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' || value === null) return formatLimit(value);
  if (key === 'aiAnalysis') {
    if (value === 'none') return false;
    if (value === 'basic') return 'Basic';
    return 'Full';
  }
  if (key === 'widgetCustomization') {
    if (value === 'basic') return 'Basic';
    if (value === 'full') return 'Full';
    return 'Full + Whitelabel';
  }
  return String(value);
}

const PLAN_ORDER = [PlanType.FREE, PlanType.PRO, PlanType.BUSINESS] as const;
const CARD_STYLES: Record<PlanType, { border: string; badge: string; glow: string; btn: string }> = {
  [PlanType.FREE]: {
    border: 'border-brand-border',
    badge: '',
    glow: '',
    btn: 'bg-brand-surface hover:bg-brand-surface-hover text-white',
  },
  [PlanType.PRO]: {
    border: 'border-indigo-500/50',
    badge: 'bg-indigo-500 text-white',
    glow: 'shadow-[0_0_40px_rgba(99,102,241,0.15)]',
    btn: 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]',
  },
  [PlanType.BUSINESS]: {
    border: 'border-amber-500/30',
    badge: 'bg-amber-500 text-black',
    glow: '',
    btn: 'bg-amber-500 hover:bg-amber-600 text-black font-bold',
  },
};

export default function PricingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const handleUpgrade = async (plan: PlanType) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/');
      return;
    }

    setUpgrading(plan);
    try {
      await api.patch('/plans/upgrade', { plan });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['planUsage'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      router.push('/dashboard');
    } catch {
      alert('Failed to upgrade. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-brand-muted hover:text-zinc-300 transition-colors mb-12"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-semibold mb-6"
          >
            <Sparkles className="h-3.5 w-3.5" /> Simple, transparent pricing
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
          >
            Choose your plan
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-400 text-lg max-w-md mx-auto"
          >
            Start free, upgrade when you need more power. No hidden fees.
          </motion.p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {PLAN_ORDER.map((planType, i) => {
            const config = PLAN_CONFIGS[planType];
            const styles = CARD_STYLES[planType];
            const isPopular = planType === PlanType.PRO;

            return (
              <motion.div
                key={planType}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i + 0.3 }}
                className={`relative flex flex-col bg-brand-bg/60 border-brand-border/50 ${styles.border} rounded-2xl p-8 ${styles.glow} ${isPopular ? 'md:-mt-4 md:mb-0' : ''}`}
              >
                {isPopular && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold ${styles.badge}`}>
                    Most Popular
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-1">{config.name}</h3>
                  <p className="text-sm text-brand-muted">{config.description}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold">
                      {config.price === 0 ? 'Free' : `$${config.price}`}
                    </span>
                    {config.price > 0 && (
                      <span className="text-brand-muted text-sm">/month</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-4 mb-8">
                  {FEATURES.map(({ key, label }) => {
                    const raw = config[key as keyof typeof config];
                    const display = formatFeatureValue(key, raw);
                    const isEnabled = display !== false;

                    return (
                      <div key={key} className="flex items-center gap-3">
                        {isEnabled ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                            <X className="h-3 w-3 text-zinc-600" />
                          </div>
                        )}
                        <span className={`text-sm ${isEnabled ? 'text-zinc-300' : 'text-zinc-600'}`}>
                          {typeof display === 'string' ? `${label}: ${display}` : label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => planType === PlanType.FREE ? router.push('/') : handleUpgrade(planType)}
                  disabled={upgrading !== null}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${styles.btn}`}
                >
                  {upgrading === planType ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Upgrading...
                    </span>
                  ) : planType === PlanType.FREE ? (
                    'Get Started'
                  ) : (
                    `Upgrade to ${config.name}`
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-zinc-600">
          All plans include SSL encryption, 99.9% uptime SLA, and community support.
        </div>
      </div>
    </div>
  );
}
