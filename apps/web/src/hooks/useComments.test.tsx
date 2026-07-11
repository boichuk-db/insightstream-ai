import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useComments } from "./useComments";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  } as unknown as typeof api,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

describe("useComments", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset().mockResolvedValue({ data: [] });
    vi.mocked(api.post)
      .mockReset()
      .mockResolvedValue({ data: { id: "c1", content: "hi" } });
    vi.mocked(api.delete).mockReset().mockResolvedValue({ data: {} });
  });

  it("does not submit when the draft is empty or whitespace-only", async () => {
    const { result } = renderHook(() => useComments("feedback-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setDraft("   ");
    });
    // submit() is a no-op guard (`if (!draft.trim()) return;`), so there's no
    // state change to waitFor. Flush the microtask queue explicitly — TanStack
    // Query's mutate() dispatches through a promise chain before it ever
    // reaches mutationFn, so asserting immediately after a bare act() would
    // pass trivially even if the guard were deleted (proven during review).
    await act(async () => {
      result.current.submit();
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(api.post).not.toHaveBeenCalled();
  });

  it("submits the trimmed draft and clears it on success", async () => {
    const { result } = renderHook(() => useComments("feedback-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setDraft("  Great point  ");
    });
    act(() => {
      result.current.submit();
    });

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/feedbacks/feedback-1/comments", {
        content: "Great point",
      }),
    );
    await waitFor(() => expect(result.current.draft).toBe(""));
  });

  it("deletes a comment by id", async () => {
    const { result } = renderHook(() => useComments("feedback-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.deleteComment("c1");
    });

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/comments/c1"));
  });
});
