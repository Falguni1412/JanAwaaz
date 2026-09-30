import { useState } from 'react'
import { api } from '../utils/api'
import { InterventionImpact, RegionSummary } from '../types'
import { Panel, StatCard, Section } from '../components/Dashboard'
import { CATEGORY_ICONS, categoryLabel, formatPct } from '../utils/format'

const CATS = [
  'healthcare', 'education', 'roads', 'water', 'electricity',
  'internet', 'public_transport', 'sanitation', 'public_safety',
  'agriculture', 'emergency_services',
]

const INTERVENTIONS = [
  { value: 'build', label: 'Build New Facility' },
  { value: 'upgrade', label: 'Upgrade Existing' },
  { value: 'expand', label: 'Expand Capacity' },
  { value: 'add_route', label: 'Add Transport Route' },
]

export function WhatIfSimulator() {
  const [regions, setRegions] = useState<RegionSummary[]>([])
  const [regionId, setRegionId] = useState<string>('')
  const [category, setCategory] = useState('healthcare')
  const [intervention, setIntervention] = useState('build')
  const [impact, setImpact] = useState<InterventionImpact | null>(null)
  const [loading, setLoading] = useState(false)

  useState(() => {
    api.getRegions().then(rs => {
      setRegions(rs)
      if (rs.length && !regionId) setRegionId(rs[0].id)
    })
  })

  const run = async () => {
    if (!regionId) return
    setLoading(true)
    try {
      const r = await api.simulateIntervention(regionId, category, intervention)
      setImpact(r)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-navy-900">What-If Infrastructure Simulator</h1>
        <p className="text-sm text-navy-600">
          Test the projected impact of an infrastructure intervention before
          committing public funds. All projections are clearly labelled as
          simulations, not factual outcomes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <Panel title="Configure Intervention">
            <label className="block text-xs font-medium text-navy-700 mb-1">Region</label>
            <select value={regionId} onChange={e => setRegionId(e.target.value)}
              className="w-full mb-3 px-3 py-2 border border-navy-300 rounded text-sm">
              {regions.map(r => (
                <option key={r.id} value={r.id}>{r.name} · {r.country}</option>
              ))}
            </select>

            <label className="block text-xs font-medium text-navy-700 mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full mb-3 px-3 py-2 border border-navy-300 rounded text-sm">
              {CATS.map(c => (
                <option key={c} value={c}>{CATEGORY_ICONS[c]} {categoryLabel(c)}</option>
              ))}
            </select>

            <label className="block text-xs font-medium text-navy-700 mb-1">Intervention Type</label>
            <select value={intervention} onChange={e => setIntervention(e.target.value)}
              className="w-full mb-4 px-3 py-2 border border-navy-300 rounded text-sm">
              {INTERVENTIONS.map(i => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>

            <button onClick={run} disabled={loading} className="btn-primary w-full">
              {loading ? 'Simulating…' : 'Run Simulation'}
            </button>

            <p className="text-xs text-navy-500 mt-3">
              ⚠ Simulated projections. Results depend on local conditions and
              implementation quality.
            </p>
          </Panel>
        </div>

        <div className="lg:col-span-2">
          {impact ? (
            <>
              <Section title="Projected Impact" subtitle="Simulated outcomes (not measured)">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Accessibility"
                    value={formatPct(impact.accessibility_change_pct, true)}
                    sub="Improvement" accent="text-green-600" />
                  <StatCard label="Travel Time"
                    value={formatPct(impact.travel_time_change_pct, true)}
                    sub="Reduction" accent="text-green-600" />
                  <StatCard label="Coverage"
                    value={formatPct(impact.coverage_change_pct, true)}
                    sub="Increase" accent="text-green-600" />
                  <StatCard label="Demand Gap"
                    value={formatPct(impact.demand_gap_change_pct, true)}
                    sub="Reduction" accent="text-green-600" />
                </div>
              </Section>

              <Section title="State Comparison" subtitle="Current → Projected">
                <div className="grid grid-cols-2 gap-4">
                  <div className="card p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 mb-3">
                      Current State
                    </p>
                    <StateList state={impact.current_state} />
                  </div>
                  <div className="card p-5 border-l-4 border-l-accent">
                    <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 mb-3">
                      Projected State
                    </p>
                    <StateList state={impact.projected_state} />
                  </div>
                </div>
              </Section>

              <div className="card p-5">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="stat-label">New Beneficiaries</p>
                    <p className="text-2xl font-bold text-navy-900">
                      +{impact.beneficiaries_delta.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="stat-label">Equity Improvement</p>
                    <p className="text-2xl font-bold text-green-600">
                      +{impact.equity_improvement.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="stat-label">AI Confidence</p>
                    <p className="text-2xl font-bold text-navy-700">
                      {(impact.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card p-12 text-center text-navy-500">
              <div className="text-4xl mb-3">🔬</div>
              <p className="text-sm">Configure an intervention and run the simulation
                to see projected outcomes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StateList({ state }: { state: Record<string, number> }) {
  return (
    <ul className="space-y-2 text-sm">
      {Object.entries(state).map(([k, v]) => (
        <li key={k} className="flex justify-between">
          <span className="text-navy-600">{k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())}</span>
          <span className="font-medium text-navy-900">{v}</span>
        </li>
      ))}
    </ul>
  )
}
