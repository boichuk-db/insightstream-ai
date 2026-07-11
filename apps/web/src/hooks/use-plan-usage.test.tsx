import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { usePlanUsage } from "./use-plan-usage";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn() } as unknown as typeof api,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }
  return Wrapper;
}

describe("usePlanUsage", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("flags isNearLimit when usage crosses the 80% threshold", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        plan: "PRO",
        planName: "Pro",
        feedbacksThisMonth: { current: 80, max: 100 },
        projects: { current: 1, max: 5 },
      },
    });

    const { result } = renderHook(() => usePlanUsage("team-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isNearLimit).toBe(true);
    expect(result.current.isAtLimit).toBe(false);
  });

  it("does not flag isNearLimit below the 80% threshold", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        plan: "PRO",
        planName: "Pro",
        feedbacksThisMonth: { current: 50, max: 100 },
        projects: { current: 1, max: 5 },
      },
    });

    const { result } = renderHook(() => usePlanUsage("team-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isNearLimit).toBe(false);
    expect(result.current.isAtLimit).toBe(false);
  });

  it("flags isAtLimit when current meets or exceeds max", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        plan: "PRO",
        planName: "Pro",
        feedbacksThisMonth: { current: 100, max: 100 },
        projects: { current: 1, max: 5 },
      },
    });

    const { result } = renderHook(() => usePlanUsage("team-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAtLimit).toBe(true);
  });

  it("treats a null max as unlimited — never near or at limit", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        plan: "ENTERPRISE",
        planName: "Enterprise",
        feedbacksThisMonth: { current: 999999, max: null },
        projects: { current: 1, max: null },
      },
    });

    const { result } = renderHook(() => usePlanUsage("team-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isNearLimit).toBe(false);
    expect(result.current.isAtLimit).toBe(false);
  });
});
