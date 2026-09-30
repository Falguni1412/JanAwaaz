import { useState } from 'react'
import { api } from '../utils/api'
import { BudgetSimulationResponse } from '../types'
import { Section, Panel, StatCard } from '../components/Dashboard'
import { CATEGORY_ICONS, categoryLabel, formatCrore, formatNumber, formatPct } from '../utils/format'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'

export function BudgetSimulator() {
  const [budget, setBudget] = useState(50)
  const [result, setResult] = useState<BudgetSimulationResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const run = async (b: number) => {
    setLoading(true)
    setBudget(b)
    try {
      const r = await api.simulateBudget(b)
      setResult(r)
    } finally {
      setLoading(false)
    }
  }

  const chartData = result?.allocations.map(a => ({
    name: categoryLabel(a.category),
    icon: CATEGORY_ICONS[a.category],
    value: a.amount_crore,
    impact: a.expected_impact_pct,
  })) || []

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-navy-900">Budget Optimisation Simulator</h1>
        <p className="text-sm text-navy-600">
          Enter a budget. The AI generates an optimised investment portfolio based on
          Hidden Demand scores, expected impact, and equity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Panel title="Available Budget">
            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-navy-900">{formatCrore(budget)}</p>
              <p className="text-xs text-navy-500 mt-1">Indian National Rupees</p>
            </div>
            <input type="range" min={5} max={500} step={5} value={budget}
              onChange={e => setBudget(parseInt(e.target.value))}
              className="w-full accent-accent" />
            <div className="flex justify-between text-xs text-navy-500 mt-1">
              <span>₹5 Cr</span><span>₹500 Cr</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[10, 20, 50, 100, 200, 500].map(b => (
                <button key={b} onClick={() => run(b)}
                  className={`py-1.5 text-xs border rounded transition-colors ${
                    budget === b ? 'bg-navy-900 text-white border-navy-900' :
                    'bg-white border-navy-300 hover:border-accent'
                  }`}>
                  ₹{b} Cr
                </button>
              ))}
            </div>
            <button onClick={() => run(budget)} disabled={loading}
              className="btn-primary w-full mt-4">
              {loading ? 'Optimising…' : 'Generate Portfolio'}
            </button>
          </Panel>

          {result && (
            <div className="mt-4">
              <StatCard label="Total Beneficiaries" value={formatNumber(result.estimated_total_beneficiaries)}
                sub="Across all categories" />
              <div className="mt-3">
                <StatCard label="Coverage Increase"
                  value={formatPct(result.expected_coverage_increase_pct)}
                  sub="Population coverage" />
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {result ? (
            <>
              <Section title="Recommended Allocation" subtitle="Optimised by Hidden Demand Index">
                <div className="card p-5">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 60, left: 20 }}>
                      <XAxis dataKey="name" angle={-30} textAnchor="end" height={70}
                        tick={{ fontSize: 11, fill: '#486581' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#486581' }}
                        label={{ value: '₹ Crore', angle: -90, position: 'insideLeft',
                          style: { fontSize: 11, fill: '#486581' } }} />
                      <Tooltip formatter={(v: any) => `₹${v.toFixed(1)} Cr`} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((d, i) => (
                          <Cell key={i} fill="#0066CC" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Section>

              <Section title="Portfolio Detail">
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-navy-50 text-left">
                      <tr>
                        <th className="px-4 py-2.5 font-medium text-navy-700">Category</th>
                        <th className="px-4 py-2.5 font-medium text-navy-700 text-right">Allocation</th>
                        <th className="px-4 py-2.5 font-medium text-navy-700 text-right">Beneficiaries</th>
                        <th className="px-4 py-2.5 font-medium text-navy-700 text-right">Impact</th>
                        <th className="px-4 py-2.5 font-medium text-navy-700 text-right">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.allocations.map(a => (
                        <tr key={a.category} className="border-t border-navy-200">
                          <td className="px-4 py-2.5">
                            <span className="mr-1.5">{CATEGORY_ICONS[a.category]}</span>
                            {categoryLabel(a.category)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium">
                            {formatCrore(a.amount_crore)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {formatNumber(a.estimated_beneficiaries)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-accent font-medium">
                            {formatPct(a.expected_impact_pct, true)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-navy-600">
                            {(a.confidence * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-navy-50 border-t-2 border-navy-300 font-medium">
                      <tr>
                        <td className="px-4 py-2.5">Total</td>
                        <td className="px-4 py-2.5 text-right">{formatCrore(result.total_allocated_crore)}</td>
                        <td className="px-4 py-2.5 text-right">{formatNumber(result.estimated_total_beneficiaries)}</td>
                        <td className="px-4 py-2.5 text-right text-accent">
                          {formatPct(result.expected_coverage_increase_pct, true)}
                        </td>
                        <td className="px-4 py-2.5 text-right">{(result.confidence * 100).toFixed(0)}%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Section>
            </>
          ) : (
            <div className="card p-12 text-center text-navy-500">
              <div className="text-4xl mb-3">💰</div>
              <p className="text-sm">Choose a budget and run the optimiser to see an AI-generated
                investment portfolio.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
