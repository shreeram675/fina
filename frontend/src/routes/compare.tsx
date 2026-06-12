import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ArrowDownUp } from "lucide-react";
import { fetchCompare } from "@/lib/capex/api";
import { formatCr, formatNum, formatPct } from "@/lib/capex/format";
import { VerdictBadge } from "@/components/capex/VerdictBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare Companies — CapEx IQ" },
      {
        name: "description",
        content:
          "Rank major Indian companies by AI verdict, NPV, IRR, BCR, payback and confidence on a standard ₹500 Cr, 10% WACC, 5-year deployment.",
      },
      { property: "og:title", content: "Compare Companies — CapEx IQ" },
      { property: "og:description", content: "Side-by-side capital budgeting league table for Indian blue chips." },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { data, isLoading } = useQuery({ queryKey: ["compare"], queryFn: fetchCompare });

  const counts = data
    ? {
        Invest: data.filter((r) => r.verdict === "Invest").length,
        Caution: data.filter((r) => r.verdict === "Caution").length,
        Avoid: data.filter((r) => r.verdict === "Avoid").length,
      }
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-info-muted px-3 py-1 text-xs font-medium text-info">
          <BarChart3 className="h-3.5 w-3.5" /> Standard scenario · ₹500 Cr · 10% WACC · 5 yrs
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold">Compare Companies</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          A like-for-like league table ranking every company by net present value under identical assumptions.
        </p>
      </header>

      {counts && (
        <div className="mb-6 grid grid-cols-3 gap-3 sm:max-w-md">
          <Tally label="Invest" value={counts.Invest} className="bg-success-muted text-success" />
          <Tally label="Caution" value={counts.Caution} className="bg-warning-muted text-warning-foreground" />
          <Tally label="Avoid" value={counts.Avoid} className="bg-danger-muted text-danger" />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Verdict</th>
                <th className="px-4 py-3 text-right font-semibold">
                  <span className="inline-flex items-center gap-1">NPV <ArrowDownUp className="h-3 w-3" /></span>
                </th>
                <th className="px-4 py-3 text-right font-semibold">IRR</th>
                <th className="px-4 py-3 text-right font-semibold">BCR</th>
                <th className="px-4 py-3 text-right font-semibold">Payback</th>
                <th className="px-4 py-3 text-right font-semibold">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || !data
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-4 py-3" colSpan={8}>
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                : data.map((r, i) => (
                    <tr key={r.ticker} className="border-b transition-colors last:border-0 hover:bg-secondary/40">
                      <td className="px-4 py-3 font-mono-nums text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.sector}</div>
                      </td>
                      <td className="px-4 py-3"><VerdictBadge verdict={r.verdict} size="sm" /></td>
                      <td className={cn("px-4 py-3 text-right font-mono-nums font-semibold", r.npv >= 0 ? "text-success" : "text-danger")}>
                        {formatCr(r.npv, 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-nums">{formatPct(r.irr)}</td>
                      <td className="px-4 py-3 text-right font-mono-nums">{formatNum(r.bcr)}</td>
                      <td className="px-4 py-3 text-right font-mono-nums">{r.payback ? `${formatNum(r.payback, 1)}y` : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono-nums">{r.confidence}%</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Tally({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={cn("rounded-xl px-4 py-3 text-center", className)}>
      <div className="font-display text-2xl font-bold font-mono-nums">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wider">{label}</div>
    </div>
  );
}
