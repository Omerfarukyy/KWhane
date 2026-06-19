# KWhane

**AI-powered home energy monitoring for Turkish households.**

KWhane lets users build a 3D replica of their home, drop in appliances, and instantly see per-device kWh predictions, monthly cost breakdowns, and personalized savings recommendations — all powered by machine learning. A Turkish-speaking AI energy advisor ties the experience together.

> **kWh + hane (household)** = **KWhane**

Built as a senior capstone project by [Ömer Faruk Yılmaz](https://github.com/omerfarukyilmazz).

---

## What It Does

- **3D Home Simulation** — Build rooms, place devices with drag-and-drop, see energy badges float above each appliance in real time (React Three Fiber)
- **ML Energy Prediction** — GradientBoosting model predicts monthly kWh per device, accounting for duty cycle, efficiency class (A+++ to G), device age degradation, and Turkey's tiered electricity tariff
- **Peer Comparison** — K-Means clustering groups similar households; see how your consumption stacks up against neighbors with comparable setups
- **AI Energy Advisor** — Chat with a Turkish-speaking LLM (Llama 3.2 via Ollama) that knows your home's exact data: devices, costs, recommendations, and bill history
- **Smart Savings** — Rule-based scoring engine generates actionable recommendations: standby reduction via smart plugs, usage optimization, device upgrades
- **Bill Diagnostics** — Import your real electricity bill, calibrate predictions against actual usage, and track accuracy over time
- **TR/EN Bilingual** — Full Turkish and English language support across the entire interface

---

## Architecture

```
┌──────────────────────────┐         ┌─────────────────────────────────┐
│ React + Three.js         │  ⇄      │ Supabase                        │
│ Frontend (Vite)          │  axios   │ PostgreSQL + Auth + RLS         │
│  - 3D Simulation (R3F)   │         │  - homes / rooms / devices      │
│  - Dashboard UI          │         │  - device_calculations          │
│  - AI Assistant chat     │         │  - device_comparisons           │
└────────┬─────────────────┘         │  - recommendations / tickets    │
         │                           └────────────┬────────────────────┘
         │ /chat                                  │ INSERT trigger
         ▼                                        ▼
┌──────────────────────────┐         ┌─────────────────────────────────┐
│ FastAPI ML Backend       │  ←──────│ n8n Workflow                    │
│ (Python)                 │         │  - Triggers on device INSERT    │
│  /calculate              │         │  - Calls /calculate → /compare  │
│  /compare                │         │    → /savings sequentially      │
│  /savings  /chat /health │         │  - Writes results to Supabase   │
└────┬─────────────┬───────┘         └─────────────────────────────────┘
     │             │
     ▼             ▼
[scikit-learn]  [Ollama Llama 3.2 (local)]
 - GBR          - Turkish energy advisor
 - KMeans       - OpenAI-compatible API
```

When a user places a device in the 3D scene → frontend inserts to Supabase → n8n webhook triggers → ML backend calculates kWh, clusters the household, and generates savings tips → results flow back via Supabase Realtime.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Zustand, React Three Fiber, Drei |
| **Backend** | FastAPI, scikit-learn (GBR + KMeans), Pydantic v2 |
| **Database** | Supabase (PostgreSQL + Auth + Row Level Security + Realtime) |
| **LLM** | Ollama with Llama 3.2 (local), Groq cloud fallback |
| **Automation** | n8n (webhook-driven pipeline orchestration) |
| **Language** | JavaScript (JSX), Python |

---

## Project Structure

```
KWhane/
├── frontend/                    # React + Vite + R3F
│   └── src/
│       ├── components/
│       │   ├── Simulation3D/    # 3D scene: rooms, devices, wiring, lights
│       │   └── Dashboard/       # UI panels: AI chat, bills, suggestions, tickets
│       ├── store/               # Zustand state (useSceneStore)
│       ├── services/            # API + Supabase CRUD
│       ├── contexts/            # Auth, Theme, Language providers
│       └── pages/               # Route pages
├── ML-python/                   # FastAPI + ML
│   ├── ml/                      # Trained models (GBR, KMeans, savings scorer)
│   ├── services/                # Business logic (calculate, compare, chat, tariff)
│   ├── data/                    # Device profiles + synthetic data generator
│   ├── models/                  # Pydantic API schemas
│   ├── main.py                  # FastAPI entrypoint (5 endpoints)
│   └── n8n-workflow.json        # Automation workflow (import to n8n)
└── supabase/
    └── migrations/              # DB schema + RLS policies
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- [Ollama](https://ollama.ai) (for the AI advisor)
- [Supabase](https://supabase.com) project (free tier works)
- [n8n](https://n8n.io) instance (self-hosted or cloud)

### 1. Backend

```bash
cd ML-python
pip install -r requirements.txt
uvicorn main:app --reload          # http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                         # http://localhost:5173
```

### 3. Local LLM

```bash
ollama serve
ollama pull llama3.2
```

### 4. Database

Run the migration files in `supabase/migrations/` sequentially in your Supabase SQL Editor (`001_*` → `002_*` → ...).

### Environment Variables

**Frontend** (`frontend/.env`):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Backend** (`ML-python/.env`):
```
supabase_url=https://xxx.supabase.co
supabase_service_key=eyJ...
model_dir=./trained_models
retrain_on_startup=false
ollama_base_url=http://localhost:11434/v1
llama_model=llama3.2
```

---

## How the ML Works

1. **Synthetic training data** — 5,000 physics-informed samples generated from device profiles (nominal wattage ranges, duty cycles, efficiency classes, age curves)
2. **GradientBoostingRegressor** (200 estimators, max_depth=5) predicts monthly kWh from device features
3. **Turkey's tiered tariff** converts kWh to cost (lower tier ~1.50 ₺/kWh, upper tier ~2.30 ₺/kWh)
4. **K-Means clustering** (k=5) groups households by consumption patterns for peer comparison
5. **Savings scorer** generates recommendations: standby reduction, usage optimization, device upgrades
6. **Bill calibration** — users can input their real electricity bill to calibrate and validate predictions

---

## Supported Devices

```
fridge, washing_machine, dishwasher, oven, ac,
tv, computer, lighting, water_heater, dryer
```

Each device type has profiles covering nominal power ranges, duty cycles, efficiency classes (A+++ through G), and age-based degradation (+1.5%/year).

---

## License

[MIT](LICENSE) &copy; 2026 Ömer Faruk Yılmaz
