import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import { BRICSComparison } from '../types'
import { Section, Panel, StatCard } from '../components/Dashboard'
import { categoryLabel, CATEGORY_ICONS } from '../utils/format'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const COUNTRY_FLAGS: Record<string, string> = {
  India: '🇮🇳', Brazil: '🇧🇷', Russia: '🇷🇺',
  China: '🇨🇳', 'South Africa': '🇿🇦',
}

const ALL_CATS = [
  'healthcare', 'education', 'roads', 'water', 'electricity',
  'internet', 'public_transport', 'sanitation', 'public_safety',
  'agriculture', 'emergency_services',
]

export function BRICSIntelligence() {
  const [data, setData] = useState<BRICSComparison[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getBRICS().then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="p-12 text-center text-navy-500">Loading BRICS data…</div>

  const radarData = ALL_CATS.map(cat => {
    const row: Record<string, any> = { category: categoryLabel(cat) }
    data.forEach(d => { row[d.country] = d.category_scores[cat] ?? 50 })
    return row
  })

  const avgHdiData = data.map(d => ({
    country: d.country,
    flag: COUNTRY_FLAGS[d.country] || '🏳️',
    avg_hdi: d.avg_hdi,
  }))

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-navy-900">BRICS Infrastructure Intelligence</h1>
        <p className="text-sm text-navy-600">
          Cross-country comparison of infrastructure challenges across BRICS nations.
          Similar demographic conditions may enable policy transfer insights.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {data.map(d => (
          <div key={d.country} className="card p-4 text-center">
            <div className="text-3xl mb-1">{COUNTRY_FLAGS[d.country] || '🏳️'}</div>
            <p className="text-sm font-semibold text-navy-900">{d.country}</p>
            <p className="text-2xl font-bold text-navy-900 mt-1">{d.avg_hdi}</p>
            <p className="text-xs text-navy-500">Avg HDI</p>
            <p className="text-xs text-navy-500 mt-1">{d.infrastructure_indicators.region_count} regions</p>
          </div>
        ))}
      </div>

      <Section title="Average HDI by Country">
        <div className="card p-5">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={avgHdiData}>
              <XAxis dataKey="country" tick={{ fontSize: 12, fill: '#486581' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#486581' }} />
              <Tooltip formatter={(v: any) => `HDI ${v}`} />
              <Bar dataKey="avg_hdi" radius={[4, 4, 0, 0]}>
                {avgHdiData.map((d, i) => (
                  <rect key={i} fill={d.avg_hdi >= 70 ? '#DC2626' : d.avg_hdi >= 50 ? '#CA8A04' : '#16A34A'}
                    width={20} height={100} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="Category Scores Across BRICS Nations">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-navy-700">Category</th>
                {data.map(d => (
                  <th key={d.country} className="px-4 py-2.5 text-right font-medium text-navy-700">
                    {COUNTRY_FLAGS[d.country]} {d.country}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_CATS.map(cat => (
                <tr key={cat} className="border-t border-navy-100">
                  <td className="px-4 py-2">
                    {CATEGORY_ICONS[cat]} {categoryLabel(cat)}
                  </td>
                  {data.map(d => {
                    const score = d.category_scores[cat] ?? 50
                    return (
                      <td key={d.country} className="px-4 py-2 text-right">
                        <span className={`font-semibold ${
                          score >= 70 ? 'text-red-600' : score >= 50 ? 'text-amber-600' : 'text-green-600'
                        }`}>{score}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Common Challenges & Policy Transfer Opportunities">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(d => (
            <div key={d.country} className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{COUNTRY_FLAGS[d.country] || '🏳️'}</span>
                <h3 className="text-sm font-semibold text-navy-900">{d.country}</h3>
              </div>
              {d.common_challenges.length > 0 ? (
                <ul className="space-y-1.5">
                  {d.common_challenges.map((c, i) => (
                    <li key={i} className="text-xs text-navy-700 flex items-start gap-1.5">
                      <span className="text-red-500 mt-0.5">⚠</span>
                      {c}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-navy-500">No critical common challenges identified</p>
              )}
              <div className="mt-3 pt-3 border-t border-navy-100">
                <p className="text-xs text-navy-500">Comparable regions:</p>
                <p className="text-xs text-navy-700">{d.comparable_regions.join(', ')}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
