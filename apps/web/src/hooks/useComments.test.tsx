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
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.mocked(api.post).mockResolvedValue({ data: { id: "c1", content: "hi" } });
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
  });

  it("does not submit when the draft is empty or whitespace-only", async () => {
    const { result } = renderHook(() => useComments("feedback-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setDraft("   ");
    });
    act(() => {
      result.current.submit();
    });

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
