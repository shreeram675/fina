import os
os.environ.setdefault(
    "MPLCONFIGDIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache", "matplotlib"),
)
os.makedirs(os.environ["MPLCONFIGDIR"], exist_ok=True)

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import warnings
warnings.filterwarnings('ignore')

from financepy.utils import *
from financepy.products.bonds import Bond

# ── Real NSE company data (representative figures, ₹ Crore) ──────────────────
COMPANIES = {
    "TCS": {
        "sector": "IT Services",
        "revenue_cr": 240893,
        "ebitda_margin": 0.28,
        "net_margin": 0.196,
        "de_ratio": 0.07,
        "beta": 0.72,
        "roce": 0.51,
        "growth_rate": 0.12,
        "capex_intensity": 0.022,
        "current_ratio": 3.1,
        "interest_coverage": 45.0,
    },
    "Infosys": {
        "sector": "IT Services",
        "revenue_cr": 153670,
        "ebitda_margin": 0.245,
        "net_margin": 0.175,
        "de_ratio": 0.05,
        "beta": 0.78,
        "roce": 0.42,
        "growth_rate": 0.10,
        "capex_intensity": 0.018,
        "current_ratio": 2.8,
        "interest_coverage": 52.0,
    },
    "Reliance Industries": {
        "sector": "Conglomerate",
        "revenue_cr": 974864,
        "ebitda_margin": 0.175,
        "net_margin": 0.072,
        "de_ratio": 0.45,
        "beta": 1.02,
        "roce": 0.12,
        "growth_rate": 0.09,
        "capex_intensity": 0.08,
        "current_ratio": 1.2,
        "interest_coverage": 8.5,
    },
    "HDFC Bank": {
        "sector": "Banking",
        "revenue_cr": 220000,
        "ebitda_margin": 0.40,
        "net_margin": 0.23,
        "de_ratio": 6.8,
        "beta": 0.88,
        "roce": 0.18,
        "growth_rate": 0.14,
        "capex_intensity": 0.005,
        "current_ratio": 1.0,
        "interest_coverage": 3.2,
    },
    "Wipro": {
        "sector": "IT Services",
        "revenue_cr": 89620,
        "ebitda_margin": 0.172,
        "net_margin": 0.131,
        "de_ratio": 0.10,
        "beta": 0.68,
        "roce": 0.23,
        "growth_rate": 0.07,
        "capex_intensity": 0.020,
        "current_ratio": 2.6,
        "interest_coverage": 38.0,
    },
    "Tata Steel": {
        "sector": "Metals & Mining",
        "revenue_cr": 237254,
        "ebitda_margin": 0.12,
        "net_margin": 0.025,
        "de_ratio": 1.42,
        "beta": 1.55,
        "roce": 0.09,
        "growth_rate": 0.06,
        "capex_intensity": 0.065,
        "current_ratio": 1.05,
        "interest_coverage": 3.8,
    },
    "Sun Pharma": {
        "sector": "Pharmaceuticals",
        "revenue_cr": 48000,
        "ebitda_margin": 0.265,
        "net_margin": 0.185,
        "de_ratio": 0.08,
        "beta": 0.62,
        "roce": 0.195,
        "growth_rate": 0.11,
        "capex_intensity": 0.04,
        "current_ratio": 2.5,
        "interest_coverage": 28.0,
    },
    "Maruti Suzuki": {
        "sector": "Automobiles",
        "revenue_cr": 141800,
        "ebitda_margin": 0.12,
        "net_margin": 0.085,
        "de_ratio": 0.03,
        "beta": 0.90,
        "roce": 0.20,
        "growth_rate": 0.08,
        "capex_intensity": 0.04,
        "current_ratio": 1.8,
        "interest_coverage": 22.0,
    },
    "ONGC": {
        "sector": "Oil & Gas",
        "revenue_cr": 163600,
        "ebitda_margin": 0.30,
        "net_margin": 0.095,
        "de_ratio": 0.28,
        "beta": 1.18,
        "roce": 0.13,
        "growth_rate": 0.04,
        "capex_intensity": 0.12,
        "current_ratio": 1.1,
        "interest_coverage": 9.0,
    },
    "Asian Paints": {
        "sector": "Consumer Goods",
        "revenue_cr": 36500,
        "ebitda_margin": 0.18,
        "net_margin": 0.135,
        "de_ratio": 0.05,
        "beta": 0.55,
        "roce": 0.48,
        "growth_rate": 0.09,
        "capex_intensity": 0.035,
        "current_ratio": 2.2,
        "interest_coverage": 34.0,
    },
}


def get_company_data(company: str) -> dict:
    return COMPANIES[company].copy()


