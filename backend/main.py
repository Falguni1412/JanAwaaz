"""
JanAwaaz Backend - FastAPI Application

Core endpoints:
- GET  /api/regions               - list all regions with summary HDI
- GET  /api/regions/{id}          - region detail with all HDI scores
- GET  /api/hdi/{region_id}/{cat} - detailed HDI for (region, category)
- POST /api/simulate/budget       - budget optimization
- POST /api/simulate/intervention - what-if infrastructure simulation
- GET  /api/alignment             - investment vs demand alignment
- GET  /api/impact/{project_id}   - project impact score
- GET  /api/brics/compare         - cross-country comparison
"""

from __future__ import annotations

import math
from dataclasses import asdict
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from core.hdi_engine import (
    INFRA_CATEGORIES, CATEGORY_SIGNAL_WEIGHTS, SIGNAL_WEIGHTS,
    SignalInput, calculate_hdi, DemandLevel,
)
from data_loader import (
    get_data, get_regions, get_signals, get_projects,
    signals_by_region_cat, region_by_id, _inverse_log_scale,
)


# ── Pydantic models ────────────────────────────────────────────────────────

class HDIResponse(BaseModel):
    region_id: str
    region_name: str
    category: str
    score: int
    level: str
    reported_demand_count: int
    estimated_affected_population: int
    confidence: float
    top_factors: List[str]
    summary: str
    recommendation: str
    breakdowns: List[dict]


class RegionSummary(BaseModel):
    id: str
    name: str
    country: str
    region_type: str
    lat: float
    lng: float
    population: int
    worst_category: str
    worst_score: int
    worst_level: str
    critical_count: int


class BudgetRequest(BaseModel):
    budget_crore: float = Field(..., gt=0, description="Available budget in Crore INR")
    categories: Optional[List[str]] = Field(
        default=None, description="Filter to specific categories")


class BudgetAllocation(BaseModel):
    category: str
    amount_crore: float
    estimated_beneficiaries: int
    expected_impact_pct: float
    confidence: float


class BudgetSimulationResponse(BaseModel):
    budget_crore: float
    total_allocated_crore: float
    allocations: List[BudgetAllocation]
    estimated_total_beneficiaries: int
    expected_coverage_increase_pct: float
    expected_social_impact_score: float
    confidence: float


class InterventionRequest(BaseModel):
    region_id: str
    category: str
    intervention_type: str = Field(
        ..., description="build | upgrade | expand | add_route"
    )
    description: Optional[str] = None


class InterventionImpact(BaseModel):
    current_state: dict
    proposed_intervention: dict
    projected_state: dict
    accessibility_change_pct: float
    travel_time_change_pct: float
    coverage_change_pct: float
    beneficiaries_delta: int
    demand_gap_change_pct: float
    equity_improvement: float
    confidence: float


class AlignmentResult(BaseModel):
    region_id: str
    region_name: str
    category: str
    hdi_score: int
    hdi_level: str
    planned_investment_crore: float
    investment_status: str  # aligned | blind_spot | oversupply | emerging


class ImpactScore(BaseModel):
    project_id: str
    region_id: str
    category: str
    score: int  # Infrastructure Impact Score
    accessibility_change_pct: float
    travel_time_change_pct: float
    satisfaction_change_pct: float
    coverage_change_pct: float
    demand_gap_change_pct: float
    beneficiary_count: int
    confidence: float
    status: str  # positive | neutral | needs_attention


class BRICSComparison(BaseModel):
    country: str
    avg_hdi: float
    category_scores: dict
    common_challenges: List[str]
    infrastructure_indicators: dict
    comparable_regions: List[str]


# ── HDI calculation helper ──────────────────────────────────────────────────

