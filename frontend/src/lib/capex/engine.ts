import type {
  AnalyzeRequest,
  AnalyzeResult,
  BondRequest,
  BondResult,
  CashflowPoint,
  CompanyFundamentals,
  CompareRow,
  FeatureImportance,
  SensitivityPoint,
  Verdict,
} from "./types";
import { COMPANIES, getCompany } from "./companies";

/** Build annual project cashflows from company fundamentals. */
function buildCashflows(c: CompanyFundamentals, investment: number, horizon: number) {
  const base = investment * (c.returnOnNewCapital / 100);
  const g = c.cashflowGrowth / 100;
  const flows: number[] = [];
  for (let t = 1; t <= horizon; t++) {
    flows.push(base * Math.pow(1 + g, t - 1));
  }
  return flows;
}

function npvOf(investment: number, flows: number[], rate: number) {
  return flows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i + 1), -investment);
}

function computeIrr(investment: number, flows: number[]): number {
  let lo = -0.9;
  let hi = 2;
  const f = (r: number) => npvOf(investment, flows, r);
  if (f(lo) * f(hi) > 0) {
    // No sign change — fall back to scanning for closest-to-zero
    let best = lo;
    let bestAbs = Infinity;
    for (let r = -0.9; r <= 2; r += 0.001) {
      const v = Math.abs(f(r));
      if (v < bestAbs) {
        bestAbs = v;
        best = r;
      }
    }
    return best * 100;
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const v = f(mid);
    if (Math.abs(v) < 1e-6) return mid * 100;
    if (f(lo) * v < 0) hi = mid;
    else lo = mid;
  }
  return ((lo + hi) / 2) * 100;
}

function computePayback(investment: number, flows: number[]): number | null {
  let cum = 0;
  for (let i = 0; i < flows.length; i++) {
    const prev = cum;
    cum += flows[i];
    if (cum >= investment) {
      const remaining = investment - prev;
      return i + remaining / flows[i];
    }
  }
  return null;
}

function scoreVerdict(c: CompanyFundamentals, npv: number, irr: number, wacc: number, bcr: number) {
  // Weighted feature contributions (each maps to a 0..1 signal).
  const irrSpread = (irr - wacc) / 12; // normalize ~12% spread
  const features: { feature: string; raw: number; weight: number }[] = [
    { feature: "NPV (value creation)", raw: clamp01(0.5 + npv / Math.max(1, Math.abs(npv) + 200)), weight: 0.3 },
    { feature: "IRR vs WACC spread", raw: clamp01(0.5 + irrSpread), weight: 0.25 },
    { feature: "Benefit-Cost Ratio", raw: clamp01((bcr - 0.8) / 0.6), weight: 0.15 },
    { feature: "ROCE quality", raw: clamp01(c.roce / 40), weight: 0.12 },
    { feature: "Leverage (D/E)", raw: clamp01(1 - c.debtEquity / 1.5), weight: 0.1 },
    { feature: "Interest coverage", raw: clamp01(c.interestCoverage / 25), weight: 0.08 },
  ];

  const total = features.reduce((a, f) => a + f.weight, 0);
  const score = features.reduce((a, f) => a + f.raw * f.weight, 0) / total; // 0..1

  const importance: FeatureImportance[] = features
    .map((f) => ({
      feature: f.feature,
      weight: (f.raw * f.weight) / score / total,
      direction: (f.raw >= 0.5 ? "positive" : "negative") as "positive" | "negative",
    }))
    .sort((a, b) => b.weight - a.weight);

  let verdict: Verdict = "Avoid";
  if (score >= 0.62 && npv > 0 && irr > wacc) verdict = "Invest";
  else if (score >= 0.45 && npv > -investmentGuard) verdict = "Caution";

  const confidence = Math.round(40 + score * 58);
  return { verdict, confidence: clamp(confidence, 5, 99), features: importance, score };
}

