import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../utils/api'
import { HDIResponse } from '../types'
import { LevelBadge, HDIIndicator, EvidenceList, Panel, Section, StatCard } from '../components/Dashboard'
import { categoryLabel, CATEGORY_ICONS, LEVEL_COLORS, formatNumber } from '../utils/format'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'

const CAT_LIST = [
  'healthcare', 'education', 'roads', 'water', 'electricity',
  'internet', 'public_transport', 'sanitation', 'public_safety',
  'agriculture', 'emergency_services',
]

export function RegionDetail() {
  const { regionId } = useParams<{ regionId: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!regionId) return
    api.getRegion(regionId).then(d => { setData(d); setLoading(false) })
  }, [regionId])

  if (loading) return <div className="p-12 text-center text-navy-500">Loading region…</div>
  if (!data) return <div className="p-12 text-center text-navy-500">Region not found</div>

  const region = data.region
  const hdis: HDIResponse[] = data.hdi_by_category
  const radarData = hdis.map((h) => ({
    category: categoryLabel(h.category).split(' ')[0],
    score: h.score,
  }))
  const worst = [...hdis].sort((a, b) => b.score - a.score)[0]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <Link to="/demand" className="text-xs text-accent hover:underline">← Back to map</Link>
          <h1 className="text-xl font-semibold text-navy-900 mt-1">{region.name}</h1>
          <p className="text-sm text-navy-500">
            {region.region_type} · {region.country} · Pop. {region.population.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-navy-500">Coordinates</p>
          <p className="text-sm font-medium text-navy-700">
            {region.lat.toFixed(3)}°, {region.lng.toFixed(3)}°
          </p>
        </div>
      </div>

      <Section title="Region Demographics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Population" value={formatNumber(region.population)} />
          <StatCard label="Population Growth" value={region.population_growth_pct + '%'} />
          <StatCard label="Elderly Share" value={(region.elderly_pct * 100).toFixed(1) + '%'} />
          <StatCard label="Poverty Index" value={region.poverty_index.toFixed(2)} />
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Panel title="HDI Profile Across Categories">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#d9e2ec" />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: '#486581' }} />
              <Radar dataKey="score" stroke="#0066CC" fill="#0066CC" fillOpacity={0.3} />
              <Tooltip formatter={(v: any) => `HDI ${v}`} />
            </RadarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Critical Insight">
          <div className="flex items-center gap-5">
            <HDIIndicator score={worst.score} level={worst.level} size="lg" />
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">
                Highest Hidden Demand
              </p>
              <p className="text-base font-semibold text-navy-900 mt-1">
                {CATEGORY_ICONS[worst.category]} {categoryLabel(worst.category)}
              </p>
              <LevelBadge level={worst.level} />
              <p className="text-sm text-navy-700 mt-3">{worst.recommendation}</p>
            </div>
          </div>
        </Panel>
      </div>

      <Section title="HDI by Infrastructure Category">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hdis
            .sort((a, b) => b.score - a.score)
            .map((h: any) => (
            <div key={h.category} className="card p-4 border-l-4"
              style={{ borderLeftColor: LEVEL_COLORS[h.level as keyof typeof LEVEL_COLORS] }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CATEGORY_ICONS[h.category]}</span>
                  <p className="text-sm font-semibold text-navy-900">{categoryLabel(h.category)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: LEVEL_COLORS[h.level as keyof typeof LEVEL_COLORS] }}>
                    {h.score}
                  </p>
                  <LevelBadge level={h.level} />
                </div>
              </div>
              <div className="flex gap-4 text-xs text-navy-500 mt-2">
                <span>Reported: <strong>{h.reported_demand_count}</strong></span>
                <span>Affected: <strong>{formatNumber(h.estimated_affected_population)}</strong></span>
                <span>Confidence: <strong>{(h.confidence * 100).toFixed(0)}%</strong></span>
              </div>
              <p className="text-xs text-navy-700 mt-2 italic">{h.recommendation}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
