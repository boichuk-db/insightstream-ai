"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { PostHogProvider } from "./providers/PostHogProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Handle bfcache restoration — refetch stale queries when page is restored
  useEffect(() => {
    const handler = (event: PageTransitionEvent) => {
      if (event.persisted) {
        queryClient.invalidateQueries();
      }
    };
    window.addEventListener("pageshow", handler);
    return () => window.removeEventListener("pageshow", handler);
  }, [queryClient]);

  return (
    <PostHogProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PostHogProvider>
  );
}
