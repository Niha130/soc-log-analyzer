# SOC Log Analyzer & Threat Alert System

**Author:** [Niha130](https://github.com/Niha130)

A full-stack Security Operations Center (SOC) platform for real-time log analysis, threat detection, and alert management.

---

## Features

- **Live Dashboard** — Real-time event volume charts, severity distribution, active threat feed
- **Log Analyzer** — Filterable, searchable live log stream with raw log expansion
- **Alert System** — Triaged alert queue with status management (Open → Investigating → Resolved)
- **Threat Intelligence** — IOC feed (IPs, domains, hashes, URLs, emails) with hit tracking
- **Data Sources** — Live throughput monitoring for SIEM, Firewall, IDS, EDR, Proxy, DNS, Cloud

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Python + FastAPI |
| Fonts | JetBrains Mono + Inter |

---

## Getting Started

### Frontend

```bash
npm install
npm run dev
# → http://localhost:3000
```

### Backend (optional)

```bash
pip install fastapi uvicorn pydantic
python server.py
# → http://localhost:8000
# → Docs: http://localhost:8000/docs
```

The Vite dev server proxies `/api` to the Python backend automatically.

---

## Project Structure

```
soc-log-analyzer/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx       # Overview with charts
│   │   ├── LogAnalyzer.tsx     # Live log stream
│   │   ├── AlertSystem.tsx     # Alert triage & management
│   │   ├── ThreatIntelligence.tsx  # IOC feed
│   │   └── DataSources.tsx     # Source health monitoring
│   ├── hooks/
│   │   └── useLiveLogs.ts      # Live data simulation hook
│   ├── types/
│   │   └── index.ts            # All TypeScript interfaces
│   ├── utils/
│   │   └── mockData.ts         # Data generators & constants
│   ├── App.tsx                 # Root with tab navigation
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles + Tailwind
├── server.py                   # FastAPI backend
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## Git Setup

```bash
git init
git add .
git commit -m "Initial commit — SOC Analyzer by Niha130"
git remote add origin https://github.com/Niha130/soc-log-analyzer.git
git branch -M main
git push -u origin main
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/logs` | Fetch logs (filterable) |
| POST | `/api/logs/generate` | Generate synthetic log |
| POST | `/api/logs/ingest` | Ingest external log |
| GET | `/api/alerts` | Fetch alerts |
| PUT | `/api/alerts/{id}/status` | Update alert status |
| POST | `/api/threat/check` | Check IOC against threat feed |
| GET | `/api/stats` | Aggregated statistics |