# Normalisation archetypes:
# Urban / Peri-Urban: complaint channel exists → low count = genuine low demand
# Rural: complaint channel partial → low count = suppressed demand
# Remote (Tribal/Hilly/Coastal/Amazon): channels absent → count is near-zero = severe hidden demand
REMOTE_ARCHETYPES = {
    "Tribal Belt", "Remote-Hilly", "Coastal-Vulnerable",
    "Remote-Amazon", "Remote-Far East", "Rural-Inland",
}
PERI_URBAN_ARCHETYPES = {"Urban", "Peri-Urban", "Urban-Periphery", "Urban-Township"}


def _region_norm(
    raw_count: int,
    region: dict,
    urban_ceiling: int = 100,
    rural_ceiling: int = 25,
    remote_ceiling: int = 8,
) -> float:
    """Normalise a count based on what we'd EXPECT for the region archetype.

    Urban: complaints common → high ceiling, need many to score high.
    Rural: complaints uncommon → lower ceiling, few signals are meaningful.
    Remote: channels absent → even 1-3 signals is significant.
    """
    rtype = region["region_type"]
    if rtype in PERI_URBAN_ARCHETYPES:
        ceiling = urban_ceiling
    elif rtype in REMOTE_ARCHETYPES:
        ceiling = remote_ceiling
    else:
        ceiling = rural_ceiling
    return min(1.0, raw_count / max(1, ceiling))


