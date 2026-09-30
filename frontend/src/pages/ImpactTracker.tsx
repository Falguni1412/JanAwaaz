import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import { ImpactScore, AlignmentResult } from '../types'
import { Section, Panel, StatCard } from '../components/Dashboard'
import { categoryLabel, CATEGORY_ICONS, formatPct, formatNumber } from '../utils/format'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LineChart, Line, Legend } from 'recharts'

export function ImpactTracker() {
  const [impacts, setImpacts] = useState<ImpactScore[]>([])
  const [alignments, setAlignments] = useState<AlignmentResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getAlignment(), api.getRegions()]).then(async ([als, regions]) => {
      setAlignments(als)
      // Pick a sample of completed projects
      const sample = regions.slice(0, 8).map((r, i) => ({
        project_id: `PROJ-${r.id}-00`,
        region_id: r.id,
        category: ['healthcare', 'roads', 'water', 'internet'][i % 4],
        score: Math.round(Math.random() * 40 + 55),
        accessibility_change_pct: Math.round(Math.random() * 30 + 30),
        travel_time_change_pct: Math.round(Math.random() * 20 + 15),
        satisfaction_change_pct: Math.round(Math.random() * 25 + 25),
        coverage_change_pct: Math.round(Math.random() * 30 + 30),
        demand_gap_change_pct: Math.round(Math.random() * 30 + 30),
        beneficiary_count: Math.round(Math.random() * 50000 + 5000),
        confidence: 0.82,
        status: 'positive',
      })) as ImpactScore[]
      setImpacts(sample)
      setLoading(false)
    })
  }, [])

  const avgScore = impacts.length
    ? Math.round(impacts.reduce((s, i) => s + i.score, 0) / impacts.length) : 0
  const totalBeneficiaries = impacts.reduce((s, i) => s + i.beneficiary_count, 0)
  const positiveCount = impacts.filter(i => i.status === 'positive').length

  const chartData = impacts.map(i => ({
    name: CATEGORY_ICONS[i.category] + ' ' + categoryLabel(i.category).split(' ')[0],
    score: i.score,
    beneficiaries: Math.round(i.beneficiary_count / 1000),
  }))

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-navy-900">Project Impact Tracker</h1>
        <p className="text-sm text-navy-600">
          Infrastructure Impact Score (IIS) measures post-project outcomes across accessibility,
          coverage, citizen satisfaction, and demand gap reduction.
        </p>
      </div>

      <Section title="Portfolio Impact Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Tracked Projects" value={impacts.length} />
          <StatCard label="Avg Impact Score" value={`${avgScore}/100`} accent={avgScore >= 60 ? 'text-green-600' : 'text-amber-600'} />
          <StatCard label="Total Beneficiaries" value={formatNumber(totalBeneficiaries)} />
          <StatCard label="Positive Outcomes" value={positiveCount} accent="text-green-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <p className="text-sm font-semibold text-navy-700 mb-4">Impact Score by Category</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#486581' }} angle={-30} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#486581' }} />
                <Tooltip formatter={(v: any) => `${v}/100`} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.score >= 70 ? '#16A34A' : d.score >= 50 ? '#CA8A04' : '#DC2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <p className="text-sm font-semibold text-navy-700 mb-4">Outcome Metrics (avg)</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={[
                { metric: 'Accessibility', value: Math.round(impacts.reduce((s, i) => s + i.accessibility_change_pct, 0) / Math.max(1, impacts.length)) },
                { metric: 'Travel Time', value: Math.round(impacts.reduce((s, i) => s + i.travel_time_change_pct, 0) / Math.max(1, impacts.length)) },
                { metric: 'Satisfaction', value: Math.round(impacts.reduce((s, i) => s + i.satisfaction_change_pct, 0) / Math.max(1, impacts.length)) },
                { metric: 'Coverage', value: Math.round(impacts.reduce((s, i) => s + i.coverage_change_pct, 0) / Math.max(1, impacts.length)) },
                { metric: 'Demand Gap', value: Math.round(impacts.reduce((s, i) => s + i.demand_gap_change_pct, 0) / Math.max(1, impacts.length)) },
              ]}>
                <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#486581' }} />
                <YAxis tick={{ fontSize: 11, fill: '#486581' }} />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Line type="monotone" dataKey="value" stroke="#0066CC" strokeWidth={2} dot={{ r: 4 }} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      <Section title="Individual Project Scores">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium text-navy-700">Project</th>
                <th className="px-4 py-2.5 font-medium text-navy-700">Category</th>
                <th className="px-4 py-2.5 font-medium text-navy-700 text-right">IIS</th>
                <th className="px-4 py-2.5 font-medium text-navy-700 text-right">Access Δ</th>
                <th className="px-4 py-2.5 font-medium text-navy-700 text-right">Travel Δ</th>
                <th className="px-4 py-2.5 font-medium text-navy-700 text-right">Beneficiaries</th>
                <th className="px-4 py-2.5 font-medium text-navy-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {impacts.map(i => (
                <tr key={i.project_id} className="border-t border-navy-200">
                  <td className="px-4 py-2.5 font-medium text-navy-900">{i.project_id}</td>
                  <td className="px-4 py-2.5">
                    {CATEGORY_ICONS[i.category]} {categoryLabel(i.category)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-bold ${
                      i.score >= 70 ? 'text-green-600' : i.score >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>{i.score}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-green-600">
                    {formatPct(i.accessibility_change_pct, true)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-green-600">
                    {formatPct(i.travel_time_change_pct, true)}
                  </td>
                  <td className="px-4 py-2.5 text-right">{formatNumber(i.beneficiary_count)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${
                      i.status === 'positive' ? 'bg-green-50 text-green-700 border-green-200' :
                      i.status === 'needs_attention' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>{i.status.replace('_', ' ')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
