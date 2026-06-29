"use client";

import {
  Sparkles,
  TrendingDown,
  Tag,
  BarChart2,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { SentimentBar } from "@/components/ui/sentiment-bar";
import { LabeledSection } from "@/components/ui/labeled-section";
import { getCategoryColor } from "@/lib/colors";

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

export function DigestModal({
  isOpen,
  onClose,
  isLoading,
  data,
  error,
}: DigestModalProps) {
  const sentimentPct = data ? Math.round(data.avgSentiment * 100) : 0;
  const sentimentColor = data
    ? data.avgSentiment > 0.6
      ? "text-emerald-400"
      : data.avgSentiment < 0.4
        ? "text-red-400"
        : "text-amber-400"
    : "text-zinc-400";

  const since = data
    ? new Date(data.since).toLocaleDateString("uk-UA", {
        day: "numeric",
        month: "long",
      })
    : "";
  const topCategory = data
    ? Object.entries(data.categories).sort((a, b) => b[1] - a[1])[0]
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Weekly Digest"
      icon={
        <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
          <Sparkles className="h-4 w-4 text-indigo-400" />
        </div>
      }
      size="lg"
    >
      <div className="space-y-6">
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
            {/* Subtitle */}
            <p className="text-xs text-brand-muted -mt-2">
              {data.projectName} · {since} – сьогодні
            </p>

            {/* KPI row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-indigo-400">
                  {data.totalCount}
                </p>
                <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
                  <CalendarDays className="h-3 w-3" /> Фідбеків
                </p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <p className={cn("text-2xl font-black", sentimentColor)}>
                  {sentimentPct}%
                </p>
                <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-1">
                  Avg Sentiment
                </p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <p className="text-lg font-black text-white truncate">
                  {topCategory?.[0] ?? "—"}
                </p>
                <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-1">
                  Топ категорія
                </p>
              </div>
            </div>

            {/* AI Summary */}
            <LabeledSection icon={Sparkles} label="Gemini Аналіз" iconColor="text-indigo-400">
              <div
                className="text-sm text-zinc-300 leading-relaxed bg-indigo-500/5 border border-indigo-500/10 rounded-xl px-4 py-3 space-y-2 [&_p]:mb-2 [&_p:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: data.aiSummary }}
              />
            </LabeledSection>

            {/* Category bars */}
            {Object.keys(data.categories).length > 0 && (
              <LabeledSection icon={BarChart2} label="Розбивка по категоріях" iconColor="text-zinc-400">
                <div className="space-y-2">
                  {Object.entries(data.categories)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => {
                      const pct = Math.round((count / data.totalCount) * 100);
                      const barColor = getCategoryColor(cat).bg.replace(
                        "/10",
                        "",
                      ); // Use full opacity for bars
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <span className="text-xs text-zinc-400 w-24 shrink-0">
                            {cat}
                          </span>
                          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", barColor)}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-brand-muted w-12 text-right">
                            {count} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                </div>
              </LabeledSection>
            )}

            {/* Tags */}
            {data.topTags.length > 0 && (
              <LabeledSection icon={Tag} label="Топ теги" iconColor="text-zinc-400">
                <div className="flex flex-wrap gap-2">
                  {data.topTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-violet-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </LabeledSection>
            )}

            {/* Most negative */}
            {data.mostNegative.length > 0 && (
              <LabeledSection icon={TrendingDown} label="Найбільш негативні" iconColor="text-red-400">
                <div className="space-y-2">
                  {data.mostNegative.map((fb, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl"
                    >
                      <SentimentBar
                        score={fb.sentimentScore ?? 0.5}
                        className="shrink-0 mt-0.5"
                      />
                      <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                        {fb.content}
                      </p>
                    </div>
                  ))}
                </div>
              </LabeledSection>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