def compute_hdi_for_region_category(region_id: str, category: str) -> dict:
    region = region_by_id(region_id)
    if not region:
        raise HTTPException(404, f"Region {region_id} not found")

    signals_raw = signals_by_region_cat(region_id, category)
    reported_count = len(signals_raw)

    signal_objs: List[SignalInput] = []

    def add(key: str, label: str, raw: float, norm: float, evidence: str):
        signal_objs.append(SignalInput(
            key=key, label=label,
            raw_value=raw, normalized_value=norm,
            human_evidence=evidence,
        ))

    # Signal counts
    emergency_count = sum(1 for s in signals_raw if s.get("is_emergency", False))
    voice_count = sum(1 for s in signals_raw if s.get("is_voice", False))

    # 1. Citizen signals — key normalization: remote archetypes amplify low counts
    citizen_norm = _region_norm(reported_count, region)
    add("citizen_signals", "Citizen Signals",
        reported_count, citizen_norm,
        f"{reported_count} citizen signals")
    add("voice_message_mentions", "Voice Messages",
        voice_count, min(1.0, voice_count / 20),
        f"{voice_count} voice messages")
    add("semantic_pattern_repetition", "Repeated Patterns",
        emergency_count, min(1.0, emergency_count / 10),
        f"Patterns repeated {max(1, emergency_count)} times")

    # 2. Emergency signals (from citizen signals)
    emergency_rate = emergency_count / max(1, reported_count)
    add("emergency_signals", "Emergency Signals",
        emergency_rate, emergency_rate,
        f"{emergency_count} emergency-related signals ({emergency_rate:.0%} of total)")

    # 3. Historical unresolved
    unresolved_pct = 0.65 if region["region_type"] in (
        "Tribal Belt", "Remote-Hilly", "Remote-Amazon") else 0.35
    add("unresolved_historical_requests", "Unresolved Requests",
        unresolved_pct, unresolved_pct,
        f"~{int(unresolved_pct*100)}% historical requests unresolved")

    # 4. Infrastructure availability
    facility_count = region["existing_facilities"].get(category, 0)
    avail_score = min(1.0, facility_count / 3)
    add("infrastructure_availability", "Infrastructure Availability",
        avail_score, 1 - avail_score,
        f"{facility_count} existing facilities")

    # 5. Travel distance
    dist_km = region["travel_distance_km"].get(category, 15)
    norm_dist = 1 - _inverse_log_scale(dist_km, 50)
    add("travel_distance_to_facility", "Travel Distance",
        dist_km, norm_dist,
        f"{dist_km} km average travel distance")

    # 6. Capacity utilization
    util = region["facility_capacity_utilization"].get(category, 0.75)
    add("existing_capacity_utilization", "Capacity Utilisation",
        util, util,
        f"{util:.0%} capacity utilisation (high = overstretched)")

    # 7. Infrastructure quality
    quality = region["infrastructure_quality"].get(category, 0.5)
    add("infrastructure_quality", "Infrastructure Quality",
        quality, 1 - quality,
        f"{quality:.0%} quality score")

    # 8. Population density (population per km²)
    density = region.get("population_density", 200)
    norm_density = min(1.0, math.log1p(density) / math.log1p(1500))
    add("population_density", "Population Density",
        density, norm_density,
        f"{density:.0f} people/km²")

    # 9. Demographic vulnerability
    vuln = (region.get("poverty_index", 0.5) +
            region.get("elderly_pct", 0.1) * 0.5) / 1.5
    add("demographic_vulnerability", "Demographic Vulnerability",
        vuln, vuln,
        f"High poverty + elderly = elevated vulnerability")

    # 10. Population growth
    growth = region.get("population_growth_pct", 5) / 100
    add("population_growth", "Population Growth",
        growth, min(1.0, growth * 5),
        f"{region.get('population_growth_pct', 5):.1f}% population growth")

    # 11. Geographic isolation
    iso = region.get("geographic_isolation", 0.5)
    add("geographic_isolation", "Geographic Isolation",
        iso, iso,
        f"{iso:.0%} geographic isolation score")

    # 12. Government investment adequacy
    inv_per_cap = region.get("gov_investment_per_capita", 1500)
    inv_score = min(1.0, inv_per_cap / 5000)
    add("government_investment_adequacy", "Investment Adequacy",
        inv_score, 1 - inv_score,
        f"₹{inv_per_cap:,.0f} per capita investment")

    # 13. Seasonal/disaster patterns
    disaster = region.get("seasonal_disaster_exposure", 0.2)
    add("seasonal_disaster_patterns", "Disaster Exposure",
        disaster, disaster,
        f"{disaster:.0%} seasonal disaster exposure")

    # Calculate affected population estimate
    affected = int(region["population"] * (
        (1 - region.get("existing_facilities", {}).get(category, 0) / 5) *
        (dist_km / 50) * (1 + vuln)
    ))
    affected = min(affected, region["population"])

    # Structural severity boost for remote archetypes:
    # When structural conditions are extreme (zero facilities, very long distance,
    # high isolation, high vulnerability), amplify ALL structural signals to maximum.
    # This is the key insight of JanAwaaz: extreme structural deficit = critical hidden demand.
    is_remote = region["region_type"] in REMOTE_ARCHETYPES
    if is_remote:
        # Count extreme structural indicators (each worth 0.25 toward a 0-1 severity score)
        severity = 0.0
        if facility_count == 0:
            severity += 0.30
        elif facility_count == 1:
            severity += 0.15
        if dist_km > 30:
            severity += 0.30
        elif dist_km > 15:
            severity += 0.15
        severity += region.get("geographic_isolation", 0) * 0.25
        severity += vuln * 0.25
        severity += region.get("population_growth_pct", 5) / 100 * 0.2

        if severity >= 0.5:
            # Push structural signals toward 1.0 based on severity
            target = min(1.0, 0.7 + severity * 0.5)
            for s in signal_objs:
                if s.key in (
                    "infrastructure_availability", "travel_distance_to_facility",
                    "geographic_isolation", "demographic_vulnerability",
                    "population_growth", "existing_capacity_utilization",
                    "government_investment_adequacy", "unresolved_historical_requests",
                ):
                    # Blend current value toward target
                    s.normalized_value = min(
                        1.0, s.normalized_value * (1 - severity * 0.6) +
                        target * severity * 0.6
                    )

    result = calculate_hdi(
        region_id=region_id, category=category,
        signals=signal_objs, reported_demand_count=reported_count,
        estimated_affected_population=affected,
    )

    # Final score override: for extreme remote archetypes, the gap between formal
    # complaint counts and structural need is so large that the computed score
    # underestimates true hidden demand. Scale the score up for truly extreme cases.
    is_remote = region["region_type"] in REMOTE_ARCHETYPES
    if is_remote and result.score >= 55:
        # Count extreme indicators
        extreme_count = 0
        if facility_count == 0:
            extreme_count += 2
        elif facility_count == 1:
            extreme_count += 1
        if dist_km >= 35:
            extreme_count += 2
        elif dist_km >= 20:
            extreme_count += 1
        extreme_count += 2 if region.get("geographic_isolation", 0) >= 0.75 else 1 if region.get("geographic_isolation", 0) >= 0.5 else 0
        extreme_count += 2 if vuln >= 0.7 else 1 if vuln >= 0.5 else 0
        extreme_count += 1 if region.get("seasonal_disaster_exposure", 0) >= 0.6 else 0

        if extreme_count >= 4:
            # Critical case: 4-7 extreme indicators → boost to 86-97
            boost = 1.0 + extreme_count * 0.05
            new_score = min(100, round(result.score * boost))
            result.score = new_score
            # Re-classify the level with the boosted score
            from core.hdi_engine import classify_hdi
            result.level = classify_hdi(new_score)

    return {
        "region_id": result.region_id,
        "region_name": region["name"],
        "category": result.category,
        "score": result.score,
        "level": result.level.value,
        "reported_demand_count": result.reported_demand_count,
        "estimated_affected_population": result.estimated_affected_population,
        "confidence": result.confidence,
        "top_factors": result.top_factors,
        "summary": result.summary,
        "recommendation": result.recommendation,
        "breakdowns": [
            {"key": b.signal.key, "label": b.signal.label,
             "raw": b.signal.raw_value, "normalized": b.signal.normalized_value,
             "weight": b.weight, "contribution": b.contribution,
             "evidence": b.signal.human_evidence}
            for b in result.breakdowns
        ],
    }


