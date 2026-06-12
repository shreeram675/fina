import type { AnalyzeRequest, CompanyFundamentals } from "@/lib/capex/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Play } from "lucide-react";

interface Props {
  companies: CompanyFundamentals[];
  value: AnalyzeRequest;
  onChange: (v: AnalyzeRequest) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function AnalysisForm({ companies, value, onChange, onSubmit, loading }: Props) {
  const set = (patch: Partial<AnalyzeRequest>) => onChange({ ...value, ...patch });

  return (
    <form
      className="rounded-2xl border bg-card p-5 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h2 className="font-display text-lg font-bold">Run an analysis</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Model a capital deployment and get an AI-graded verdict.
      </p>

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="company">Company</Label>
          <Select value={value.company} onValueChange={(v) => set({ company: v })}>
            <SelectTrigger id="company" className="w-full">
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.ticker} value={c.ticker}>
                  {c.name} · {c.sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="investment">Investment (₹ Crore)</Label>
          <Input
            id="investment"
            type="number"
            min={1}
            value={value.investment}
            onChange={(e) => set({ investment: Number(e.target.value) })}
            className="font-mono-nums"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="wacc">WACC (%)</Label>
            <Input
              id="wacc"
              type="number"
              min={0.1}
              step={0.1}
              value={value.wacc}
              onChange={(e) => set({ wacc: Number(e.target.value) })}
              className="font-mono-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="horizon">Horizon (yrs)</Label>
            <Input
              id="horizon"
              type="number"
              min={1}
              max={30}
              value={value.horizon}
              onChange={(e) => set({ horizon: Number(e.target.value) })}
              className="font-mono-nums"
            />
          </div>
        </div>

        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Analyze investment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
