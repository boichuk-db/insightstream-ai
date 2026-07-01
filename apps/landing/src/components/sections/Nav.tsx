import { Sparkles } from 'lucide-react'
import { APP_URL } from '@/lib/constants'

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-brand-border bg-brand-bg/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="h-5 w-5 text-brand-accent" />
          InsightStream
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`${APP_URL}/`}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Sign In
          </a>
          <a
            href={`${APP_URL}/`}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>
    </nav>
  )
}
