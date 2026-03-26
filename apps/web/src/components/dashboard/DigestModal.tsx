'use client';

import { X, Sparkles, TrendingDown, Tag, BarChart2, CalendarDays, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DigestData {
  projectName: string;
  since: string;
  totalCount: number;
  avgSentiment: number;
  categories: Record<string, number>;
  topTags: string[];
  mostNegative: Array<{ content: string; sentimentScore: number | null }>;
  aiSummary: string;
}

interface DigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  data: DigestData | null;
  error: string | null;
}

const CATEGORY_COLOR: Record<string, string> = {
  Bug: 'bg-red-500',
  Feature: 'bg-emerald-500',
  'UI/UX': 'bg-pink-500',
  Improvement: 'bg-blue-500',
  Performance: 'bg-orange-500',
  Billing: 'bg-yellow-500',
  Support: 'bg-violet-500',
  Security: 'bg-rose-600',
};

export function DigestModal({ isOpen, onClose, isLoading, data, error }: DigestModalProps) {
  if (!isOpen) return null;

  const sentimentPct = data ? Math.round(data.avgSentiment * 100) : 0;
  const sentimentColor = data
    ? data.avgSentiment > 0.6 ? 'text-emerald-400' : data.avgSentiment < 0.4 ? 'text-red-400' : 'text-amber-400'
    : 'text-zinc-400';

  const since = data ? new Date(data.since).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' }) : '';
  const topCategory = data
    ? Object.entries(data.categories).sort((a, b) => b[1] - a[1])[0]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col bg-brand-bg/20 border-brand-border/50 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-indigo-500/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <Sparkles className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AI Weekly Digest</h2>
              <p className="text-[11px] text-brand-muted">
                {data ? `${data.projectName} · ${since} – сьогодні` : 'Генерація...'}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="xs" 
            onClick={onClose} 
            className="p-1.5 hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-zinc-400">Gemini аналізує тренди...</p>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {data && !isLoading && (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-indigo-400">{data.totalCount}</p>
                  <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Фідбеків
                  </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className={cn("text-2xl font-black", sentimentColor)}>{sentimentPct}%</p>
                  <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-1">Avg Sentiment</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-lg font-black text-white truncate">{topCategory?.[0] ?? '—'}</p>
                  <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-1">Топ категорія</p>
                </div>
              </div>

              {/* AI Summary */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Gemini Аналіз</span>
                </div>
                <div
                  className="text-sm text-zinc-300 leading-relaxed bg-indigo-500/5 border border-indigo-500/10 rounded-xl px-4 py-3 space-y-2 [&_p]:mb-2 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ __html: data.aiSummary }}
                />
              </div>

              {/* Category bars */}
              {Object.keys(data.categories).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart2 className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Розбивка по категоріях</span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(data.categories)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, count]) => {
                        const pct = Math.round((count / data.totalCount) * 100);
                        const barColor = CATEGORY_COLOR[cat] || 'bg-zinc-500';
                        return (
                          <div key={cat} className="flex items-center gap-3">
                            <span className="text-xs text-zinc-400 w-24 shrink-0">{cat}</span>
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-brand-muted w-12 text-right">{count} ({pct}%)</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Tags */}
              {data.topTags.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Топ теги</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.topTags.map(tag => (
                      <span key={tag} className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-violet-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Most negative */}
              {data.mostNegative.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Найбільш негативні</span>
                  </div>
                  <div className="space-y-2">
                    {data.mostNegative.map((fb, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                        <span className="text-[10px] font-mono text-red-400 font-bold mt-0.5 shrink-0">
                          {Math.round((fb.sentimentScore ?? 0.5) * 100)}%
                        </span>
                        <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">{fb.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
