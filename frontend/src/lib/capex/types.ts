export type Verdict = "Invest" | "Caution" | "Avoid";

export interface CompanyFundamentals {
  ticker: string;
  name: string;
  sector: string;
  revenue: number; // ₹ Cr (FY)
  netMargin: number; // %
  debtEquity: number; // ratio
  beta: number;
  roce: number; // %
  currentRatio: number;
  interestCoverage: number;
  /** Expected unlevered annual return the company can earn on new capital, % */
  returnOnNewCapital: number;
  /** Expected annual growth of project cashflows, % */
  cashflowGrowth: number;
}

export interface AnalyzeRequest {
  company: string;
  investment: number; // ₹ Cr
  wacc: number; // %
  horizon: number; // years
}

export interface CashflowPoint {
  year: number;
  cashflow: number;
  discounted: number;
  cumulative: number;
}

export interface SensitivityPoint {
  wacc: number;
  npv: number;
}

export interface FeatureImportance {
  feature: string;
  weight: number; // 0..1 contribution
  direction: "positive" | "negative";
}

export interface AnalyzeResult {
  company: CompanyFundamentals;
  request: AnalyzeRequest;
  npv: number; // ₹ Cr
  irr: number; // %
  payback: number | null; // years (null if never)
  bcr: number; // benefit cost ratio
  verdict: Verdict;
  confidence: number; // 0..100
  cashflows: CashflowPoint[];
  sensitivity: SensitivityPoint[];
  features: FeatureImportance[];
  insights: string[];
}

export interface BondRequest {
  coupon: number; // %
  yield: number; // %
  tenor: number; // years
  face?: number; // face value, default 1000
}

export interface BondCurvePoint {
  yield: number;
  price: number;
}

export interface BondResult {
  request: BondRequest;
  price: number;
  premiumDiscount: "Premium" | "Discount" | "Par";
  macaulayDuration: number;
  modifiedDuration: number;
  currentYield: number;
  curve: BondCurvePoint[];
}

export interface CompareRow {
  ticker: string;
  name: string;
  sector: string;
  verdict: Verdict;
  npv: number;
  irr: number;
  bcr: number;
  payback: number | null;
  confidence: number;
}
