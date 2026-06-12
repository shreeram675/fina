import type { CompanyFundamentals } from "@/lib/capex/types";
import { formatCr, formatNum, formatPct } from "@/lib/capex/format";
import { Building2 } from "lucide-react";

function Stat({ label, value, good }: { label: string; value: string; good?: boolean | null }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={
          "font-mono-nums text-sm font-semibold " +
          (good === true ? "text-success" : good === false ? "text-danger" : "text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}

export function CompanyProfile({ c }: { c: CompanyFundamentals }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-header text-primary-foreground">
          <Building2 className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-display text-base font-bold leading-tight">{c.name}</h3>
          <p className="text-xs text-muted-foreground">{c.sector} · {c.ticker}</p>
        </div>
      </div>
      <div>
        <Stat label="Revenue (FY)" value={formatCr(c.revenue)} />
        <Stat label="Net Margin" value={formatPct(c.netMargin)} good={c.netMargin > 10} />
        <Stat label="Debt / Equity" value={formatNum(c.debtEquity)} good={c.debtEquity < 0.6} />
        <Stat label="Beta" value={formatNum(c.beta)} good={c.beta < 1} />
        <Stat label="ROCE" value={formatPct(c.roce)} good={c.roce > 18} />
        <Stat label="Current Ratio" value={formatNum(c.currentRatio)} good={c.currentRatio >= 1} />
        <Stat label="Interest Coverage" value={`${formatNum(c.interestCoverage, 1)}x`} good={c.interestCoverage > 4} />
      </div>
    </div>
  );
}
