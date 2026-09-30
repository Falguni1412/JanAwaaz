"""
JanAwaaz Synthetic Dataset Generator

Produces a clearly-labeled DEMO dataset for the MVP demo.
NEVER present this data as real government statistics.
"""

from __future__ import annotations

import json
import random
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, List, Tuple

random.seed(42)  # deterministic demo

# (lat, lng) anchors for 12 demo districts across India + 4 BRICS nations.
# Anchors are approximate city/district centroids - this is a demo.
GEO_ANCHORS: List[Tuple[str, str, str, float, float]] = [
    # name, country, region_type, lat, lng
    ("Rampur", "India", "Rural", 28.45, 79.45),
    ("East Godavari", "India", "Rural", 17.32, 81.79),
    ("Koderma", "India", "Tribal Belt", 24.47, 85.59),
    ("Sundarbans", "India", "Coastal-Vulnerable", 21.95, 88.85),
    ("Kupwara", "India", "Remote-Hilly", 34.53, 74.26),
    ("Vidarbha", "India", "Agrarian-Distress", 20.74, 78.60),
    ("Bengaluru Urban", "India", "Urban", 12.97, 77.59),
    ("Pune", "India", "Peri-Urban", 18.52, 73.86),
    ("Salvador", "Brazil", "Urban-Periphery", -12.97, -38.51),
    ("Manaus", "Brazil", "Remote-Amazon", -3.12, -60.02),
    ("Vladivostok", "Russia", "Remote-Far East", 43.13, 131.92),
    ("Chongqing Rural", "China", "Rural-Inland", 29.56, 106.55),
    ("Limpopo", "South Africa", "Rural", -23.90, 29.45),
    ("Cape Flats", "South Africa", "Urban-Township", -33.95, 18.55),
]

INFRA_CATEGORIES = [
    "healthcare", "education", "roads", "water", "electricity",
    "internet", "public_transport", "sanitation", "public_safety",
    "agriculture", "emergency_services",
]


@dataclass
class Region:
    id: str
    name: str
    country: str
    region_type: str
    lat: float
    lng: float
    population: int
    area_km2: float
    population_density: float  # people per km²
    population_growth_pct: float
    elderly_pct: float  # 0..1
    poverty_index: float  # 0..1 (higher = more vulnerable)
    geographic_isolation: float  # 0..1
    seasonal_disaster_exposure: float  # 0..1
    gov_investment_per_capita: float  # INR-equivalent units
    existing_facilities: Dict[str, int] = field(default_factory=dict)
    facility_capacity_utilization: Dict[str, float] = field(default_factory=dict)
    travel_distance_km: Dict[str, float] = field(default_factory=dict)
    infrastructure_quality: Dict[str, float] = field(default_factory=dict)  # 0..1


@dataclass
class CitizenSignal:
    id: str
    region_id: str
    language: str
    category: str
    text: str
    original_text: str
    intent: str
    severity: str
    is_voice: bool
    is_emergency: bool
    sentiment: str
    entities: List[str]
    timestamp: str


@dataclass
class GovernmentProject:
    id: str
    name: str
    region_id: str
    category: str
    budget_crore_inr: float
    status: str  # planned | in_progress | completed
    expected_completion: str
    planned_beneficiaries: int