def _irr(cashflows: list, guess: float = 0.1) -> float:
    """Newton-Raphson IRR solver."""
    r = guess
    for _ in range(200):
        npv   = sum(cf / (1 + r) ** t for t, cf in enumerate(cashflows))
        d_npv = sum(-t * cf / (1 + r) ** (t + 1) for t, cf in enumerate(cashflows))
        if abs(d_npv) < 1e-12:
            break
        r_new = r - npv / d_npv
        if abs(r_new - r) < 1e-9:
            r = r_new
            break
        r = r_new
    return max(min(r, 2.0), -0.99)


def compute_capital_budgeting(data: dict, investment: float,
                               wacc: float, horizon: int) -> dict:
    g  = data["growth_rate"]
    em = data["ebitda_margin"]

    # Project annual operating cash flows from EBITDA margin × modeled revenue
    base_revenue = data["revenue_cr"] * 1e7
    cashflows = [-investment]
    for yr in range(1, horizon + 1):
        rev_yr = base_revenue * (1 + g) ** yr
        ebitda = rev_yr * em
        # FCF proxy: EBITDA × (1 - tax) - capex reinvestment × investment size
        fcf = ebitda * 0.75 - investment * data["capex_intensity"]
        # Scale to project size (investment as fraction of company revenue)
        scale = investment / base_revenue
        cashflows.append(fcf * scale * 1.6)  # 1.6× leverage on scale

    # Terminal value (Gordon growth)
    terminal_g = min(g * 0.5, 0.04)
    terminal_cf = cashflows[-1] * (1 + terminal_g) / (wacc - terminal_g) if wacc > terminal_g else 0
    cashflows[-1] += terminal_cf

    npv     = sum(cf / (1 + wacc) ** t for t, cf in enumerate(cashflows))
    irr     = _irr(cashflows)
    pv_inflows = sum(cf / (1 + wacc) ** t for t, cf in enumerate(cashflows) if cf > 0)
    bcr     = pv_inflows / investment if investment else 1.0

    # Payback period
    cumulative, payback = 0.0, float(horizon)
    for t, cf in enumerate(cashflows):
        cumulative += cf
        if cumulative >= 0:
            prev = cumulative - cf
            payback = t - 1 + abs(prev) / abs(cf) if cf != 0 else t
            break

    return {
        "cashflows": cashflows,
        "npv": npv,
        "irr": irr,
        "payback": payback,
        "bcr": bcr,
        "wacc": wacc,
    }


def run_bond_valuation(coupon: float, ytm: float, tenor: int) -> dict:
    """Use FinancePy to price a bond and compute risk metrics."""
    from financepy.utils import Date, FrequencyTypes, DayCountTypes
    from financepy.products.bonds import Bond as FPBond

    today     = Date(1, 6, 2024)
    mat_dt    = Date(1, 6, 2024 + tenor)
    freq      = FrequencyTypes.ANNUAL
    dc        = DayCountTypes.ACT_ACT_ICMA

    bond      = FPBond(today, mat_dt, coupon, freq, dc)
    settle    = Date(3, 6, 2024)

    price     = bond.dirty_price_from_ytm(settle, ytm)
    duration  = bond.modified_duration(settle, ytm)
    convexity = bond.convexity_from_ytm(settle, ytm)

    # Price-yield curve for plotting
    yields_scan  = np.linspace(0.03, 0.14, 60)
    prices_curve = [bond.dirty_price_from_ytm(settle, y) for y in yields_scan]

    return {
        "price": price,
        "duration": duration,
        "convexity": convexity,
        "price_curve": prices_curve,
    }


# ── ML Model ──────────────────────────────────────────────────────────────────
FEATURE_NAMES = [
    "NPV (₹Cr, norm)",
    "IRR vs WACC spread",
    "Payback / Horizon",
    "Benefit-Cost Ratio",
    "Net Margin",
    "Debt/Equity",
    "Beta",
    "ROCE",
    "Interest Coverage",
    "Current Ratio",
]

def _make_feature_vector(cb: dict, data: dict) -> np.ndarray:
    return np.array([
        cb["npv"] / 1e9,
        cb["irr"] - cb["wacc"],
        cb["payback"] / 10,
        cb["bcr"],
        data["net_margin"],
        data["de_ratio"],
        data["beta"],
        data["roce"],
        min(data["interest_coverage"], 60) / 60,
        min(data["current_ratio"], 4) / 4,
    ])


