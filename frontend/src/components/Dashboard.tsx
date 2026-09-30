import { DemandLevel } from '../types'
import { LEVEL_BG, LEVEL_COLORS, formatNumber } from '../utils/format'

export function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div className="card p-5">
      <p className="stat-label">{label}</p>
      <p className={`stat-value mt-1 ${accent || ''}`}>{value}</p>
      {sub && <p className="text-xs text-navy-500 mt-1">{sub}</p>}
    </div>
  )
}

export function LevelBadge({ level }: { level: DemandLevel | string }) {
  const cls = LEVEL_BG[level as DemandLevel] ||
    'bg-navy-50 text-navy-700 border-navy-200'
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium border rounded ${cls}`}>
      {level}
    </span>
  )
}

export function HDIIndicator({ score, level, size = 'md' }: {
  score: number; level: DemandLevel | string; size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = { sm: 'w-12 h-12 text-sm', md: 'w-16 h-16 text-lg', lg: 'w-24 h-24 text-2xl' }
  const color = LEVEL_COLORS[level as DemandLevel] || '#627d98'
  return (
    <div className="flex flex-col items-center">
      <div
        className={`${sizes[size]} rounded-full border-4 flex items-center justify-center font-semibold relative`}
        style={{ borderColor: color, color }}
      >
        {score}
      </div>
      <p className="text-xs text-navy-500 mt-1">HDI / 100</p>
    </div>
  )
}

export function Section({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <section className="mb-8">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
          {subtitle && <p className="text-sm text-navy-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function EvidenceList({ items }: { items: string[] }) {
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} className="evidence-row">
          <span className="text-accent mt-0.5">✓</span>
          <span className="text-navy-700">{it}</span>
        </div>
      ))}
    </div>
  )
}

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="px-5 py-3 border-b border-navy-200">
        <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function formatAffected(n: number) { return formatNumber(n) }