# ── FastAPI app ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="JanAwaaz API",
    description="AI-Powered Silent Demand Intelligence for Digital Public Infrastructure",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["meta"])
async def root():
    return {"message": "JanAwaaz API", "version": "1.0.0", "status": "running"}


@app.get("/api/regions", response_model=List[RegionSummary], tags=["regions"])
async def list_regions():
    """List all regions with worst-category HDI summary."""
    results = []
    for region in get_regions():
        scores = []
        for cat in INFRA_CATEGORIES:
            try:
                hdi = compute_hdi_for_region_category(region["id"], cat)
                scores.append((cat, hdi["score"], hdi["level"]))
            except Exception:
                pass
        if not scores:
            continue
        worst = max(scores, key=lambda x: x[1])
        crit_count = sum(1 for s in scores if s[2] in ("Critical", "High"))
        results.append(RegionSummary(
            id=region["id"], name=region["name"], country=region["country"],
            region_type=region["region_type"], lat=region["lat"], lng=region["lng"],
            population=region["population"],
            worst_category=worst[0], worst_score=worst[1], worst_level=worst[2],
            critical_count=crit_count,
        ))
    return results


@app.get("/api/regions/{region_id}", response_model=dict, tags=["regions"])
async def get_region(region_id: str):
    """Full HDI breakdown for a region across all categories."""
    region = region_by_id(region_id)
    if not region:
        raise HTTPException(404, f"Region {region_id} not found")

    hdis = []
    for cat in INFRA_CATEGORIES:
        try:
            hdis.append(compute_hdi_for_region_category(region_id, cat))
        except Exception as e:
            hdis.append({"category": cat, "error": str(e)})

    return {
        "region": region,
        "hdi_by_category": hdis,
        "notice": "DEMO / SYNTHETIC DATA - not real government statistics",
    }


@app.get("/api/hdi/{region_id}/{category}", response_model=HDIResponse, tags=["hdi"])
async def get_hdi(region_id: str, category: str):
    """Detailed Hidden Demand Index for a specific region and category."""
    if category not in INFRA_CATEGORIES:
        raise HTTPException(400, f"Unknown category: {category}. "
                                f"Valid: {INFRA_CATEGORIES}")
    result = compute_hdi_for_region_category(region_id, category)
    return result


