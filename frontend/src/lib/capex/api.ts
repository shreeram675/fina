import type {
  AnalyzeRequest,
  AnalyzeResult,
  BondRequest,
  BondResult,
  CompanyFundamentals,
  CompareRow,
} from "./types";
import { COMPANIES } from "./companies";
import { analyze, compareAll, valueBond } from "./engine";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const BACKEND_TO_TICKER: Record<string, string> = {
  TCS: "TCS",
  Infosys: "INFY",
  "Reliance Industries": "RELIANCE",
  "HDFC Bank": "HDFCBANK",
  Wipro: "WIPRO",
  "Tata Steel": "TATASTEEL",
  "Sun Pharma": "SUNPHARMA",
  "Maruti Suzuki": "MARUTI",
  ONGC: "ONGC",
  "Asian Paints": "ASIANPAINT",
};

const TICKER_TO_BACKEND = Object.fromEntries(
  Object.entries(BACKEND_TO_TICKER).map(([backend, ticker]) => [ticker, backend]),
) as Record<string, string>;

type BackendCompanies = {
  companies: Record<
    string,
    {
      sector: string;
      revenue_cr: number;
      net_margin: number;
      de_ratio: number;
      beta: number;
      roce: number;
    }
  >;
};

type BackendAnalyze = {
  company: {
    name: string;
    sector: string;
    revenue_cr: number;
    net_margin: number;
    de_ratio: number;
    beta: number;
    roce: number;
    current_ratio: number;
    interest_coverage: number;
  };
  capital_budgeting: {
    investment_cr: number;
    wacc_pct: number;
    horizon_years: number;
    npv_cr: number;
    irr_pct: number;
    payback_years: number;
    bcr: number;
    cashflows_cr: number[];
    npv_sensitivity: { rate_pct: number; npv_cr: number }[];
  };
  ml_verdict: {
    label: "INVEST" | "CAUTION" | "AVOID";
    confidence: number;
    reason: string;
    insights: { color: string; text: string }[];
    feature_importance: { name: string; value: number }[];
  };
};

type BackendBond = {
  inputs: {
    coupon_pct: number;
    market_yield_pct: number;
    tenor_years: number;
  };
  results: {
    price: number;
    modified_duration: number;
    convexity: number;
    trading_at: "Premium" | "Discount";
    premium_discount: number;
  };
  price_yield_curve: {
    yields: number[];
    prices: number[];
  };
};

type BackendCompare = {
  companies: {
    company: string;
    sector: string;
    revenue_cr: number;
    net_margin_pct: number;
    npv_cr: number;
    irr_pct: number;
    payback_years: number;
    bcr: number;
    verdict: "INVEST" | "CAUTION" | "AVOID";
    confidence_pct: number;
  }[];
};

async function tryFetch<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${url}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// Small artificial latency so loading states are visible in the demo.
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function verdictFromBackend(label: "INVEST" | "CAUTION" | "AVOID") {
  if (label === "INVEST") return "Invest";
  if (label === "CAUTION") return "Caution";
  return "Avoid";
}

function companyFromBackend(name: string, data: BackendAnalyze["company"] | BackendCompanies["companies"][string]) {
  const ticker = BACKEND_TO_TICKER[name] ?? name;
  const local = COMPANIES.find((c) => c.ticker === ticker || c.name === name);

  return {
    ticker,
    name: local?.name ?? name,
    sector: data.sector,
    revenue: data.revenue_cr,
    netMargin: data.net_margin,
    debtEquity: data.de_ratio,
    beta: data.beta,
    roce: data.roce,
    currentRatio: "current_ratio" in data ? data.current_ratio : (local?.currentRatio ?? 1),
    interestCoverage:
      "interest_coverage" in data ? data.interest_coverage : (local?.interestCoverage ?? 1),
    returnOnNewCapital: local?.returnOnNewCapital ?? Math.max(6, Math.min(24, data.roce / 2)),
    cashflowGrowth: local?.cashflowGrowth ?? 7,
  };
}

