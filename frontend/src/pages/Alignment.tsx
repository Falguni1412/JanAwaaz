import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import { AlignmentResult } from '../types'
import { Section, LevelBadge } from '../components/Dashboard'
import { categoryLabel, CATEGORY_ICONS } from '../utils/format'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string; desc: string }> = {
  blind_spot:  { label: 'Blind Spot',    color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: '🔴', desc: 'High demand, low planned investment' },
  aligned:     { label: 'Aligned',       color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  icon: '🟢', desc: 'Investment matches demonstrated demand' },
  emerging:    { label: 'Emerging',      color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', icon: '🟡', desc: 'Rapidly growing demand not yet planned' },
  oversupply:  { label: 'Oversupply',    color: 'text-navy-700',   bg: 'bg-navy-50',   border: 'border-navy-200',  icon: '🔵', desc: 'High investment, low demonstrated need' },
}

export function Alignment() {
  const [alignments, setAlignments] = useState<AlignmentResult[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.getAlignment().then(a => { setAlignments(a); setLoading(false) }) }, [])

  const filtered = filter === 'all' ? alignments : alignments.filter(a => a.investment_status === filter)
  const blindSpots = alignments.filter(a => a.investment_status === 'blind_spot')

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-navy-900">Government Investment Alignment</h1>
        <p className="text-sm text-navy-600">
          Compare citizen/hidden demand against planned government investment.
          Detect blind spots, oversupply, and emerging needs.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([k, cfg]) => {
          const count = alignments.filter(a => a.investment_status === k).length
          return (
            <button key={k} onClick={() => setFilter(filter === k ? 'all' : k)}
              className={`card p-4 text-left border-2 transition-colors ${
                filter === k ? `${cfg.bg} border-current ${cfg.color}` : 'hover:border-accent'
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <span>{cfg.icon}</span>
                <span className="text-sm font-semibold">{cfg.label}</span>
              </div>
              <p className="text-xs opacity-75">{count} cases</p>
            </button>
          )
        })}
      </div>

      {blindSpots.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">
            ⚠ Critical Blind Spots — {blindSpots.length} high-demand gaps with low planned investment
          </p>
          <div className="flex flex-wrap gap-2">
            {blindSpots.slice(0, 5).map(a => (
              <span key={`${a.region_id}-${a.category}`}
                className="text-xs px-2 py-1 bg-white border border-red-200 rounded text-red-700">
                {a.region_name} · {categoryLabel(a.category)} · HDI {a.hdi_score}
              </span>
            ))}
          </div>
        </div>
      )}

      <Section title={`${filter === 'all' ? 'All' : STATUS_CONFIG[filter].label} Cases`}>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium text-navy-700">Region</th>
                <th className="px-4 py-2.5 font-medium text-navy-700">Category</th>
                <th className="px-4 py-2.5 font-medium text-navy-700 text-right">HDI</th>
                <th className="px-4 py-2.5 font-medium text-navy-700">Demand Level</th>
                <th className="px-4 py-2.5 font-medium text-navy-700 text-right">Investment</th>
                <th className="px-4 py-2.5 font-medium text-navy-700">Status</th>
                <th className="px-4 py-2.5 font-medium text-navy-700">Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.sort((a, b) => {
                const priority = { blind_spot: 0, emerging: 1, oversupply: 2, aligned: 3 }
                return (priority[a.investment_status] ?? 9) - (priority[b.investment_status] ?? 9)
              }).map(row => {
                const cfg = STATUS_CONFIG[row.investment_status]
                return (
                  <tr key={`${row.region_id}-${row.category}`}
                    className="border-t border-navy-200 hover:bg-navy-50">
                    <td className="px-4 py-2.5 font-medium text-navy-900">{row.region_name}</td>
                    <td className="px-4 py-2.5 text-navy-700">
                      {CATEGORY_ICONS[row.category]} {categoryLabel(row.category)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-navy-900">{row.hdi_score}</td>
                    <td className="px-4 py-2.5"><LevelBadge level={row.hdi_level} /></td>
                    <td className="px-4 py-2.5 text-right text-navy-700">
                      ₹{row.planned_investment_crore.toFixed(1)} Cr
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-navy-500">{cfg.desc}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
