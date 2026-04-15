'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, Suspense } from 'react'
import { PostHogPageView } from './PostHogPageView'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      capture_pageview: false,
      autocapture: true,
      session_recording: {
        maskAllInputs: true,
      },
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