function adaptAnalyze(remote: BackendAnalyze, req: AnalyzeRequest): AnalyzeResult {
  const cb = remote.capital_budgeting;
  const verdict = verdictFromBackend(remote.ml_verdict.label);
  const cashflows = cb.cashflows_cr.slice(1).map((cashflow, i) => {
    const year = i + 1;
    const discounted = cashflow / Math.pow(1 + cb.wacc_pct / 100, year);
    const cumulative = cb.cashflows_cr.slice(0, year + 1).reduce((sum, cf) => sum + cf, 0);
    return { year, cashflow, discounted, cumulative };
  });

  return {
    company: companyFromBackend(remote.company.name, remote.company),
    request: {
      ...req,
      company: BACKEND_TO_TICKER[remote.company.name] ?? req.company,
      investment: cb.investment_cr,
      wacc: cb.wacc_pct,
      horizon: cb.horizon_years,
    },
    npv: cb.npv_cr,
    irr: cb.irr_pct,
    payback: Number.isFinite(cb.payback_years) ? cb.payback_years : null,
    bcr: cb.bcr,
    verdict,
    confidence: remote.ml_verdict.confidence,
    cashflows,
    sensitivity: cb.npv_sensitivity.map((p) => ({ wacc: p.rate_pct, npv: p.npv_cr })),
    features: remote.ml_verdict.feature_importance.map((f) => ({
      feature: f.name,
      weight: f.value,
      direction: "positive",
    })),
    insights: remote.ml_verdict.insights.map((i) => i.text),
  };
}

function adaptBond(remote: BackendBond, req: BondRequest): BondResult {
  const face = req.face ?? 1000;
  const price = (remote.results.price / 100) * face;
  const curve = remote.price_yield_curve.yields.map((y, i) => ({
    yield: y,
    price: (remote.price_yield_curve.prices[i] / 100) * face,
  }));

  return {
    request: { ...req, face },
    price,
    premiumDiscount: remote.results.trading_at,
    macaulayDuration: remote.results.modified_duration * (1 + req.yield / 100),
    modifiedDuration: remote.results.modified_duration,
    currentYield: (req.coupon / price) * face,
    curve,
  };
}

export async function fetchCompanies(): Promise<CompanyFundamentals[]> {
  const remote = await tryFetch<BackendCompanies>("/api/companies");
  if (remote) {
    return Object.entries(remote.companies).map(([name, data]) => companyFromBackend(name, data));
  }
  await delay(250);
  return COMPANIES;
}

export async function postAnalyze(req: AnalyzeRequest): Promise<AnalyzeResult> {
  const backendReq = { ...req, company: TICKER_TO_BACKEND[req.company] ?? req.company };
  const remote = await tryFetch<BackendAnalyze>("/api/analyze", {
    method: "POST",
    body: JSON.stringify(backendReq),
  });
  if (remote) return adaptAnalyze(remote, req);
  await delay(700);
  if (req.investment <= 0 || req.wacc <= 0 || req.horizon <= 0) {
    throw new Error("Investment, WACC and horizon must be greater than zero.");
  }
  return analyze(req);
}

export async function postBond(req: BondRequest): Promise<BondResult> {
  const remote = await tryFetch<BackendBond>("/api/bond", {
    method: "POST",
    body: JSON.stringify(req),
  });
  if (remote) return adaptBond(remote, req);
  await delay(550);
  if (req.tenor <= 0) throw new Error("Tenor must be at least 1 year.");
  return valueBond(req);
}

export async function fetchCompare(): Promise<CompareRow[]> {
  const remote = await tryFetch<BackendCompare>("/api/compare");
  if (remote) {
    return remote.companies.map((row) => {
      const ticker = BACKEND_TO_TICKER[row.company] ?? row.company;
      const local = COMPANIES.find((c) => c.ticker === ticker || c.name === row.company);
      return {
        ticker,
        name: local?.name ?? row.company,
        sector: row.sector,
        verdict: verdictFromBackend(row.verdict),
        npv: row.npv_cr,
        irr: row.irr_pct,
        bcr: row.bcr,
        payback: Number.isFinite(row.payback_years) ? row.payback_years : null,
        confidence: row.confidence_pct,
      };
    });
  }
  await delay(500);
  return compareAll();
}
