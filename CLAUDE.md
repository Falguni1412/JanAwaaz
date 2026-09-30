# JanAwaaz - AI-Powered Silent Demand Intelligence

## Overview

JanAwaaz identifies infrastructure needs that are under-reported, hidden, emerging, or invisible when governments rely only on formal complaints. It combines citizen voice/text/messaging signals with demographic, infrastructure, and investment datasets to discover the difference between **Reported Demand** and **Actual/Hidden Demand**.

**One-line pitch:** "JanAwaaz doesn't ask only what citizens complain about. It discovers what communities need before the complaint becomes visible."

## Core Innovation: Hidden Demand Index (HDI)

Every region gets an explainable 0–100 score based on signals:
- Citizen requests, voice conversations, semantic patterns
- Infrastructure availability, travel distance
- Population density, demographic vulnerability
- Historical unresolved requests, emergency signals
- Government investment, infrastructure quality

Classifications: Low (0–30), Emerging (31–50), Moderate (51–70), High (71–85), Critical (86–100)

## Architecture

```
frontend/          # React + TypeScript + Tailwind + Mapbox
backend/           # FastAPI + PostgreSQL + PostGIS
data/              # Synthetic demo datasets
```

## Key Features (Priority Order)

1. **Silent Demand Engine** - Hidden Demand Index calculation with explainable evidence
2. **Geospatial Intelligence Map** - Interactive map with demand hotspots
3. **What-If Budget Simulator** - Optimized investment portfolio generator
4. **What-If Infrastructure Simulator** - Projected impact of interventions
5. **AI Recommendation Engine** - Ranked, evidence-based project recommendations
6. **Project Impact Tracker** - Before/after measurement with Infrastructure Impact Score
7. **Multilingual AI** - Voice/text in Indian languages, Portuguese, Russian, Chinese
8. **BRICS Intelligence** - Cross-country comparison and policy transfer

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Mapbox GL, Recharts
- **Backend**: FastAPI, SQLAlchemy, Pydantic
- **Database**: SQLite (demo) / PostgreSQL (production with PostGIS)
- **AI**: OpenAI/ Anthropic for NLP, sentence embeddings for semantic analysis

## Design Principles

- **Government-grade + modern AI intelligence** - clean, credible, professional
- **Explainable AI** - every recommendation includes evidence
- **Privacy-first** - no PII on public dashboards
- **Multilingual** - non-English-first citizen interface

## Demo Data

All data is clearly labeled as **DEMO / SYNTHETIC DATA**. Never present synthetic numbers as real government statistics.

## Killer Demo Scenario

**District X** has only 18 healthcare complaints (low reported demand).
JanAwaaz discovers:
- Average hospital distance: 18 km
- High elderly population
- 14% population growth
- 37 emergency signals
- Existing facility near capacity

**Hidden Demand: 94/100 (Critical)**

Recommendation: Healthcare Access Center + Emergency Transport Hub

---

*Don't count complaints. Discover unmet needs.*
