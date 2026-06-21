import { User, Mail, Calendar } from 'lucide-react'
import { GlowCard } from '@/components/ui/glow-card'

interface AccountCardProps {
  email: string | null
  createdAt: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function AccountCard({ email, createdAt }: AccountCardProps) {
  return (
    <GlowCard className="p-0 overflow-hidden bg-card/50">
      <div className="border-b border-white/5 bg-white/5 px-6 py-4">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Account Details</h2>
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">
        <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-xl p-4 transition-colors hover:bg-white/10">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/40 shadow-inner">
            <Mail className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Email Address
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-200 truncate">
              {email ?? 'No email on file'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-xl p-4 transition-colors hover:bg-white/10">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/40 shadow-inner">
            <Calendar className="h-4 w-4 text-zinc-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Member Since
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-200">{formatDate(createdAt)}</p>
          </div>
        </div>

        <div className="mt-2 pt-5 border-t border-white/5">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
            Account email is synchronized from your GitHub integration.
          </p>
        </div>
      </div>
    </GlowCard>
  )
}
