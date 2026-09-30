import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import { RegionSummary, HDIResponse } from '../types'
import { LevelBadge, EvidenceList } from '../components/Dashboard'
import { LEVEL_COLORS, LEVEL_BG, categoryLabel, CATEGORY_ICONS } from '../utils/format'

const CAT_LIST = [
  'healthcare', 'education', 'roads', 'water', 'electricity',
  'internet', 'public_transport', 'sanitation', 'public_safety',
  'agriculture', 'emergency_services',
]

export function DemandMap() {
  const [regions, setRegions] = useState<RegionSummary[]>([])
  const [selectedRegion, setSelected] = useState<RegionSummary | null>(null)
  const [selectedCat, setCat] = useState('healthcare')
  const [hdi, setHdi] = useState<HDIResponse | null>(null)
  const [allHdis, setAllHdis] = useState<Record<string, Record<string, number>>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getRegions().then(rs => {
      setRegions(rs)
      // Pre-load all HDI scores
      const promises = rs.flatMap(r =>
        CAT_LIST.map(cat =>
          api.getHDI(r.id, cat).then(h => ({ r, cat, score: h.score, level: h.level }))
        )
      )
      Promise.all(promises).then(results => {
        const map: Record<string, Record<string, number>> = {}
        results.forEach(({ r, cat, score }) => {
          if (!map[r.id]) map[r.id] = {}
          map[r.id][cat] = score
        })
        setAllHdis(map)
        setLoading(false)
      })
    })
  }, [])

  useEffect(() => {
    if (selectedRegion) {
      api.getHDI(selectedRegion.id, selectedCat).then(setHdi)
    } else {
      setHdi(null)
    }
  }, [selectedRegion, selectedCat])

  const getScore = (r: RegionSummary, cat: string) =>
    allHdis[r.id]?.[cat] ?? null

  const sorted = [...regions].sort((a, b) => {
    const sa = getScore(a, selectedCat) ?? 0
    const sb = getScore(b, selectedCat) ?? 0
    return sb - sa
  })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-navy-900">Hidden Demand Intelligence Map</h1>
        <p className="text-sm text-navy-600">
          Regions ranked by Hidden Demand Index. Click any region for detailed analysis.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {CAT_LIST.map(cat => (
          <button key={cat} onClick={() => setCat(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              selectedCat === cat
                ? 'bg-navy-900 text-white border-navy-900'
                : 'bg-white text-navy-700 border-navy-300 hover:border-accent'
            }`}>
            {CATEGORY_ICONS[cat]} {categoryLabel(cat)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Region list */}
        <div className="lg:col-span-1 card overflow-hidden max-h-[72vh] overflow-y-auto scrollbar-thin">
          <div className="px-4 py-2.5 border-b border-navy-200 bg-navy-50">
            <p className="text-xs font-semibold text-navy-700 uppercase tracking-wide">
              {categoryLabel(selectedCat)} · Regions by HDI
            </p>
          </div>
          {loading ? (
            <div className="p-4 text-sm text-navy-500">Loading scores…</div>
          ) : (
            sorted.map((r, idx) => {
              const score = getScore(r, selectedCat)
              const color = score != null
                ? (score >= 86 ? LEVEL_COLORS.Critical
                   : score >= 71 ? LEVEL_COLORS.High
                   : score >= 51 ? LEVEL_COLORS.Moderate
                   : score >= 31 ? LEVEL_COLORS.Emerging
                   : LEVEL_COLORS.Low) : '#9fb3c8'
              return (
                <div key={r.id}
                  onClick={() => setSelected(r)}
                  className={`px-4 py-3 border-b border-navy-100 cursor-pointer hover:bg-navy-50 transition-colors ${
                    selectedRegion?.id === r.id ? 'bg-accent-light' : ''
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-navy-400 w-4">{idx + 1}</span>
                      <span className="text-sm font-medium text-navy-900">{r.name}</span>
                    </div>
                    {score != null && (
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-navy-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${score}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-xs font-semibold w-6 text-right" style={{ color }}>
                          {score}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs text-navy-500">
                    <span>{r.country}</span>
                    <span>·</span>
                    <span>Pop. {r.population.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selectedRegion && hdi ? (
            <div className="card">
              <div className="px-5 py-4 border-b border-navy-200 bg-navy-50 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-navy-900">{hdi.region_name}</h2>
                  <p className="text-xs text-navy-500">{CATEGORY_ICONS[selectedCat]} {categoryLabel(selectedCat)}</p>
                </div>
                <LevelBadge level={hdi.level} />
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="text-center">
                    <p className="stat-label">HDI Score</p>
                    <p className="text-3xl font-bold" style={{ color: LEVEL_COLORS[hdi.level as keyof typeof LEVEL_COLORS] }}>
                      {hdi.score}
                    </p>
                    <p className="text-xs text-navy-500">/ 100</p>
                  </div>
                  <div className="text-center">
                    <p className="stat-label">Reported Demand</p>
                    <p className="text-3xl font-bold text-navy-700">{hdi.reported_demand_count}</p>
                    <p className="text-xs text-navy-500">complaints</p>
                  </div>
                  <div className="text-center">
                    <p className="stat-label">Affected Pop.</p>
                    <p className="text-3xl font-bold text-navy-700">
                      {(hdi.estimated_affected_population / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-navy-500">people</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-navy-50 rounded p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 mb-2">
                      Reported Demand
                    </p>
                    <p className="text-xl font-bold text-navy-700">
                      {hdi.reported_demand_count <= 25 ? 'LOW' : hdi.reported_demand_count <= 100 ? 'MODERATE' : 'HIGH'}
                    </p>
                  </div>
                  <div className="rounded p-4 border-2" style={{ borderColor: LEVEL_COLORS[hdi.level as keyof typeof LEVEL_COLORS] }}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 mb-2">
                      Hidden Demand
                    </p>
                    <p className="text-xl font-bold" style={{ color: LEVEL_COLORS[hdi.level as keyof typeof LEVEL_COLORS] }}>
                      {hdi.level.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 mb-2">
                    AI Recommendation
                  </p>
                  <p className="text-sm font-medium text-navy-900 bg-amber-50 rounded p-3 border border-amber-200">
                    {hdi.recommendation}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 mb-2">
                    Evidence ({hdi.top_factors.length} factors)
                  </p>
                  <EvidenceList items={hdi.top_factors} />
                </div>

                {/* Breakdown table */}
                {hdi.breakdowns && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 mb-2">
                      Signal Breakdown
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-navy-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-navy-700">Signal</th>
                            <th className="px-3 py-2 text-right font-medium text-navy-700">Value</th>
                            <th className="px-3 py-2 text-right font-medium text-navy-700">Norm.</th>
                            <th className="px-3 py-2 text-right font-medium text-navy-700">Contrib.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hdi.breakdowns
                            .sort((a, b) => b.contribution - a.contribution)
                            .map(b => (
                            <tr key={b.key} className="border-t border-navy-100">
                              <td className="px-3 py-1.5 text-navy-700">{b.label}</td>
                              <td className="px-3 py-1.5 text-right text-navy-600">{b.evidence}</td>
                              <td className="px-3 py-1.5 text-right">
                                <div className="inline-block w-12 bg-navy-100 rounded overflow-hidden">
                                  <div className="h-1 bg-accent" style={{ width: `${(b.normalized * 100).toFixed(0)}%` }} />
                                </div>
                              </td>
                              <td className="px-3 py-1.5 text-right font-medium text-navy-900">
                                {b.contribution.toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-2 text-xs text-navy-500">
                  <span>AI Confidence: {(hdi.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center text-navy-500">
              <div className="text-4xl mb-3">🗺️</div>
              <p className="text-sm">Select a region from the list to view its Hidden Demand Index</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
