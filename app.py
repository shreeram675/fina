"""
CapEx IQ — Flask Backend API
RV College of Engineering | IM266TEQ — Elements of Financial Management
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault(
    "MPLCONFIGDIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache", "matplotlib"),
)
os.makedirs(os.environ["MPLCONFIGDIR"], exist_ok=True)

from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
import warnings
warnings.filterwarnings("ignore")

from engine import (
    COMPANIES,
    get_company_data,
    compute_capital_budgeting,
    run_bond_valuation,
    train_ml_model,
    predict_investment,
)

app = Flask(__name__)
CORS(app)  # Allow all origins — frontend on Vercel can call this freely

# ── Train ML model once at startup (cached in memory) ────────────────────────
print("Training ML model...")
_model, _scaler, _features = train_ml_model()
print("ML model ready.")

# ─────────────────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def root():
    return jsonify({
        "project": "CapEx IQ",
        "description": "AI-Powered Capital Budgeting Analyzer for Indian NSE Companies",
        "college": "RV College of Engineering",
        "course": "IM266TEQ — Elements of Financial Management",
        "status": "running",
        "endpoints": [
            "GET  /api/companies",
            "POST /api/analyze",
            "POST /api/bond",
            "GET  /api/compare",
        ]
    })


@app.route("/api/companies", methods=["GET"])
def get_companies():
    """Return list of all available NSE companies with their base data."""
    result = {}
    for name, data in COMPANIES.items():
        result[name] = {
            "sector":      data["sector"],
            "revenue_cr":  data["revenue_cr"],
            "net_margin":  round(data["net_margin"] * 100, 2),
            "de_ratio":    data["de_ratio"],
            "beta":        data["beta"],
            "roce":        round(data["roce"] * 100, 2),
        }
    return jsonify({"companies": result})


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """
    Main analysis endpoint.

    Request body (JSON):
    {
        "company":     "TCS",
        "investment":  500,        // ₹ Crore
        "wacc":        10.0,       // %
        "horizon":     5           // years
    }
    """
    body = request.get_json(force=True)

    company    = body.get("company", "TCS")
    investment = float(body.get("investment", 500))   # ₹ Cr
    wacc       = float(body.get("wacc", 10.0)) / 100  # convert % → decimal
    horizon    = int(body.get("horizon", 5))

    if company not in COMPANIES:
        return jsonify({"error": f"Company '{company}' not found. Use /api/companies to list valid options."}), 400

    # ── Fetch company profile ─────────────────────────────────────────────────
    data = get_company_data(company)

    # ── Capital budgeting (NPV, IRR, Payback, BCR) ───────────────────────────
    cb = compute_capital_budgeting(data, investment * 1e7, wacc, horizon)

    # ── ML prediction ─────────────────────────────────────────────────────────
    verdict = predict_investment(_model, _scaler, _features, cb, data)

    # ── Build clean response ──────────────────────────────────────────────────
    return jsonify({
        "company": {
            "name":        company,
            "sector":      data["sector"],
            "revenue_cr":  data["revenue_cr"],
            "net_margin":  round(data["net_margin"] * 100, 2),
            "de_ratio":    round(data["de_ratio"], 3),
            "beta":        round(data["beta"], 2),
            "roce":        round(data["roce"] * 100, 2),
            "current_ratio":       data["current_ratio"],
            "interest_coverage":   data["interest_coverage"],
        },
        "capital_budgeting": {
            "investment_cr":  investment,
            "wacc_pct":       round(wacc * 100, 2),
            "horizon_years":  horizon,
            "npv_cr":         round(cb["npv"] / 1e7, 2),
            "irr_pct":        round(cb["irr"] * 100, 2),
            "payback_years":  round(cb["payback"], 2),
            "bcr":            round(cb["bcr"], 3),
            "cashflows_cr":   [round(cf / 1e7, 2) for cf in cb["cashflows"]],
            "npv_sensitivity": _npv_sensitivity(cb["cashflows"]),
        },
        "ml_verdict": {
            "label":       verdict["label"],
            "confidence":  round(float(verdict["confidence"]) * 100, 1),
            "reason":      verdict["reason"],
            "insights":    verdict["insights"],
            "feature_importance": [
                {"name": n, "value": round(float(v), 4)}
                for n, v in zip(verdict["feature_names"], verdict["feature_importances"])
            ],
        },
    })


@app.route("/api/bond", methods=["POST"])
def bond():
    """
    Bond valuation via FinancePy.

    Request body (JSON):
    {
        "coupon":  7.0,   // %
        "yield":   6.5,   // %
        "tenor":   10     // years
    }
    """
    body   = request.get_json(force=True)
    coupon = float(body.get("coupon", 7.0)) / 100
    ytm    = float(body.get("yield",  6.5)) / 100
    tenor  = int(body.get("tenor",   10))

    result = run_bond_valuation(coupon, ytm, tenor)

    yields_scan = list(np.linspace(3.0, 14.0, 60))

    return jsonify({
        "inputs": {
            "coupon_pct":       round(coupon * 100, 2),
            "market_yield_pct": round(ytm * 100, 2),
            "tenor_years":      tenor,
        },
        "results": {
            "price":              round(result["price"], 4),
            "modified_duration":  round(result["duration"], 4),
            "convexity":          round(result["convexity"], 4),
            "trading_at":         "Premium" if result["price"] > 100 else "Discount",
            "premium_discount":   round(abs(result["price"] - 100), 2),
        },
        "price_yield_curve": {
            "yields": [round(y, 2) for y in yields_scan],
            "prices": [round(p, 4) for p in result["price_curve"]],
        },
    })


@app.route("/api/compare", methods=["GET"])
def compare():
    """
    Compare all NSE companies with default or query-param settings.
    Query params: investment (₹Cr), wacc (%), horizon (years)
    Example: /api/compare?investment=500&wacc=10&horizon=5
    """
    investment = float(request.args.get("investment", 500))
    wacc       = float(request.args.get("wacc", 10.0)) / 100
    horizon    = int(request.args.get("horizon", 5))

    rows = []
    for co in COMPANIES:
        d   = get_company_data(co)
        cb2 = compute_capital_budgeting(d, investment * 1e7, wacc, horizon)
        v2  = predict_investment(_model, _scaler, _features, cb2, d)
        rows.append({
            "company":       co,
            "sector":        d["sector"],
            "revenue_cr":    d["revenue_cr"],
            "net_margin_pct": round(d["net_margin"] * 100, 1),
            "npv_cr":        round(cb2["npv"] / 1e7, 1),
            "irr_pct":       round(cb2["irr"] * 100, 1),
            "payback_years": round(cb2["payback"], 1),
            "bcr":           round(cb2["bcr"], 3),
            "verdict":       v2["label"],
            "confidence_pct": round(float(v2["confidence"]) * 100, 1),
        })

    # Sort: INVEST first, then CAUTION, then AVOID; within each by NPV desc
    order = {"INVEST": 0, "CAUTION": 1, "AVOID": 2}
    rows.sort(key=lambda r: (order[r["verdict"]], -r["npv_cr"]))

    return jsonify({
        "settings": {
            "investment_cr": investment,
            "wacc_pct":      round(wacc * 100, 1),
            "horizon_years": horizon,
        },
        "companies": rows,
    })


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _npv_sensitivity(cashflows: list) -> list:
    """Return NPV at 19 discount rates from 4% to 22% for sensitivity chart."""
    rates = list(np.linspace(0.04, 0.22, 19))
    result = []
    for r in rates:
        npv = sum(cf / (1 + r) ** t for t, cf in enumerate(cashflows))
        result.append({
            "rate_pct": round(r * 100, 1),
            "npv_cr":   round(npv / 1e7, 2),
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=False, port=5000, use_reloader=False)
