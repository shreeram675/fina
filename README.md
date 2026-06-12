# CapEx IQ

CapEx IQ is an AI-powered capital budgeting analyzer for major Indian companies. It combines standard finance calculations, FinancePy bond valuation, and a Random Forest verdict model with an explainable React dashboard.

## Features

- Capital budgeting metrics: NPV, IRR, payback period, and benefit-cost ratio
- FinancePy bond valuation with price, duration, convexity, and price-yield curve
- Random Forest investment verdict: Invest, Caution, or Avoid
- Explainable feature importance chart
- Company comparison table for Indian blue-chip companies
- Professional React dashboard with charts and 3D finance visuals

## Backend

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

The Flask API runs at:

```text
http://127.0.0.1:5000
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

The React app runs at:

```text
http://127.0.0.1:5173
```

During local development, Vite proxies `/api` requests to the Flask backend.

## Main API Routes

- `GET /api/companies`
- `POST /api/analyze`
- `POST /api/bond`
- `GET /api/compare`
