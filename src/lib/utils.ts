import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function healthColor(score: number): string {
  if (score >= 75) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-500'
  return 'text-red-500'
}

export function healthBg(score: number): string {
  if (score >= 75) return 'bg-emerald-50 border-emerald-200'
  if (score >= 50) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    new: 'bg-slate-100 text-slate-600',
    qualified: 'bg-blue-50 text-blue-700',
    proposal: 'bg-violet-50 text-violet-700',
    won: 'bg-emerald-50 text-emerald-700',
    lost: 'bg-red-50 text-red-500',
    active: 'bg-emerald-50 text-emerald-700',
    paused: 'bg-amber-50 text-amber-600',
    ended: 'bg-slate-100 text-slate-500',
    not_started: 'bg-slate-100 text-slate-500',
    in_progress: 'bg-blue-50 text-blue-700',
    review: 'bg-violet-50 text-violet-700',
    done: 'bg-emerald-50 text-emerald-700',
  }
  return map[status] ?? 'bg-slate-100 text-slate-500'
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)
}

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