def _pick_demo_stats(region_type: str) -> dict:
    """Region-type archetypes shape the demo so the narrative is consistent."""
    archetypes = {
        "Rural": dict(pop=(60_000, 250_000), growth=(3, 8), elderly=(0.10, 0.18),
                      poverty=(0.45, 0.7), isolation=(0.3, 0.6), disaster=(0.1, 0.4),
                      investment=(800, 2500)),
        "Tribal Belt": dict(pop=(40_000, 120_000), growth=(6, 14), elderly=(0.08, 0.13),
                            poverty=(0.6, 0.85), isolation=(0.6, 0.85), disaster=(0.2, 0.5),
                            investment=(500, 1500)),
        "Coastal-Vulnerable": dict(pop=(80_000, 200_000), growth=(5, 12), elderly=(0.09, 0.15),
                                    poverty=(0.5, 0.75), isolation=(0.4, 0.7),
                                    disaster=(0.6, 0.9), investment=(700, 2000)),
        "Remote-Hilly": dict(pop=(30_000, 100_000), growth=(2, 6), elderly=(0.10, 0.16),
                             poverty=(0.5, 0.8), isolation=(0.7, 0.9), disaster=(0.4, 0.7),
                             investment=(600, 1800)),
        "Agrarian-Distress": dict(pop=(150_000, 500_000), growth=(3, 7), elderly=(0.10, 0.18),
                                  poverty=(0.55, 0.8), isolation=(0.3, 0.6),
                                  disaster=(0.3, 0.6), investment=(700, 2200)),
        "Urban": dict(pop=(800_000, 1_500_000), growth=(8, 18), elderly=(0.07, 0.12),
                      poverty=(0.15, 0.4), isolation=(0.05, 0.2), disaster=(0.1, 0.3),
                      investment=(3000, 6000)),
        "Peri-Urban": dict(pop=(200_000, 600_000), growth=(10, 20), elderly=(0.07, 0.12),
                           poverty=(0.2, 0.45), isolation=(0.1, 0.3), disaster=(0.1, 0.3),
                           investment=(2000, 4500)),
        "Urban-Periphery": dict(pop=(400_000, 1_000_000), growth=(5, 12), elderly=(0.07, 0.13),
                                 poverty=(0.3, 0.6), isolation=(0.1, 0.3),
                                 disaster=(0.1, 0.3), investment=(1500, 3500)),
        "Remote-Amazon": dict(pop=(80_000, 200_000), growth=(6, 14), elderly=(0.06, 0.12),
                              poverty=(0.5, 0.8), isolation=(0.7, 0.9),
                              disaster=(0.4, 0.7), investment=(600, 1800)),
        "Remote-Far East": dict(pop=(100_000, 300_000), growth=(1, 5), elderly=(0.12, 0.20),
                                poverty=(0.2, 0.4), isolation=(0.5, 0.8),
                                disaster=(0.3, 0.6), investment=(2500, 5000)),
        "Rural-Inland": dict(pop=(200_000, 600_000), growth=(3, 8), elderly=(0.10, 0.18),
                             poverty=(0.4, 0.7), isolation=(0.4, 0.7),
                             disaster=(0.2, 0.5), investment=(1500, 3500)),
        "Urban-Township": dict(pop=(400_000, 800_000), growth=(5, 10), elderly=(0.06, 0.10),
                               poverty=(0.5, 0.8), isolation=(0.1, 0.3),
                               disaster=(0.1, 0.3), investment=(1200, 2800)),
    }
    a = archetypes.get(region_type, archetypes["Rural"])
    return {
        "pop": random.randint(*a["pop"]),
        "growth": random.uniform(*a["growth"]),
        "elderly": random.uniform(*a["elderly"]),
        "poverty": random.uniform(*a["poverty"]),
        "isolation": random.uniform(*a["isolation"]),
        "disaster": random.uniform(*a["disaster"]),
        "investment": random.uniform(*a["investment"]),
    }


def _infrastructure_for_region(region: Region) -> None:
    """Populate facility counts, capacity, distance, and quality per region.

    Rural/remote archetypes get fewer, farther, lower-quality, and more
    over-utilized facilities - this is what makes the demo HDI scores
    diverge from naive complaint counts.
    """
    is_remote = region.region_type in (
        "Tribal Belt", "Coastal-Vulnerable", "Remote-Hilly",
        "Remote-Amazon", "Remote-Far East", "Rural-Inland", "Rural",
    )
    base_facilities = 1 if is_remote else 3
    for cat in INFRA_CATEGORIES:
        count = max(0, int(random.gauss(base_facilities, 1)))
        if cat == "electricity" and not is_remote:
            count = max(count, 2)
        region.existing_facilities[cat] = count

        distance = random.uniform(2, 8) if not is_remote else random.uniform(10, 35)
        if region.region_type == "Remote-Hilly":
            distance = random.uniform(15, 45)
        if region.region_type == "Remote-Amazon":
            distance = random.uniform(20, 60)
        region.travel_distance_km[cat] = round(distance, 1)

        util = random.uniform(0.5, 0.75) if not is_remote else random.uniform(0.75, 0.98)
        region.facility_capacity_utilization[cat] = round(util, 2)

        quality = random.uniform(0.55, 0.85) if not is_remote else random.uniform(0.25, 0.6)
        region.infrastructure_quality[cat] = round(quality, 2)


def build_regions() -> List[Region]:
    regions: List[Region] = []
    for idx, (name, country, rtype, lat, lng) in enumerate(GEO_ANCHORS):
        stats = _pick_demo_stats(rtype)
        area = round(stats["pop"] / max(50, random.uniform(150, 800)), 1)
        region = Region(
            id=f"REG-{idx+1:03d}",
            name=name, country=country, region_type=rtype,
            lat=lat, lng=lng,
            population=stats["pop"],
            area_km2=area,
            population_density=round(stats["pop"] / area, 1),
            population_growth_pct=round(stats["growth"], 1),
            elderly_pct=round(stats["elderly"], 3),
            poverty_index=round(stats["poverty"], 3),
            geographic_isolation=round(stats["isolation"], 2),
            seasonal_disaster_exposure=round(stats["disaster"], 2),
            gov_investment_per_capita=round(stats["investment"], 0),
        )
        _infrastructure_for_region(region)
        regions.append(region)
    return regions


