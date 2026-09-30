// Type definitions for the JanAwaaz frontend

export type DemandLevel = 'Low' | 'Emerging' | 'Moderate' | 'High' | 'Critical'

export interface Region {
  id: string
  name: string
  country: string
  region_type: string
  lat: number
  lng: number
  population: number
  area_km2: number
  population_density: number
  population_growth_pct: number
  elderly_pct: number
  poverty_index: number
  geographic_isolation: number
  seasonal_disaster_exposure: number
  gov_investment_per_capita: number
  existing_facilities: Record<string, number>
  facility_capacity_utilization: Record<string, number>
  travel_distance_km: Record<string, number>
  infrastructure_quality: Record<string, number>
}

export interface HDIBreakdown {
  key: string
  label: string
  raw: number
  normalized: number
  weight: number
  contribution: number
  evidence: string
}

export interface HDIResponse {
  region_id: string
  region_name: string
  category: string
  score: number
  level: DemandLevel
  reported_demand_count: number
  estimated_affected_population: number
  confidence: number
  top_factors: string[]
  summary: string
  recommendation: string
  breakdowns: HDIBreakdown[]
}

export interface RegionSummary {
  id: string
  name: string
  country: string
  region_type: string
  lat: number
  lng: number
  population: number
  worst_category: string
  worst_score: number
  worst_level: DemandLevel
  critical_count: number
}

export interface BudgetAllocation {
  category: string
  amount_crore: number
  estimated_beneficiaries: number
  expected_impact_pct: number
  confidence: number
}

export interface BudgetSimulationResponse {
  budget_crore: number
  total_allocated_crore: number
  allocations: BudgetAllocation[]
  estimated_total_beneficiaries: number
  expected_coverage_increase_pct: number
  expected_social_impact_score: number
  confidence: number
}

export interface InterventionImpact {
  current_state: Record<string, number>
  proposed_intervention: Record<string, any>
  projected_state: Record<string, number>
  accessibility_change_pct: number
  travel_time_change_pct: number
  coverage_change_pct: number
  beneficiaries_delta: number
  demand_gap_change_pct: number
  equity_improvement: number
  confidence: number
}

export type InvestmentStatus = 'aligned' | 'blind_spot' | 'oversupply' | 'emerging'

export interface AlignmentResult {
  region_id: string
  region_name: string
  category: string
  hdi_score: number
  hdi_level: DemandLevel
  planned_investment_crore: number
  investment_status: InvestmentStatus
}

export interface ImpactScore {
  project_id: string
  region_id: string
  category: string
  score: number
  accessibility_change_pct: number
  travel_time_change_pct: number
  satisfaction_change_pct: number
  coverage_change_pct: number
  demand_gap_change_pct: number
  beneficiary_count: number
  confidence: number
  status: 'positive' | 'neutral' | 'needs_attention'
}

export interface BRICSComparison {
  country: string
  avg_hdi: number
  category_scores: Record<string, number>
  common_challenges: string[]
  infrastructure_indicators: Record<string, any>
  comparable_regions: string[]
}