@app.post("/api/simulate/budget", response_model=BudgetSimulationResponse, tags=["simulator"])
async def simulate_budget(req: BudgetRequest):
    """Optimize a budget allocation across infrastructure categories.

    Uses HDI scores + population impact to rank and allocate investments.
    """
    cats = req.categories or INFRA_CATEGORIES
    budget = req.budget_crore

    # Aggregate HDI across all regions per category
    cat_hdi = {cat: [] for cat in cats}
    for region in get_regions():
        for cat in cats:
            try:
                hdi = compute_hdi_for_region_category(region["id"], cat)
                cat_hdi[cat].append(hdi["score"])
            except Exception:
                pass

    avg_hdi = {cat: (sum(v) / len(v) if v else 50) for cat, v in cat_hdi.items()}

    # Weighted allocation: priority = HDI^1.5 (convex to emphasize critical)
    weights = {cat: (avg_hdi[cat] / 100) ** 1.5 for cat in cats}
    total_w = sum(weights.values()) or 1

    # Scale to budget
    raw_alloc = {cat: (weights[cat] / total_w) * budget for cat in cats}
    # Enforce minimum 5% allocation, cap at 40%
    min_a = budget * 0.05
    max_a = budget * 0.40
    alloc = {cat: max(min_a, min(max_a, raw_alloc[cat])) for cat in cats}
    # Redistribute overflow
    overflow = budget - sum(alloc.values())
    if overflow > 0:
        active = [c for c in cats if alloc[c] < max_a]
        if active:
            extra = overflow / len(active)
            for cat in active:
                alloc[cat] = min(max_a, alloc[cat] + extra)

    allocations = []
    total_beneficiaries = 0
    total_impact = 0.0
    for cat, amt in alloc.items():
        beneficiaries = int(avg_hdi[cat] * 1000)
        impact = min(95, avg_hdi[cat] * 0.9)
        confidence = 0.75 + (1 - avg_hdi[cat] / 100) * 0.15
        total_beneficiaries += beneficiaries
        total_impact += impact * amt
        allocations.append(BudgetAllocation(
            category=cat, amount_crore=round(amt, 2),
            estimated_beneficiaries=beneficiaries,
            expected_impact_pct=round(impact, 1),
            confidence=round(confidence, 2),
        ))

    # Sort by allocation amount
    allocations.sort(key=lambda x: x.amount_crore, reverse=True)

    return BudgetSimulationResponse(
        budget_crore=req.budget_crore,
        total_allocated_crore=round(sum(a.amount_crore for a in allocations), 2),
        allocations=allocations,
        estimated_total_beneficiaries=total_beneficiaries,
        expected_coverage_increase_pct=round(
            sum(a.expected_impact_pct for a in allocations) / len(allocations), 1),
        expected_social_impact_score=round(
            total_impact / budget if budget else 0, 1),
        confidence=round(
            sum(a.confidence for a in allocations) / len(allocations), 2),
    )


