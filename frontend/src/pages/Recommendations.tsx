import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import { HDIResponse, RegionSummary } from '../types'
import { Section, LevelBadge, HDIIndicator, EvidenceList } from '../components/Dashboard'
import { categoryLabel, CATEGORY_ICONS } from '../utils/format'

const CAT_LIST = [
  'healthcare', 'education', 'roads', 'water', 'electricity',
  'internet', 'public_transport', 'sanitation', 'public_safety',
  'agriculture', 'emergency_services',
]

interface Rec {
  region: RegionSummary
  hdi: HDIResponse
  rank: number
}

export function Recommendations() {
  const [recs, setRecs] = useState<Rec[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.getRegions().then(async rs => {
      // For each region, pick the worst HDI
      const promises = rs.map(async r => {
        const scores: Record<string, HDIResponse> = {}
        for (const cat of CAT_LIST) {
          try {
            const h = await api.getHDI(r.id, cat)
            scores[cat] = h
          } catch {}
        }
        const worst = Object.values(scores).sort((a, b) => b.score - a.score)[0]
        return { region: r, hdi: worst }
      })
      const results = (await Promise.all(promises))
        .filter(r => r.hdi && r.hdi.score >= 50)
        .sort((a, b) => {
          // Rank by HDI score, weighted by affected population
          const aScore = a.hdi.score * Math.log10(a.region.population)
          const bScore = b.hdi.score * Math.log10(b.region.population)
          return bScore - aScore
        })
        .map((r, i) => ({ ...r, rank: i + 1 }))
      setRecs(results)
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all'
    ? recs
    : recs.filter(r => r.hdi.category === filter)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-navy-900">AI Project Recommendations</h1>
        <p className="text-sm text-navy-600">
          Ranked infrastructure interventions, weighted by Hidden Demand severity and
          affected population. Each recommendation includes evidence and expected impact.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border ${
            filter === 'all' ? 'bg-navy-900 text-white border-navy-900' :
            'bg-white text-navy-700 border-navy-300 hover:border-accent'
          }`}>
          All Categories
        </button>
        {CAT_LIST.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border ${
              filter === cat ? 'bg-navy-900 text-white border-navy-900' :
              'bg-white text-navy-700 border-navy-300 hover:border-accent'
            }`}>
            {CATEGORY_ICONS[cat]} {categoryLabel(cat)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-navy-500">Generating recommendations…</div>
      ) : (
        <div className="space-y-4">
          {filtered.slice(0, 12).map(rec => (
            <div key={`${rec.region.id}-${rec.hdi.category}`}
              className="card p-5 hover:shadow-md transition-shadow">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-1 text-center">
                  <p className="text-3xl font-bold text-navy-300">#{rec.rank}</p>
                </div>
                <div className="md:col-span-2 flex flex-col items-center">
                  <HDIIndicator score={rec.hdi.score} level={rec.hdi.level} size="sm" />
                </div>
                <div className="md:col-span-9">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-base font-semibold text-navy-900">
                        {CATEGORY_ICONS[rec.hdi.category]} {categoryLabel(rec.hdi.category)} · {rec.region.name}
                      </h3>
                      <p className="text-xs text-navy-500">
                        {rec.region.country} · Pop. {rec.region.population.toLocaleString('en-IN')} · {rec.region.region_type}
                      </p>
                    </div>
                    <LevelBadge level={rec.hdi.level} />
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
                      Recommended Intervention
                    </p>
                    <p className="text-sm font-medium text-navy-900">
                      {rec.hdi.recommendation}
                    </p>
                  </div>
                  <EvidenceList items={rec.hdi.top_factors.slice(0, 4)} />
                  <div className="mt-3 flex gap-4 text-xs text-navy-600">
                    <span>👥 Affected: <strong>{rec.hdi.estimated_affected_population.toLocaleString('en-IN')}</strong></span>
                    <span>📊 Reported: <strong>{rec.hdi.reported_demand_count}</strong></span>
                    <span>🎯 Confidence: <strong>{(rec.hdi.confidence * 100).toFixed(0)}%</strong></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
