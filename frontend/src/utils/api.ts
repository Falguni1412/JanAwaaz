// API client - thin wrapper around fetch

import type {
  RegionSummary, HDIResponse, BudgetSimulationResponse,
  InterventionImpact, AlignmentResult, ImpactScore, BRICSComparison,
} from '../types'

const API = import.meta.env.VITE_API_URL || ''

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`)
  return res.json()
}

export const api = {
  getRegions: () => get<RegionSummary[]>('/api/regions'),
  getRegion: (id: string) => get<any>(`/api/regions/${id}`),
  getHDI: (regionId: string, category: string) =>
    get<HDIResponse>(`/api/hdi/${regionId}/${category}`),
  simulateBudget: (budget: number, categories?: string[]) =>
    post<BudgetSimulationResponse>('/api/simulate/budget', {
      budget_crore: budget,
      categories,
    }),
  simulateIntervention: (regionId: string, category: string,
                          intervention: string, description?: string) =>
    post<InterventionImpact>('/api/simulate/intervention', {
      region_id: regionId,
      category,
      intervention_type: intervention,
      description,
    }),
  getAlignment: () => get<AlignmentResult[]>('/api/alignment'),
  getImpact: (projectId: string) =>
    get<ImpactScore>(`/api/impact/${projectId}`),
  getBRICS: () => get<BRICSComparison[]>('/api/brics/compare'),
  getCategories: () => get<any[]>('/api/categories'),
}