@app.post("/api/simulate/intervention", response_model=InterventionImpact, tags=["simulator"])
async def simulate_intervention(req: InterventionRequest):
    """What-if simulator: project the impact of an infrastructure intervention."""
    region = region_by_id(req.region_id)
    if not region:
        raise HTTPException(404, f"Region {req.region_id} not found")

    cat = req.category
    hdi = compute_hdi_for_region_category(req.region_id, cat)

    # Current state
    current = {
        "facility_count": region["existing_facilities"].get(cat, 0),
        "avg_distance_km": region["travel_distance_km"].get(cat, 15),
        "capacity_utilisation": region["facility_capacity_utilization"].get(cat, 0.8),
        "quality": region["infrastructure_quality"].get(cat, 0.5),
    }

    # Intervention effects
    effects = {
        "build": {"facility_delta": 2, "dist_reduction": 0.6,
                  "util_drop": 0.35, "quality_up": 0.3},
        "upgrade": {"facility_delta": 0, "dist_reduction": 0.2,
                    "util_drop": 0.15, "quality_up": 0.25},
        "expand": {"facility_delta": 1, "dist_reduction": 0.35,
                   "util_drop": 0.25, "quality_up": 0.15},
        "add_route": {"facility_delta": 0, "dist_reduction": 0.5,
                      "util_drop": 0.1, "quality_up": 0.05},
    }.get(req.intervention_type, {})

    proposed = {
        "intervention": req.intervention_type,
        "category": cat,
        "facility_delta": effects.get("facility_delta", 0),
        "description": req.description or f"{req.intervention_type.title()} {cat}",
    }

    proj = {
        "facility_count": current["facility_count"] + effects.get("facility_delta", 0),
        "avg_distance_km": current["avg_distance_km"] * (1 - effects.get("dist_reduction", 0)),
        "capacity_utilisation": max(0.3, current["capacity_utilisation"] -
                                    effects.get("util_drop", 0)),
        "quality": min(1.0, current["quality"] + effects.get("quality_up", 0)),
    }

    access_change = (
        (current["avg_distance_km"] - proj["avg_distance_km"]) /
        max(1, current["avg_distance_km"]) * 100
    )
    util_change = (
        (current["capacity_utilisation"] - proj["capacity_utilisation"]) /
        max(0.1, current["capacity_utilisation"]) * 100
    )
    qual_change = (proj["quality"] - current["quality"]) / max(0.01, current["quality"]) * 100

    coverage_delta = int(
        region["population"] * effects.get("facility_delta", 0) * 0.1
    )
    beneficiaries_delta = int(region["population"] * 0.08)
    demand_gap_change = -min(80, hdi["score"] * 0.65)
    equity_improvement = (proj["quality"] - current["quality"]) * 100

    return InterventionImpact(
        current_state={k: round(v, 2) for k, v in current.items()},
        proposed_intervention=proposed,
        projected_state={k: round(v, 2) for k, v in proj.items()},
        accessibility_change_pct=round(access_change, 1),
        travel_time_change_pct=round(-effects.get("dist_reduction", 0) * 100, 1),
        coverage_change_pct=round(
            beneficiaries_delta / max(1, region["population"]) * 100, 1),
        beneficiaries_delta=beneficiaries_delta,
        demand_gap_change_pct=round(demand_gap_change, 1),
        equity_improvement=round(equity_improvement, 1),
        confidence=round(0.82 - abs(qual_change) * 0.002, 2),
    )


@app.get("/api/alignment", response_model=List[AlignmentResult], tags=["alignment"])
async def get_investment_alignment():
    """Compare citizen demand vs planned government investment."""
    results = []
    for region in get_regions():
        hdis = {}
        for cat in INFRA_CATEGORIES:
            try:
                hdi = compute_hdi_for_region_category(region["id"], cat)
                hdis[cat] = hdi
            except Exception:
                pass

        projects = [p for p in get_projects() if p["region_id"] == region["id"]]
        for cat, hdi in hdis.items():
            cat_projects = [p for p in projects if p["category"] == cat]
            inv_crore = sum(p["budget_crore_inr"] for p in cat_projects)

            if hdi["score"] >= 70 and inv_crore < 5:
                status = "blind_spot"
            elif hdi["score"] >= 70 and inv_crore >= 10:
                status = "aligned"
            elif hdi["score"] < 40 and inv_crore > 10:
                status = "oversupply"
            elif hdi["score"] >= 50 and inv_crore == 0:
                status = "emerging"
            else:
                status = "emerging" if hdi["score"] >= 50 else "aligned"

            results.append(AlignmentResult(
                region_id=region["id"],
                region_name=region["name"],
                category=cat,
                hdi_score=hdi["score"],
                hdi_level=hdi["level"],
                planned_investment_crore=inv_crore,
                investment_status=status,
            ))
    return results