const investmentGuard = 0; // npv threshold reference for caution band

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function buildInsights(
  c: CompanyFundamentals,
  npv: number,
  irr: number,
  wacc: number,
  bcr: number,
  verdict: Verdict,
): string[] {
  const out: string[] = [];
  out.push(
    npv >= 0
      ? `Positive NPV of ₹${npv.toFixed(0)} Cr — the project is expected to create shareholder value above the cost of capital.`
      : `Negative NPV of ₹${npv.toFixed(0)} Cr — projected returns fall short of the ${wacc}% hurdle rate, destroying value.`,
  );
  out.push(
    irr >= wacc
      ? `IRR of ${irr.toFixed(1)}% exceeds the ${wacc}% WACC by ${(irr - wacc).toFixed(1)} pts, signalling a healthy risk-adjusted margin.`
      : `IRR of ${irr.toFixed(1)}% is below the ${wacc}% WACC, so the investment underperforms its financing cost.`,
  );
  out.push(
    c.debtEquity <= 0.5
      ? `Low leverage (D/E ${c.debtEquity.toFixed(2)}) and interest coverage of ${c.interestCoverage.toFixed(1)}x give ${c.name} ample balance-sheet room to fund this capex.`
      : `Elevated leverage (D/E ${c.debtEquity.toFixed(2)}) adds financial risk and constrains incremental capex flexibility.`,
  );
  out.push(
    c.roce >= 18
      ? `Strong ROCE of ${c.roce.toFixed(1)}% shows ${c.name} historically compounds capital efficiently, reinforcing the ${verdict.toLowerCase()} stance.`
      : `Moderate ROCE of ${c.roce.toFixed(1)}% suggests incremental capital earns thinner returns, tempering conviction.`,
  );
  return out;
}

export function analyze(req: AnalyzeRequest): AnalyzeResult {
  const company = getCompany(req.company) ?? COMPANIES[0];
  const rate = req.wacc / 100;
  const rawFlows = buildCashflows(company, req.investment, req.horizon);

  let cum = -req.investment;
  const cashflows: CashflowPoint[] = rawFlows.map((cf, i) => {
    const discounted = cf / Math.pow(1 + rate, i + 1);
    cum += cf;
    return { year: i + 1, cashflow: cf, discounted, cumulative: cum };
  });

  const npv = npvOf(req.investment, rawFlows, rate);
  const irr = computeIrr(req.investment, rawFlows);
  const payback = computePayback(req.investment, rawFlows);
  const pvInflows = rawFlows.reduce((a, cf, i) => a + cf / Math.pow(1 + rate, i + 1), 0);
  const bcr = pvInflows / req.investment;

  const { verdict, confidence, features } = scoreVerdict(company, npv, irr, req.wacc, bcr);

  const sensitivity: SensitivityPoint[] = [];
  for (let w = Math.max(2, req.wacc - 6); w <= req.wacc + 8; w += 1) {
    sensitivity.push({ wacc: w, npv: npvOf(req.investment, rawFlows, w / 100) });
  }

  const insights = buildInsights(company, npv, irr, req.wacc, bcr, verdict);

  return {
    company,
    request: req,
    npv,
    irr,
    payback,
    bcr,
    verdict,
    confidence,
    cashflows,
    sensitivity,
    features,
    insights,
  };
}

export function valueBond(req: BondRequest): BondResult {
  const face = req.face ?? 1000;
  const priceAt = (y: number) => {
    const r = y / 100;
    const cpn = (req.coupon / 100) * face;
    let p = 0;
    for (let t = 1; t <= req.tenor; t++) p += cpn / Math.pow(1 + r, t);
    p += face / Math.pow(1 + r, req.tenor);
    return p;
  };

  const price = priceAt(req.yield);
  const r = req.yield / 100;
  const cpn = (req.coupon / 100) * face;

  let weightedPv = 0;
  for (let t = 1; t <= req.tenor; t++) weightedPv += (t * cpn) / Math.pow(1 + r, t);
  weightedPv += (req.tenor * face) / Math.pow(1 + r, req.tenor);
  const macaulayDuration = weightedPv / price;
  const modifiedDuration = macaulayDuration / (1 + r);
  const currentYield = (cpn / price) * 100;

  const premiumDiscount = price > face + 0.5 ? "Premium" : price < face - 0.5 ? "Discount" : "Par";

  const curve: BondCurvePointBuild[] = [];
  const lo = Math.max(0.5, req.yield - 5);
  const hi = req.yield + 5;
  for (let y = lo; y <= hi + 1e-9; y += 0.5) {
    curve.push({ yield: Math.round(y * 10) / 10, price: priceAt(y) });
  }

  return {
    request: { ...req, face },
    price,
    premiumDiscount,
    macaulayDuration,
    modifiedDuration,
    currentYield,
    curve,
  };
}

type BondCurvePointBuild = { yield: number; price: number };

export function compareAll(
  investment = 500,
  wacc = 10,
  horizon = 5,
): CompareRow[] {
  return COMPANIES.map((c) => {
    const r = analyze({ company: c.ticker, investment, wacc, horizon });
    return {
      ticker: c.ticker,
      name: c.name,
      sector: c.sector,
      verdict: r.verdict,
      npv: r.npv,
      irr: r.irr,
      bcr: r.bcr,
      payback: r.payback,
      confidence: r.confidence,
    };
  }).sort((a, b) => b.npv - a.npv);
}
