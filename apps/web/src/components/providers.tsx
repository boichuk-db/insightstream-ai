"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ThemeProvider } from "next-themes";
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
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="is-appearance"
    >
      <PostHogProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </PostHogProvider>
    </ThemeProvider>
  );
}