@app.get("/api/impact/{project_id}", response_model=ImpactScore, tags=["impact"])
async def get_impact_score(project_id: str):
    """Compute Infrastructure Impact Score for a completed project."""
    projects = get_projects()
    proj = next((p for p in projects if p["id"] == project_id), None)
    if not proj:
        raise HTTPException(404, f"Project {project_id} not found")

    region = region_by_id(proj["region_id"])
    if not region:
        raise HTTPException(404, f"Region {proj['region_id']} not found")

    cat = proj["category"]
    pre_hdi = compute_hdi_for_region_category(proj["region_id"], cat)
    budget_factor = min(1.0, proj["budget_crore_inr"] / 20)

    # Simulated post-project state (in real system, this uses actual data)
    post_score = max(10, pre_hdi["score"] - (pre_hdi["score"] * budget_factor * 0.55))
    score = round(100 - post_score)
    score = max(0, min(100, score))

    accessibility = round(budget_factor * 47, 1)
    travel_time = round(budget_factor * 31, 1)
    satisfaction = round(budget_factor * 44, 1)
    coverage = round(budget_factor * 58, 1)
    demand_gap = round(budget_factor * 63, 1)

    beneficiary_count = int(
        min(region["population"],
            pre_hdi["estimated_affected_population"] * budget_factor * 1.2)
    )

    status = "positive" if score >= 60 else "needs_attention" if score < 30 else "neutral"

    return ImpactScore(
        project_id=project_id, region_id=proj["region_id"], category=cat,
        score=score, accessibility_change_pct=accessibility,
        travel_time_change_pct=travel_time, satisfaction_change_pct=satisfaction,
        coverage_change_pct=coverage, demand_gap_change_pct=demand_gap,
        beneficiary_count=beneficiary_count,
        confidence=round(0.80 + budget_factor * 0.10, 2),
        status=status,
    )


@app.get("/api/brics/compare", response_model=List[BRICSComparison], tags=["brics"])
async def compare_brics():
    """Cross-country comparison across BRICS nations."""
    countries = ["India", "Brazil", "Russia", "China", "South Africa"]
    comparisons = []

    for country in countries:
        regions = [r for r in get_regions() if r["country"] == country]
        cat_scores = {}
        for cat in INFRA_CATEGORIES:
            scores = []
            for r in regions:
                try:
                    hdi = compute_hdi_for_region_category(r["id"], cat)
                    scores.append(hdi["score"])
                except Exception:
                    pass
            cat_scores[cat] = round(sum(scores) / len(scores), 1) if scores else 50

        avg_hdi = round(sum(cat_scores.values()) / len(cat_scores), 1) if cat_scores else 50

        challenges = []
        if cat_scores.get("healthcare", 0) > 60:
            challenges.append("Healthcare access gaps")
        if cat_scores.get("roads", 0) > 60:
            challenges.append("Rural road connectivity")
        if cat_scores.get("internet", 0) > 60:
            challenges.append("Digital divide")
        if cat_scores.get("water", 0) > 60:
            challenges.append("Water security")
        if cat_scores.get("education", 0) > 60:
            challenges.append("Education infrastructure")

        comparisons.append(BRICsComparison(
            country=country,
            avg_hdi=avg_hdi,
            category_scores=cat_scores,
            common_challenges=challenges,
            infrastructure_indicators={
                "avg_population": round(
                    sum(r["population"] for r in regions) / max(1, len(regions)), 0),
                "region_count": len(regions),
                "critical_categories": [c for c, s in cat_scores.items() if s >= 70],
            },
            comparable_regions=[r["name"] for r in regions[:3]],
        ))

    return comparisons


@app.get("/api/categories", tags=["meta"])
async def list_categories():
    """List all supported infrastructure categories."""
    return [{"id": cat, "name": cat.replace("_", " ").title()}
            for cat in INFRA_CATEGORIES]


@app.get("/api/demo-notice", tags=["meta"])
async def demo_notice():
    return {
        "notice": "DEMO / SYNTHETIC DATA - not real government statistics",
        "version": "1.0.0",
        "purpose": "Demonstration of JanAwaaz Silent Demand Intelligence platform",
    }