# --- Citizen signal generation ------------------------------------------

LANG_BY_COUNTRY = {
    "India": ["hi", "en", "bn", "te", "mr", "ta", "kn"],
    "Brazil": ["pt", "en"],
    "Russia": ["ru", "en"],
    "China": ["zh", "en"],
    "South Africa": ["en", "zu", "xh"],
}

VOICE_TEMPLATES = {
    "healthcare": [
        ("hi", "अस्पताल बहुत दूर है, एम्बुलेंस भी नहीं मिलती",
         "Hospital is very far, ambulance is also not available"),
        ("bn", "ডাক্তার আসেন না গ্রামে, রাতে কিছু করার নেই",
         "Doctor doesn't come to the village, nothing can be done at night"),
        ("te", "మా గ్రామంలో ప్రాథమిక ఆరోగ్య కేంద్రం లేదు",
         "There is no primary health centre in our village"),
        ("pt", "Não há médico na nossa vila, é muito longe",
         "There is no doctor in our village, it's very far"),
        ("ru", "Больница далеко, скорая не приезжает",
         "Hospital is far, ambulance doesn't come"),
    ],
    "education": [
        ("hi", "स्कूल बहुत दूर है, बच्चे सुरक्षित नहीं हैं",
         "School is very far, children are not safe"),
        ("mr", "शाळेत शिक्षक नाहीत, इमारत धोकादायक आहे",
         "No teachers in school, building is dangerous"),
        ("ta", "பள்ளி கட்டிடம் பழுதானது, ஆசிரியர்கள் இல்லை",
         "School building is broken, no teachers"),
    ],
    "roads": [
        ("hi", "सड़क टूटी हुई है, बारिश में आना-जाना बंद",
         "Road is broken, movement stops during rain"),
        ("te", "రోడ్డు బాగు లేదు, అంబులెన్స్ రావడం కష్టం",
         "Road is bad, ambulance finds it hard to come"),
        ("pt", "A estrada está destruída, não passa ambulância",
         "Road is destroyed, ambulance cannot pass"),
    ],
    "water": [
        ("hi", "पीने का पानी नहीं है, कुएं का पानी गंदा है",
         "No drinking water, well water is dirty"),
        ("kn", "ಕುಡಿಯುವ ನೀರಿಲ್ಲ, ಟ್ಯಾಂಕರ್ ಬರುತ್ತಿಲ್ಲ",
         "No drinking water, tanker is not coming"),
        ("pt", "Não tem água potável, o poço está seco",
         "No drinking water, the well is dry"),
    ],
    "electricity": [
        ("hi", "बिजली नहीं आती, पूरे दिन अंधेरा रहता है",
         "No electricity, darkness all day"),
        ("bn", "বিদ্যুৎ ঘন ঘন যায়, ফসল নষ্ট হয়",
         "Power goes out frequently, crops are spoiling"),
    ],
    "public_transport": [
        ("hi", "बस नहीं आती, रोजगार के लिए शहर नहीं जा पाते",
         "Bus doesn't come, can't go to city for work"),
        ("te", "బస్సు రోజూ రాదు, పాఠశాలకు వెళ్ళలేకపోతున్నాం",
         "Bus doesn't come daily, we can't go to school"),
    ],
    "agriculture": [
        ("hi", "सिंचाई नहीं है, फसल सूख रही है",
         "No irrigation, crop is drying up"),
        ("mr", "पावसाळी पाणी साठवण्याची सोय नाही",
         "No facility to store rainwater"),
    ],
    "sanitation": [
        ("hi", "शौचालय नहीं हैं, गंदगी से बीमारी फैलती है",
         "No toilets, disease spreads from filth"),
    ],
    "public_safety": [
        ("hi", "रात को सड़क पर अंधेरा रहता है, डर लगता है",
         "Streets are dark at night, we feel scared"),
    ],
    "internet": [
        ("hi", "इंटरनेट नहीं चलता, बच्चे पढ़ नहीं पाते",
         "Internet doesn't work, children can't study"),
    ],
    "emergency_services": [
        ("hi", "एम्बुलेंस आने में 2 घंटे लग जाते हैं",
         "Ambulance takes 2 hours to arrive"),
        ("te", "అత్యవసర సమయంలో ఆసుపత్రి చేరుకోవడం కష్టం",
         "It's hard to reach hospital in emergency"),
    ],
}


