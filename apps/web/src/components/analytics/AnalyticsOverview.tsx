"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { TrendingUp, PieChart, Info } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/colors";

interface Feedback {
  id: string;
  content: string;
  source: string;
  category?: string;
  sentimentScore?: number;
  tags?: string[];
  createdAt: string;
}

interface AnalyticsProps {
  feedbacks: Feedback[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-brand-surface border border-brand-border rounded-lg shadow-xl p-3">
        <p className="text-zinc-300 font-medium mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: payload[0].payload.fill || payload[0].color,
            }}
          />
          <p className="text-white font-bold">
            {payload[0].value} {payload[0].name === "score" ? "%" : "items"}
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function AnalyticsOverview({ feedbacks }: AnalyticsProps) {
  const chartData = useMemo(() => {
    if (!feedbacks || feedbacks.length === 0)
      return { sentiment: [], categories: [] };

    // Sort by date ascending to ensure proper timeline
    const sorted = [...feedbacks].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    // 1. Process Sentiment Over Time
    const sentimentGroups: Record<
      string,
      { totalScore: number; count: number }
    > = {};

    // 2. Process Categories
    const categoryCounts: Record<string, number> = {};

    sorted.forEach((fb) => {
      // Group sentiment by date (MMM dd)
      if (fb.sentimentScore !== undefined && fb.sentimentScore !== null) {
        const dateKey = format(parseISO(fb.createdAt), "MMM dd");
        if (!sentimentGroups[dateKey])
          sentimentGroups[dateKey] = { totalScore: 0, count: 0 };
        sentimentGroups[dateKey].totalScore += fb.sentimentScore;
        sentimentGroups[dateKey].count += 1;
      }

      // Count Categories
      const cat = fb.category || "Uncategorized";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const sentimentData = Object.entries(sentimentGroups).map(
      ([date, data]) => ({
        date,
        // Convert to 0-100 scale for easier reading
        score: Math.round((data.totalScore / data.count) * 100),
      }),
    );

    const categoryData = Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort descending

    return { sentiment: sentimentData, categories: categoryData };
  }, [feedbacks]);

  if (!feedbacks || feedbacks.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 w-full">
      {/* Sentiment Trend Chart */}
      <div className="bg-brand-surface border border-brand-border/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-400" /> Sentiment Trend
          </h3>
          <span className="text-xs text-brand-muted px-2.5 py-1 bg-brand-bg rounded-full border border-brand-border/50">
            Avg Score (%)
          </span>
        </div>

        <div className="h-[250px] w-full">
          {chartData.sentiment.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData.sentiment}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#262626"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#737373", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#737373", fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#818cf8"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorScore)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-brand-muted text-sm gap-2">
              <Info size={16} /> Not enough AI sentiment data yet.
            </div>
          )}
        </div>
      </div>

      {/* Category Distribution Chart */}
      <div className="bg-brand-surface border border-brand-border/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <PieChart className="h-5 w-5 text-emerald-400" /> Category
            Distribution
          </h3>
          <span className="text-xs text-brand-muted px-2.5 py-1 bg-brand-bg rounded-full border border-brand-border/50">
            Total count
          </span>
        </div>

        <div className="h-[250px] w-full">
          {chartData.categories.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.categories}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                  stroke="#262626"
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#737373", fontSize: 12 }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a3a3a3", fontSize: 12, fontWeight: 500 }}
                  width={100}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "#171717" }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                  animationDuration={1500}
                >
                  {chartData.categories.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        CATEGORY_COLORS[entry.name]?.hex ||
                        CATEGORY_COLORS["Uncategorized"].hex
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm gap-2">
              <Info size={16} /> No categories found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
