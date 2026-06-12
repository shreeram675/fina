import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Clock,
  Scale,
  AlertCircle,
  Gauge,
} from "lucide-react";
import { fetchCompanies, postAnalyze } from "@/lib/capex/api";
import type { AnalyzeRequest, AnalyzeResult } from "@/lib/capex/types";
import { formatCr, formatPct, formatNum, VERDICT_STYLES } from "@/lib/capex/format";
import { Capital3D } from "@/components/capex/Capital3D";
import { AnalysisForm } from "@/components/capex/AnalysisForm";
import { MetricCard } from "@/components/capex/MetricCard";
import { ConfidenceRing } from "@/components/capex/ConfidenceRing";
import { VerdictBadge } from "@/components/capex/VerdictBadge";
import { CompanyProfile } from "@/components/capex/CompanyProfile";
import { Explainability } from "@/components/capex/Explainability";
import { ChartCard } from "@/components/capex/ChartCard";
import { CashflowChart, SensitivityChart, FeatureImportanceChart } from "@/components/capex/charts";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CapEx IQ — Capital Budgeting Dashboard" },
      {
        name: "description",
        content:
          "Model capital investments for major Indian companies and get NPV, IRR, payback, BCR and an explainable AI verdict.",
      },
      { property: "og:title", content: "CapEx IQ — Capital Budgeting Dashboard" },
      {
        property: "og:description",
        content: "AI-graded capital budgeting with NPV, IRR, payback, BCR and explainable insights.",
      },
    ],
  }),
  component: Dashboard,
});

const DEFAULT_REQUEST: AnalyzeRequest = { company: "TCS", investment: 500, wacc: 10, horizon: 5 };

function Dashboard() {
  const { data: companies } = useQuery({ queryKey: ["companies"], queryFn: fetchCompanies });
  const [request, setRequest] = useState<AnalyzeRequest>(DEFAULT_REQUEST);

  const analysis = useMutation<AnalyzeResult, Error, AnalyzeRequest>({
    mutationFn: postAnalyze,
  });

  // Auto-run the default analysis once on mount so the dashboard is never empty.
  useEffect(() => {
    analysis.mutate(DEFAULT_REQUEST);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const result = analysis.data;

  return (
    <div>
      <HeroHeader result={result} />

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Left rail */}
          <div className="space-y-6">
            <AnalysisForm
              companies={companies ?? []}
              value={request}
              onChange={setRequest}
              onSubmit={() => analysis.mutate(request)}
              loading={analysis.isPending}
            />
            {result && <CompanyProfile c={result.company} />}
          </div>

          {/* Results */}
          <div className="space-y-6">
            {analysis.isError && (
              <div className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger-muted p-4 text-danger">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">{analysis.error.message}</span>
              </div>
            )}

            {analysis.isPending && !result ? (
              <LoadingResults />
            ) : result ? (
              <Results result={result} />
            ) : (
              <EmptyResults />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroHeader({ result }: { result?: AnalyzeResult }) {
  return (
    <section className="relative overflow-hidden bg-gradient-header">
      <div className="absolute inset-0 opacity-90">
        <Capital3D />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur">
            <Gauge className="h-3.5 w-3.5" /> AI capital budgeting · Indian markets
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-primary-foreground sm:text-5xl">
            Allocate capital with conviction.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-primary-foreground/80 sm:text-base">
            CapEx IQ analyzes investments across India's largest companies — turning NPV, IRR,
            payback and balance-sheet quality into a single explainable verdict.
          </p>
        </div>
        {result && (
          <div className="mt-8 flex flex-wrap gap-3">
            <HeroStat label="Active company" value={result.company.ticker} />
            <HeroStat label="NPV" value={formatCr(result.npv, 0)} />
            <HeroStat label="IRR" value={formatPct(result.irr)} />
            <HeroStat label="Verdict" value={`${VERDICT_STYLES[result.verdict].icon} ${result.verdict}`} />
          </div>
        )}
      </div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl px-4 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-primary-foreground/70">
        {label}
      </div>
      <div className="font-display text-lg font-bold text-primary-foreground font-mono-nums">{value}</div>
    </div>
  );
}

function Results({ result }: { result: AnalyzeResult }) {
  const v = VERDICT_STYLES[result.verdict];
  const irrBeatsWacc = result.irr >= result.request.wacc;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Net Present Value"
          value={formatCr(result.npv, 0)}
          icon={result.npv >= 0 ? TrendingUp : TrendingDown}
          tone={result.npv >= 0 ? "success" : "danger"}
          sub={result.npv >= 0 ? "Value created" : "Value destroyed"}
        />
        <MetricCard
          label="Internal Rate of Return"
          value={formatPct(result.irr)}
          icon={Percent}
          tone={irrBeatsWacc ? "success" : "danger"}
          sub={`${irrBeatsWacc ? "Above" : "Below"} WACC of ${formatPct(result.request.wacc)}`}
        />
        <MetricCard
          label="Payback Period"
          value={result.payback ? `${formatNum(result.payback, 1)} yrs` : "—"}
          icon={Clock}
          tone="info"
          sub={result.payback ? "Capital recovered" : "Not recovered in horizon"}
        />
        <MetricCard
          label="Benefit-Cost Ratio"
          value={formatNum(result.bcr)}
          icon={Scale}
          tone={result.bcr >= 1 ? "success" : "warning"}
          sub={result.bcr >= 1 ? "Accretive (>1.0)" : "Dilutive (<1.0)"}
        />
      </div>

      {/* Verdict + confidence */}
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center rounded-2xl border bg-card p-6 shadow-card">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl font-bold">AI Verdict</span>
            <VerdictBadge verdict={result.verdict} />
          </div>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            {result.verdict === "Invest" &&
              "The model sees a clear, well-covered value-creation opportunity. Returns comfortably clear the hurdle rate with supportive fundamentals."}
            {result.verdict === "Caution" &&
              "Mixed signals. There is value potential, but tighter margins or weaker fundamentals warrant scenario testing before committing capital."}
            {result.verdict === "Avoid" &&
              "Projected economics fall short of the cost of capital. The model recommends against deploying capital under these assumptions."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {result.features.slice(0, 3).map((f) => (
              <span key={f.feature} className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
                {f.feature} · {Math.round(f.weight * 100)}%
              </span>
            ))}
          </div>
        </div>
        <div className="justify-self-center md:justify-self-end">
          <ConfidenceRing value={result.confidence} color={v.ring} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Cashflow projection" subtitle="Nominal vs discounted, ₹ Cr per year">
          <CashflowChart data={result.cashflows} />
        </ChartCard>
        <ChartCard title="NPV sensitivity" subtitle="How NPV responds to the discount rate">
          <SensitivityChart data={result.sensitivity} wacc={result.request.wacc} />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="ML feature importance" subtitle="What drove the verdict">
          <FeatureImportanceChart data={result.features} />
        </ChartCard>
        <Explainability insights={result.insights} verdict={result.verdict} />
      </div>
    </div>
  );
}

function LoadingResults() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-44 rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

function EmptyResults() {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed bg-card/50 p-16 text-center">
      <Gauge className="h-10 w-10 text-muted-foreground" />
      <h3 className="mt-3 font-display text-lg font-semibold">No analysis yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Pick a company and assumptions on the left, then run an analysis to see the full verdict.
      </p>
    </div>
  );
}
