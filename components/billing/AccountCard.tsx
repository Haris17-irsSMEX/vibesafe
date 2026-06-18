import { User, Mail, Calendar } from 'lucide-react'

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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-indigo-500" />
          <h2 className="text-base font-semibold text-slate-900">Account</h2>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
            <Mail className="h-4 w-4 text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Email address
            </p>
            <p className="mt-0.5 text-sm text-slate-900 truncate">
              {email ?? 'No email on file'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
            <Calendar className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Member since
            </p>
            <p className="mt-0.5 text-sm text-slate-900">{formatDate(createdAt)}</p>
          </div>
        </div>

        <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
          Account email is managed through your GitHub OAuth connection.
        </p>
      </div>
    </div>
  )
}
