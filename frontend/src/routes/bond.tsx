import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Landmark, Loader2, Play, IndianRupee, Activity, Clock } from "lucide-react";
import { postBond } from "@/lib/capex/api";
import type { BondRequest, BondResult } from "@/lib/capex/types";
import { formatNum } from "@/lib/capex/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricCard } from "@/components/capex/MetricCard";
import { ChartCard } from "@/components/capex/ChartCard";
import { BondCurveChart } from "@/components/capex/charts";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/bond")({
  head: () => ({
    meta: [
      { title: "Bond Valuation — CapEx IQ" },
      {
        name: "description",
        content: "FinancePy-style bond valuation: price, duration and a price-vs-yield curve.",
      },
      { property: "og:title", content: "Bond Valuation — CapEx IQ" },
      { property: "og:description", content: "Price bonds and visualise the price-vs-yield curve." },
    ],
  }),
  component: BondPage,
});

const DEFAULT: BondRequest = { coupon: 7, yield: 6.5, tenor: 10, face: 1000 };

function BondPage() {
  const [req, setReq] = useState<BondRequest>(DEFAULT);
  const bond = useMutation<BondResult, Error, BondRequest>({ mutationFn: postBond });

  useEffect(() => {
    bond.mutate(DEFAULT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const r = bond.data;
  const set = (p: Partial<BondRequest>) => setReq({ ...req, ...p });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-info-muted px-3 py-1 text-xs font-medium text-info">
          <Landmark className="h-3.5 w-3.5" /> FinancePy-style valuation
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold">Bond Valuation</h1>
        <p className="mt-1 max-w-xl text-muted-foreground">
          Discount coupon and principal cashflows to a fair price and study the price-vs-yield relationship.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <form
          className="h-fit rounded-2xl border bg-card p-5 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            bond.mutate(req);
          }}
        >
          <h2 className="font-display text-lg font-bold">Bond terms</h2>
          <div className="mt-5 space-y-4">
            <Field id="coupon" label="Coupon rate (%)" value={req.coupon} step={0.1} onChange={(v) => set({ coupon: v })} />
            <Field id="yield" label="Yield to maturity (%)" value={req.yield} step={0.1} onChange={(v) => set({ yield: v })} />
            <Field id="tenor" label="Tenor (years)" value={req.tenor} step={1} onChange={(v) => set({ tenor: v })} />
            <Field id="face" label="Face value (₹)" value={req.face ?? 1000} step={100} onChange={(v) => set({ face: v })} />
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={bond.isPending}>
              {bond.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Pricing…</> : <><Play className="h-4 w-4" /> Value bond</>}
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          {bond.isPending && !r ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
              </div>
              <Skeleton className="h-80 rounded-2xl" />
            </div>
          ) : r ? (
            <div className="space-y-6 animate-fade-up">
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                  label="Fair Price"
                  value={`₹${formatNum(r.price)}`}
                  icon={IndianRupee}
                  tone={r.premiumDiscount === "Premium" ? "success" : r.premiumDiscount === "Discount" ? "warning" : "neutral"}
                  sub={`Trading at ${r.premiumDiscount}`}
                />
                <MetricCard
                  label="Modified Duration"
                  value={`${formatNum(r.modifiedDuration)}`}
                  icon={Activity}
                  tone="info"
                  sub={`Macaulay ${formatNum(r.macaulayDuration)} yrs`}
                />
                <MetricCard
                  label="Current Yield"
                  value={`${formatNum(r.currentYield)}%`}
                  icon={Clock}
                  tone="neutral"
                  sub={`vs ${formatNum(r.request.yield)}% YTM`}
                />
              </div>
              <ChartCard title="Price vs Yield curve" subtitle="Inverse, convex relationship between yield and price">
                <BondCurveChart data={r.curve} currentYield={r.request.yield} />
              </ChartCard>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-mono-nums"
      />
    </div>
  );
}
