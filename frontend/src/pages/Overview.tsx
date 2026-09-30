import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import { RegionSummary, HDIResponse } from '../types'
import { Section, StatCard, LevelBadge, HDIIndicator, Panel, EvidenceList } from '../components/Dashboard'
import { LEVEL_COLORS, categoryLabel, CATEGORY_ICONS } from '../utils/format'

export function Overview() {
  const [regions, setRegions] = useState<RegionSummary[]>([])
  const [killer, setKiller] = useState<{ region: RegionSummary; hdi: HDIResponse } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getRegions().then(async rs => {
      setRegions(rs)
      // Find the killer-demo region: highest worst_score that is rural/remote
      const rural = rs
        .filter(r => r.worst_level === 'Critical' || r.worst_level === 'High')
        .sort((a, b) => b.worst_score - a.worst_score)[0]
      if (rural) {
        try {
          const hdi = await api.getHDI(rural.id, rural.worst_category)
          setKiller({ region: rural, hdi })
        } catch {}
      }
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-12 text-center text-navy-500">Loading intelligence…</div>

  const total = regions.length
  const critical = regions.filter(r => r.critical_count >= 3).length
  const totalPop = regions.reduce((s, r) => s + r.population, 0)
  const allCritical = regions.flatMap(r =>
    r.critical_count > 0 ? [r] : []
  )

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-1">
          Digital Public Infrastructure · Governance
        </p>
        <h1 className="text-2xl font-semibold text-navy-900">
          Don't count complaints. Discover unmet needs.
        </h1>
        <p className="text-sm text-navy-600 mt-1 max-w-3xl">
          JanAwaaz combines multilingual citizen signals with infrastructure, demographic,
          and investment data to surface hidden demand that traditional complaint
          systems miss.
        </p>
      </div>

      <Section title="National Intelligence Overview" subtitle="Across monitored regions">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Monitored Regions" value={total} sub="Districts & zones" />
          <StatCard label="Critical Hotspots" value={critical} sub="≥3 critical categories"
            accent="text-red-600" />
          <StatCard label="Total Population" value={(totalPop / 1_000_000).toFixed(1) + 'M'}
            sub="Under monitoring" />
          <StatCard label="Active BRICS Regions" value="5" sub="IN, BR, RU, CN, ZA" />
        </div>
      </Section>

      {killer && (
        <Section
          title="🔍 Killer Demo: Hidden Demand Discovery"
          subtitle={`Region with low reported complaints but critical unmet need`}
        >
          <div className="card p-6 border-l-4" style={{ borderLeftColor: LEVEL_COLORS.Critical }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center justify-center border-r border-navy-200 pr-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 mb-2">
                  {killer.hdi.category} HDI
                </p>
                <HDIIndicator score={killer.hdi.score} level={killer.hdi.level} size="lg" />
                <p className="text-sm text-navy-600 mt-2 text-center">
                  Reported complaints: <strong>{killer.hdi.reported_demand_count}</strong>
                </p>
              </div>
              <div className="md:col-span-2">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-navy-900">
                      {killer.hdi.region_name}
                    </h3>
                    <p className="text-xs text-navy-500">
                      {CATEGORY_ICONS[killer.hdi.category]} {categoryLabel(killer.hdi.category)} ·
                      Pop. {killer.region.population.toLocaleString('en-IN')} ·
                      {killer.region.region_type}
                    </p>
                  </div>
                  <LevelBadge level={killer.hdi.level} />
                </div>
                <p className="text-sm text-navy-700 whitespace-pre-line mb-3">
                  {killer.hdi.summary}
                </p>
                <div className="bg-navy-50 rounded p-3 mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 mb-1">
                    AI Recommendation
                  </p>
                  <p className="text-sm font-medium text-navy-900">
                    {killer.hdi.recommendation}
                  </p>
                </div>
                <EvidenceList items={killer.hdi.top_factors} />
                <div className="mt-4 flex gap-3 text-xs text-navy-600">
                  <span><strong>Affected:</strong> {killer.hdi.estimated_affected_population.toLocaleString('en-IN')}</span>
                  <span><strong>Confidence:</strong> {(killer.hdi.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link to="/demand" className="btn-primary text-sm">View on Map</Link>
                  <Link to="/interventions" className="btn-secondary text-sm">Simulate Intervention</Link>
                </div>
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section title="Regions Ranked by Hidden Demand">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium text-navy-700">Region</th>
                <th className="px-4 py-2.5 font-medium text-navy-700">Country</th>
                <th className="px-4 py-2.5 font-medium text-navy-700">Type</th>
                <th className="px-4 py-2.5 font-medium text-navy-700">Population</th>
                <th className="px-4 py-2.5 font-medium text-navy-700">Worst Category</th>
                <th className="px-4 py-2.5 font-medium text-navy-700 text-right">HDI</th>
                <th className="px-4 py-2.5 font-medium text-navy-700">Level</th>
              </tr>
            </thead>
            <tbody>
              {regions.sort((a, b) => b.worst_score - a.worst_score).map(r => (
                <tr key={r.id} className="border-t border-navy-200 hover:bg-navy-50">
                  <td className="px-4 py-2.5 font-medium text-navy-900">
                    <Link to={`/regions/${r.id}`} className="hover:text-accent">{r.name}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-navy-600">{r.country}</td>
                  <td className="px-4 py-2.5 text-navy-600 text-xs">{r.region_type}</td>
                  <td className="px-4 py-2.5 text-navy-600">{r.population.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5 text-navy-700">
                    {CATEGORY_ICONS[r.worst_category]} {categoryLabel(r.worst_category)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="font-semibold" style={{ color: LEVEL_COLORS[r.worst_level] }}>
                      {r.worst_score}
                    </span>
                  </td>
                  <td className="px-4 py-2.5"><LevelBadge level={r.worst_level} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
