import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
import { MotionProvider } from '@/components/MotionProvider'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'InsightStream AI — AI-Powered Feedback Analytics for B2B SaaS',
  description:
    'Collect user feedback with an embeddable widget, analyze it with AI, and get weekly digests. Start free.',
  openGraph: {
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="bg-brand-bg text-white antialiased">
        <MotionProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </MotionProvider>
      </body>
    </html>
  )
}