def train_ml_model():
    """Generate synthetic training data and train a Random Forest classifier."""
    np.random.seed(42)
    N = 1200
    X, y = [], []

    for _ in range(N):
        net_margin  = np.random.uniform(0.02, 0.35)
        de_ratio    = np.random.uniform(0.01, 3.0)
        beta        = np.random.uniform(0.4, 2.0)
        roce        = np.random.uniform(0.05, 0.55)
        ic          = np.random.uniform(1.5, 60.0)
        cr          = np.random.uniform(0.8, 4.0)

        irr  = np.random.uniform(0.04, 0.30)
        wacc = np.random.uniform(0.07, 0.18)
        npv  = np.random.uniform(-500, 2000)
        bcr  = np.random.uniform(0.5, 2.5)
        pb   = np.random.uniform(1, 10)

        feat = np.array([
            npv / 1e3, irr - wacc, pb / 10, bcr,
            net_margin, de_ratio, beta, roce,
            min(ic, 60) / 60, min(cr, 4) / 4
        ])
        X.append(feat)

        # Label logic: mirrors real capital budgeting decision rules
        score = (
            (npv > 0) * 2 +
            (irr > wacc) * 2 +
            (bcr > 1.1) +
            (net_margin > 0.12) +
            (de_ratio < 0.8) +
            (roce > 0.15) +
            (ic > 5) +
            (cr > 1.2)
        )
        if score >= 7:
            label = 2  # INVEST
        elif score >= 4:
            label = 1  # CAUTION
        else:
            label = 0  # AVOID
        y.append(label)

    X = np.array(X)
    y = np.array(y)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = RandomForestClassifier(
        n_estimators=200, max_depth=8,
        min_samples_leaf=5, random_state=42, n_jobs=-1
    )
    model.fit(X_scaled, y)
    return model, scaler, FEATURE_NAMES


def predict_investment(model, scaler, features, cb: dict, data: dict) -> dict:
    fv = _make_feature_vector(cb, data).reshape(1, -1)
    fv_scaled = scaler.transform(fv)

    proba   = model.predict_proba(fv_scaled)[0]
    pred    = model.predict(fv_scaled)[0]
    label_map = {2: "INVEST", 1: "CAUTION", 0: "AVOID"}
    label   = label_map[pred]
    confidence = proba[pred]

    importances = model.feature_importances_

    # Build human-readable insights
    insights = []
    if cb["npv"] > 0:
        insights.append({"color": "green", "text": f"NPV is positive (₹{cb['npv']/1e7:+.1f} Cr) — project creates value at {cb['wacc']*100:.1f}% WACC."})
    else:
        insights.append({"color": "red", "text": f"NPV is negative (₹{cb['npv']/1e7:.1f} Cr) — project destroys value at current discount rate."})

    if cb["irr"] > cb["wacc"]:
        insights.append({"color": "green", "text": f"IRR ({cb['irr']*100:.1f}%) exceeds WACC ({cb['wacc']*100:.1f}%) — investment clears the hurdle rate."})
    else:
        insights.append({"color": "red", "text": f"IRR ({cb['irr']*100:.1f}%) is below WACC ({cb['wacc']*100:.1f}%) — returns don't justify the cost of capital."})

    if data["de_ratio"] < 0.5:
        insights.append({"color": "green", "text": f"Low leverage (D/E {data['de_ratio']:.2f}) — company has strong financial flexibility."})
    elif data["de_ratio"] < 1.2:
        insights.append({"color": "amber", "text": f"Moderate leverage (D/E {data['de_ratio']:.2f}) — monitor debt before committing more capex."})
    else:
        insights.append({"color": "red", "text": f"High leverage (D/E {data['de_ratio']:.2f}) — additional investment may stress the balance sheet."})

    if data["roce"] > 0.20:
        insights.append({"color": "green", "text": f"Strong ROCE ({data['roce']*100:.1f}%) signals efficient capital utilisation historically."})
    elif data["roce"] > 0.10:
        insights.append({"color": "amber", "text": f"Moderate ROCE ({data['roce']*100:.1f}%) — acceptable but room for improvement."})
    else:
        insights.append({"color": "red", "text": f"Low ROCE ({data['roce']*100:.1f}%) — company may struggle to generate sufficient returns."})

    reason_map = {
        "INVEST": f"Strong fundamentals + positive NPV + IRR above WACC — ML model gives a high buy signal.",
        "CAUTION": f"Mixed signals — some metrics look promising but risks (leverage, beta, or IRR spread) warrant careful review.",
        "AVOID": f"Weak risk-adjusted returns — negative NPV or IRR below WACC dragged the score below threshold.",
    }

    return {
        "label": label,
        "confidence": confidence,
        "reason": reason_map[label],
        "feature_names": features,
        "feature_importances": importances,
        "insights": insights[:4],
    }
