"""
JanAwaaz - Hidden Demand Index (HDI) Engine

The core innovation that distinguishes JanAwaaz from traditional
grievance systems. Calculates an explainable score representing
the gap between reported demand and actual/hidden demand.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple


class DemandLevel(str, Enum):
    """Hidden Demand classification bands."""
    LOW = "Low"
    EMERGING = "Emerging"
    MODERATE = "Moderate"
    HIGH = "High"
    CRITICAL = "Critical"


# Weights reflect the *Hidden Demand* philosophy: signals that reveal
# unmet need carry more weight than raw complaint counts.
SIGNAL_WEIGHTS: Dict[str, float] = {
    # Citizen signals (high weight - direct unmet need evidence)
    "citizen_signals": 12.0,
    "voice_message_mentions": 10.0,
    "semantic_pattern_repetition": 8.0,
    "emergency_signals": 15.0,
    "unresolved_historical_requests": 9.0,
    # Infrastructure deficit signals
    "infrastructure_availability": 14.0,
    "travel_distance_to_facility": 11.0,
    "existing_capacity_utilization": 8.0,
    "infrastructure_quality": 7.0,
    # Demographic & equity signals
    "population_density": 5.0,
    "demographic_vulnerability": 9.0,
    "population_growth": 6.0,
    "geographic_isolation": 8.0,
    # Economic / contextual signals
    "government_investment_adequacy": 7.0,
    "seasonal_disaster_patterns": 6.0,
}

# Weights by infrastructure category - reflect which signals matter most
# for each domain, so an "education" deficit isn't scored with a
# healthcare-shaped formula.
CATEGORY_SIGNAL_WEIGHTS: Dict[str, Dict[str, float]] = {
    "healthcare": {
        "citizen_signals": 10.0, "voice_message_mentions": 10.0,
        "semantic_pattern_repetition": 7.0, "emergency_signals": 18.0,
        "unresolved_historical_requests": 9.0, "infrastructure_availability": 14.0,
        "travel_distance_to_facility": 14.0, "existing_capacity_utilization": 11.0,
        "infrastructure_quality": 8.0, "population_density": 4.0,
        "demographic_vulnerability": 10.0, "population_growth": 5.0,
        "geographic_isolation": 8.0, "government_investment_adequacy": 8.0,
        "seasonal_disaster_patterns": 5.0,
    },
    "education": {
        "citizen_signals": 12.0, "voice_message_mentions": 9.0,
        "semantic_pattern_repetition": 9.0, "emergency_signals": 5.0,
        "unresolved_historical_requests": 10.0, "infrastructure_availability": 14.0,
        "travel_distance_to_facility": 13.0, "existing_capacity_utilization": 11.0,
        "infrastructure_quality": 10.0, "population_density": 6.0,
        "demographic_vulnerability": 9.0, "population_growth": 7.0,
        "geographic_isolation": 7.0, "government_investment_adequacy": 8.0,
        "seasonal_disaster_patterns": 3.0,
    },
    "roads": {
        "citizen_signals": 12.0, "voice_message_mentions": 10.0,
        "semantic_pattern_repetition": 8.0, "emergency_signals": 14.0,
        "unresolved_historical_requests": 9.0, "infrastructure_availability": 14.0,
        "travel_distance_to_facility": 12.0, "existing_capacity_utilization": 7.0,
        "infrastructure_quality": 13.0, "population_density": 6.0,
        "demographic_vulnerability": 6.0, "population_growth": 7.0,
        "geographic_isolation": 11.0, "government_investment_adequacy": 8.0,
        "seasonal_disaster_patterns": 9.0,
    },
    "water": {
        "citizen_signals": 12.0, "voice_message_mentions": 10.0,
        "semantic_pattern_repetition": 9.0, "emergency_signals": 11.0,
        "unresolved_historical_requests": 10.0, "infrastructure_availability": 15.0,
        "travel_distance_to_facility": 11.0, "existing_capacity_utilization": 9.0,
        "infrastructure_quality": 9.0, "population_density": 6.0,
        "demographic_vulnerability": 9.0, "population_growth": 5.0,
        "geographic_isolation": 8.0, "government_investment_adequacy": 8.0,
        "seasonal_disaster_patterns": 8.0,
    },
    "electricity": {
        "citizen_signals": 12.0, "voice_message_mentions": 10.0,
        "semantic_pattern_repetition": 9.0, "emergency_signals": 8.0,
        "unresolved_historical_requests": 10.0, "infrastructure_availability": 15.0,
        "travel_distance_to_facility": 6.0, "existing_capacity_utilization": 10.0,
        "infrastructure_quality": 12.0, "population_density": 7.0,
        "demographic_vulnerability": 7.0, "population_growth": 6.0,
        "geographic_isolation": 8.0, "government_investment_adequacy": 9.0,
        "seasonal_disaster_patterns": 9.0,
    },
    "internet": {
        "citizen_signals": 11.0, "voice_message_mentions": 8.0,
        "semantic_pattern_repetition": 8.0, "emergency_signals": 5.0,
        "unresolved_historical_requests": 9.0, "infrastructure_availability": 15.0,
        "travel_distance_to_facility": 5.0, "existing_capacity_utilization": 9.0,
        "infrastructure_quality": 11.0, "population_density": 7.0,
        "demographic_vulnerability": 6.0, "population_growth": 6.0,
        "geographic_isolation": 10.0, "government_investment_adequacy": 9.0,
        "seasonal_disaster_patterns": 3.0,
    },
    "public_transport": {
        "citizen_signals": 12.0, "voice_message_mentions": 11.0,
        "semantic_pattern_repetition": 8.0, "emergency_signals": 12.0,
        "unresolved_historical_requests": 9.0, "infrastructure_availability": 14.0,
        "travel_distance_to_facility": 11.0, "existing_capacity_utilization": 10.0,
        "infrastructure_quality": 8.0, "population_density": 8.0,
        "demographic_vulnerability": 7.0, "population_growth": 6.0,
        "geographic_isolation": 10.0, "government_investment_adequacy": 8.0,
        "seasonal_disaster_patterns": 5.0,
    },
    "sanitation": {
        "citizen_signals": 12.0, "voice_message_mentions": 9.0,
        "semantic_pattern_repetition": 8.0, "emergency_signals": 9.0,
        "unresolved_historical_requests": 9.0, "infrastructure_availability": 14.0,
        "travel_distance_to_facility": 8.0, "existing_capacity_utilization": 8.0,
        "infrastructure_quality": 11.0, "population_density": 8.0,
        "demographic_vulnerability": 8.0, "population_growth": 5.0,
        "geographic_isolation": 6.0, "government_investment_adequacy": 9.0,
        "seasonal_disaster_patterns": 8.0,
    },
    "public_safety": {
        "citizen_signals": 12.0, "voice_message_mentions": 10.0,
        "semantic_pattern_repetition": 8.0, "emergency_signals": 16.0,
        "unresolved_historical_requests": 10.0, "infrastructure_availability": 13.0,
        "travel_distance_to_facility": 11.0, "existing_capacity_utilization": 8.0,
        "infrastructure_quality": 7.0, "population_density": 7.0,
        "demographic_vulnerability": 8.0, "population_growth": 5.0,
        "geographic_isolation": 9.0, "government_investment_adequacy": 8.0,
        "seasonal_disaster_patterns": 8.0,
    },
    "agriculture": {
        "citizen_signals": 11.0, "voice_message_mentions": 10.0,
        "semantic_pattern_repetition": 9.0, "emergency_signals": 8.0,
        "unresolved_historical_requests": 9.0, "infrastructure_availability": 13.0,
        "travel_distance_to_facility": 11.0, "existing_capacity_utilization": 9.0,
        "infrastructure_quality": 8.0, "population_density": 4.0,
        "demographic_vulnerability": 7.0, "population_growth": 5.0,
        "geographic_isolation": 10.0, "government_investment_adequacy": 10.0,
        "seasonal_disaster_patterns": 12.0,
    },
    "emergency_services": {
        "citizen_signals": 11.0, "voice_message_mentions": 9.0,
        "semantic_pattern_repetition": 8.0, "emergency_signals": 20.0,
        "unresolved_historical_requests": 10.0, "infrastructure_availability": 14.0,
        "travel_distance_to_facility": 13.0, "existing_capacity_utilization": 11.0,
        "infrastructure_quality": 7.0, "population_density": 5.0,
        "demographic_vulnerability": 9.0, "population_growth": 5.0,
        "geographic_isolation": 9.0, "government_investment_adequacy": 9.0,
        "seasonal_disaster_patterns": 10.0,
    },
}

INFRA_CATEGORIES = list(CATEGORY_SIGNAL_WEIGHTS.keys())


@dataclass
class SignalInput:
    """A single signal contributing to the Hidden Demand Index.

    All values are normalised to 0..1 where 1 = strongest evidence of unmet need.
    """
    key: str
    label: str
    raw_value: float
    normalized_value: float  # 0..1
    human_evidence: str  # plain-English evidence string shown to users


@dataclass
class HDIBreakdown:
    """Explainable decomposition of an HDI score."""
    signal: SignalInput
    weight: float
    contribution: float  # weight * normalized_value, before final scaling


@dataclass
class HDIResult:
    """The output of a single (region, category) Hidden Demand calculation."""
    region_id: str
    category: str
    score: int  # 0..100 integer
    level: DemandLevel
    reported_demand_count: int
    estimated_affected_population: int
    breakdowns: List[HDIBreakdown]
    top_factors: List[str]
    confidence: float  # 0..1
    summary: str
    recommendation: str


def classify_hdi(score: int) -> DemandLevel:
    if score <= 30:
        return DemandLevel.LOW
    if score <= 50:
        return DemandLevel.EMERGING
    if score <= 70:
        return DemandLevel.MODERATE
    if score <= 85:
        return DemandLevel.HIGH
    return DemandLevel.CRITICAL


def _select_weights(category: str) -> Dict[str, float]:
    return CATEGORY_SIGNAL_WEIGHTS.get(category.lower(), SIGNAL_WEIGHTS)


def _confidence_from_signals(signals: List[SignalInput]) -> float:
    """Confidence rises with evidence volume and consistency, capped at 0.99."""
    if not signals:
        return 0.5
    avg_norm = sum(s.normalized_value for s in signals) / len(signals)
    coverage_bonus = min(0.1, len(signals) / 50.0)
    return round(min(0.99, 0.55 + avg_norm * 0.4 + coverage_bonus), 2)


def _top_factors(breakdowns: List[HDIBreakdown], n: int = 5) -> List[str]:
    return [b.signal.human_evidence for b in sorted(
        breakdowns, key=lambda b: b.contribution, reverse=True)[:n]]


def _build_recommendation(category: str, level: DemandLevel,
                          top_factors: List[str]) -> str:
    """Generate a templated, category-specific intervention recommendation."""
    if level == DemandLevel.LOW:
        return (f"No critical {category} intervention required. "
                f"Continue monitoring for emerging signals.")
    interventions = {
        "healthcare": ("Build/upgrade a healthcare access center "
                       "+ improve emergency transport connectivity"),
        "education": ("Build/upgrade schools, recruit teachers, "
                      "+ provide digital learning access"),
        "roads": ("Upgrade rural road connectivity "
                  "+ establish all-weather access routes"),
        "water": ("Install/upgrade piped water infrastructure "
                  "+ rainwater harvesting + water-quality monitoring"),
        "electricity": ("Strengthen grid reliability, last-mile connections, "
                        "+ solar microgrids for remote pockets"),
        "internet": ("Deploy community Wi-Fi, fiber last-mile, "
                     "+ subsidized device access"),
        "public_transport": ("Add/extend bus routes, improve fleet frequency, "
                             "+ accessible stops for elderly and disabled riders"),
        "sanitation": ("Build/upgrade sanitation infrastructure, "
                       "+ waste-management systems + hygiene education"),
        "public_safety": ("Strengthen policing, surveillance, "
                          "+ community-safety programs"),
        "agriculture": ("Improve irrigation, market access, cold storage, "
                        "+ extension services for small farmers"),
        "emergency_services": ("Build/upgrade emergency response centers, "
                              "+ ambulance network + first-responder training"),
    }
    return interventions.get(category.lower(),
                             f"Targeted {category} infrastructure investment")


def calculate_hdi(
    region_id: str,
    category: str,
    signals: List[SignalInput],
    reported_demand_count: int,
    estimated_affected_population: int,
) -> HDIResult:
    """Compute the Hidden Demand Index for a (region, category) pair.

    The score is a 0–100 weighted sum that is *not* a black box:
    every contributing signal is preserved on the result so the UI
    can render evidence, and the function returns top factors plus
    a templated recommendation.
    """
    weights = _select_weights(category)
    breakdowns: List[HDIBreakdown] = []

    for s in signals:
        w = weights.get(s.key, weights.get(s.key.lower(), 5.0))
        s_norm = max(0.0, min(1.0, s.normalized_value))
        breakdowns.append(HDIBreakdown(
            signal=s, weight=w, contribution=w * s_norm))

    total_weight = sum(b.weight for b in breakdowns) or 1.0
    weighted_sum = sum(b.contribution for b in breakdowns)
    score = round((weighted_sum / total_weight) * 100)
    score = max(0, min(100, score))
    level = classify_hdi(score)
    top = _top_factors(breakdowns)
    confidence = _confidence_from_signals(signals)

    summary = (f"Reported Demand: {_reported_demand_label(reported_demand_count)}\n"
               f"Hidden Demand: {level.value.upper()}\n"
               f"HDI: {score}/100")

    recommendation = _build_recommendation(category, level, top)

    return HDIResult(
        region_id=region_id,
        category=category,
        score=score,
        level=level,
        reported_demand_count=reported_demand_count,
        estimated_affected_population=estimated_affected_population,
        breakdowns=breakdowns,
        top_factors=top,
        confidence=confidence,
        summary=summary,
        recommendation=recommendation,
    )


def _reported_demand_label(count: int) -> str:
    if count <= 25:
        return "LOW"
    if count <= 100:
        return "MODERATE"
    if count <= 300:
        return "HIGH"
    return "VERY HIGH"


# --- Normalization helpers ----------------------------------------------

def normalize_proportion(value: float) -> float:
    return max(0.0, min(1.0, value))


def normalize_inverse_proportion(value: float) -> float:
    """Higher raw value -> lower normalized value (e.g., facility availability)."""
    return max(0.0, min(1.0, 1.0 - value))


def normalize_log_scaled(value: float, ceiling: float) -> float:
    """Log-scale for values that can vary by orders of magnitude (e.g., distance)."""
    if value <= 0:
        return 0.0
    return max(0.0, min(1.0, math.log1p(value) / math.log1p(ceiling)))


def normalize_distance_km(distance_km: float) -> float:
    """Distance to nearest facility saturates at ~50km."""
    return normalize_log_scaled(distance_km, 50.0)