SEVERITY_KEYWORDS_EMERGENCY = [
    "emergency", "ambulance", "urgent", "तुरंत", "जल्दी", "এখনই", "అత్యవసర",
    "त्वरित", "अंबुलेंस", "रात", "night", "no doctor", "डॉक्टर नहीं",
]


def _generate_signals_for_region(region: Region) -> List[CitizenSignal]:
    signals: List[CitizenSignal] = []
    langs = LANG_BY_COUNTRY.get(region.country, ["en"])

    # Number of citizen signals inversely correlates with formal complaint
    # reporting, so the demo can show "few complaints, lots of hidden demand."
    reporting_factor = {
        "Urban": 1.0, "Peri-Urban": 0.85, "Urban-Periphery": 0.7,
        "Urban-Township": 0.55, "Rural": 0.35, "Tribal Belt": 0.18,
        "Coastal-Vulnerable": 0.25, "Remote-Hilly": 0.15,
        "Agrarian-Distress": 0.30, "Remote-Amazon": 0.12,
        "Remote-Far East": 0.45, "Rural-Inland": 0.30,
    }.get(region.region_type, 0.5)

    is_remote = region.region_type in (
        "Tribal Belt", "Coastal-Vulnerable", "Remote-Hilly", "Remote-Amazon",
    )

    for cat in INFRA_CATEGORIES:
        templates = VOICE_TEMPLATES.get(cat, [])
        if not templates:
            continue
        # 3-15 actual signals per category for remote regions, fewer otherwise
        n_signals = max(1, int(random.gauss(
            (12 if is_remote else 5) * reporting_factor, 2)))
        for i in range(n_signals):
            lang, orig, en = random.choice(templates)
            if lang not in langs:
                lang = langs[0]
            text = orig if lang != "en" else en
            lower = (orig + " " + en).lower()
            is_emergency = any(k in lower for k in SEVERITY_KEYWORDS_EMERGENCY)
            severity = "high" if is_emergency else random.choice(
                ["low", "medium", "medium", "high"])
            signals.append(CitizenSignal(
                id=f"SIG-{region.id}-{cat[:3].upper()}-{i:04d}",
                region_id=region.id,
                language=lang, category=cat, text=text, original_text=orig,
                intent="infrastructure_request",
                severity=severity, is_voice=random.random() < 0.7,
                is_emergency=is_emergency,
                sentiment=random.choice(["negative", "negative", "neutral"]),
                entities=[],  # populated by NLP layer in real system
                timestamp="2026-08-15T10:30:00Z",
            ))
    return signals


def build_government_projects(regions: List[Region]) -> List[GovernmentProject]:
    """Generate government projects - includes both 'aligned' and 'blind-spot' cases
    so the alignment dashboard has interesting data."""
    projects: List[GovernmentProject] = []
    statuses = ["planned", "in_progress", "completed"]
    for region in regions:
        # 1-3 projects per region
        n = random.randint(1, 3)
        for i in range(n):
            cat = random.choice(INFRA_CATEGORIES)
            budget = round(random.uniform(2, 25), 1)
            status = random.choice(statuses)
            projects.append(GovernmentProject(
                id=f"PROJ-{region.id}-{i:02d}",
                name=f"{region.name} {cat.title()} Initiative",
                region_id=region.id, category=cat,
                budget_crore_inr=budget, status=status,
                expected_completion="2027-03-31",
                planned_beneficiaries=int(region.population * random.uniform(0.1, 0.5)),
            ))
    return projects


def generate(out_path: Path) -> dict:
    regions = build_regions()
    all_signals: List[CitizenSignal] = []
    for r in regions:
        all_signals.extend(_generate_signals_for_region(r))
    projects = build_government_projects(regions)

    data = {
        "_notice": "DEMO / SYNTHETIC DATA - not real government statistics",
        "regions": [asdict(r) for r in regions],
        "citizen_signals": [asdict(s) for s in all_signals],
        "government_projects": [asdict(p) for p in projects],
        "summary": {
            "n_regions": len(regions),
            "n_signals": len(all_signals),
            "n_projects": len(projects),
            "n_categories": len(INFRA_CATEGORIES),
        },
    }
    out_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return data


if __name__ == "__main__":
    out = Path(__file__).parent / "demo_data.json"
    d = generate(out)
    print(f"Wrote synthetic data to {out}")
    print(f"  regions:  {d['summary']['n_regions']}")
    print(f"  signals:  {d['summary']['n_signals']}")
    print(f"  projects: {d['summary']['n_projects']}")
