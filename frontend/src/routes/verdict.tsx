import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { fetchCompare } from "@/lib/capex/api";
import { ChartCard } from "@/components/capex/ChartCard";
import { RiskReturnMatrix } from "@/components/capex/charts";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/verdict")({
  head: () => ({
    meta: [
      { title: "AI Verdict — How CapEx IQ decides" },
      {
        name: "description",
        content:
          "The explainable scoring model behind CapEx IQ — how NPV, IRR, BCR, ROCE and leverage map to Invest, Caution or Avoid.",
      },
      { property: "og:title", content: "AI Verdict — How CapEx IQ decides" },
      { property: "og:description", content: "The transparent scoring model behind every CapEx IQ verdict." },
    ],
  }),
  component: VerdictPage,
});

const FACTORS = [
  { name: "NPV (value creation)", weight: 30, desc: "Net present value of project cashflows above the cost of capital." },
  { name: "IRR vs WACC spread", weight: 25, desc: "How far the project return clears the hurdle rate." },
  { name: "Benefit-Cost Ratio", weight: 15, desc: "Present value of inflows per rupee invested." },
  { name: "ROCE quality", weight: 12, desc: "Historic efficiency in compounding deployed capital." },
  { name: "Leverage (D/E)", weight: 10, desc: "Balance-sheet headroom to fund the capex safely." },
  { name: "Interest coverage", weight: 8, desc: "Ability to service debt from operating earnings." },
];

const BANDS = [
  { v: "Invest", icon: CheckCircle2, tone: "text-success", bg: "bg-success-muted border-success/30", rule: "Score ≥ 62, positive NPV and IRR above WACC." },
  { v: "Caution", icon: AlertTriangle, tone: "text-warning-foreground", bg: "bg-warning-muted border-warning/40", rule: "Score 45–62 — value potential offset by risk." },
  { v: "Avoid", icon: XCircle, tone: "text-danger", bg: "bg-danger-muted border-danger/30", rule: "Score below 45 or value-destructive economics." },
];

function VerdictPage() {
  const { data, isLoading } = useQuery({ queryKey: ["compare"], queryFn: fetchCompare });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-info-muted px-3 py-1 text-xs font-medium text-info">
          <BrainCircuit className="h-3.5 w-3.5" /> Explainable scoring
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold">The AI Verdict, explained</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Every verdict is a transparent, weighted blend of return economics and balance-sheet quality —
          no black boxes. Here is exactly how the model thinks.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {BANDS.map((b) => (
          <div key={b.v} className={"rounded-2xl border p-5 " + b.bg}>
            <b.icon className={"h-6 w-6 " + b.tone} />
            <h3 className={"mt-2 font-display text-lg font-bold " + b.tone}>{b.v}</h3>
            <p className="mt-1 text-sm text-foreground/80">{b.rule}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <h3 className="text-base font-semibold">Model weights</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Relative influence of each factor on the score.</p>
          <ul className="mt-4 space-y-4">
            {FACTORS.map((f) => (
              <li key={f.name}>
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{f.name}</span>
                  <span className="font-mono-nums text-muted-foreground">{f.weight}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-header" style={{ width: `${f.weight * 3.2}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
              </li>
            ))}
          </ul>
        </div>

        <ChartCard title="Risk-return matrix" subtitle="Return (IRR) vs value (BCR); bubble size = confidence">
          {isLoading || !data ? (
            <Skeleton className="h-72 rounded-xl" />
          ) : (
            <RiskReturnMatrix rows={data} wacc={10} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
