export const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string; hex: string }
> = {
  Bug: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
    hex: "#f87171",
  },
  Feature: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    hex: "#34d399",
  },
  "UI/UX": {
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-400",
    border: "border-fuchsia-500/20",
    hex: "#e879f9",
  },
  Performance: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    hex: "#fbbf24",
  },
  Billing: {
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/20",
    hex: "#38bdf8",
  },
  Improvement: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/20",
    hex: "#a78bfa",
  },
  Support: {
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/20",
    hex: "#2dd4bf",
  },
  Uncategorized: {
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    border: "border-zinc-500/20",
    hex: "#a3a3a3",
  },
};

export const getCategoryColor = (category: string | undefined | null) => {
  return (
    CATEGORY_COLORS[category as string] || CATEGORY_COLORS["Uncategorized"]
  );
};
