import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { APP_URL } from '@/lib/constants'

export function Footer() {
  return (
    <footer className="border-t border-brand-border py-12 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 font-bold">
          <Sparkles className="h-4 w-4 text-brand-accent" />
          InsightStream AI
        </div>
        <nav className="flex items-center gap-6 text-sm text-zinc-500">
          <Link href="/quiz" className="hover:text-zinc-300 transition-colors">Quiz</Link>
          <a href={`${APP_URL}/pricing`} className="hover:text-zinc-300 transition-colors">Pricing</a>
          <a href={`${APP_URL}/`} className="hover:text-zinc-300 transition-colors">Sign In</a>
        </nav>
        <div className="text-xs text-zinc-600">
          © {new Date().getFullYear()} InsightStream. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
