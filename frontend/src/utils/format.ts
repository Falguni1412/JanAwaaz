import { DemandLevel } from '../types'

export const LEVEL_COLORS: Record<DemandLevel, string> = {
  Critical: '#DC2626', High: '#EA580C', Moderate: '#CA8A04',
  Emerging: '#0891B2', Low: '#16A34A',
}

export const LEVEL_BG: Record<DemandLevel, string> = {
  Critical: 'bg-red-50 text-red-700 border-red-200',
  High: 'bg-orange-50 text-orange-700 border-orange-200',
  Moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  Emerging: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Low: 'bg-green-50 text-green-700 border-green-200',
}

export const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}K`
  return n.toLocaleString('en-IN')
}

export const formatCrore = (n: number): string => `₹${n.toFixed(1)} Cr`

export const formatPct = (n: number, signed = false): string => {
  const sign = signed && n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

export const categoryLabel = (cat: string) =>
  cat.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')

export const CATEGORY_ICONS: Record<string, string> = {
  healthcare: '🏥', education: '🎓', roads: '🛣️', water: '💧',
  electricity: '⚡', internet: '🌐', public_transport: '🚌',
  sanitation: '🚽', public_safety: '🛡️', agriculture: '🌾',
  emergency_services: '🚑',
}
