"""
Data loader - loads and caches the synthetic demo dataset.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Dict, List, Optional

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "synthetic" / "demo_data.json"


def load_demo_data() -> dict:
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


# In-memory cache
_data: Optional[dict] = None


def get_data() -> dict:
    global _data
    if _data is None:
        _data = load_demo_data()
    return _data


def get_regions() -> List[dict]:
    return get_data()["regions"]


def get_signals() -> List[dict]:
    return get_data()["citizen_signals"]


def get_projects() -> List[dict]:
    return get_data()["government_projects"]


def signals_by_region_cat(region_id: str, category: str) -> List[dict]:
    return [
        s for s in get_signals()
        if s["region_id"] == region_id and s["category"] == category
    ]


def region_by_id(region_id: str) -> Optional[dict]:
    for r in get_regions():
        if r["id"] == region_id:
            return r
    return None


def _inverse_log_scale(value: float, ceiling: float) -> float:
    """Map a log-scaled distance back to a 0..1 proximity score."""
    if value <= 0:
        return 1.0
    return max(0.0, min(1.0, 1.0 - math.log1p(value) / math.log1p(ceiling)))
