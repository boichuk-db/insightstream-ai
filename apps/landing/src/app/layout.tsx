import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'InsightStream AI — AI-Powered Feedback Analytics for B2B SaaS',
  description:
    'Collect user feedback with an embeddable widget, analyze it with AI, and get weekly digests. Start free.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="bg-brand-bg text-white antialiased">{children}</body>
    </html>
  )
}
