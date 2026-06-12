import { Sparkles, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { Verdict } from "@/lib/capex/types";

export function Explainability({ insights, verdict }: { insights: string[]; verdict: Verdict }) {
  const Icon = verdict === "Invest" ? CheckCircle2 : verdict === "Caution" ? AlertTriangle : XCircle;
  const tone =
    verdict === "Invest" ? "text-success" : verdict === "Caution" ? "text-warning-foreground" : "text-danger";

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4.5 w-4.5 text-info" />
        <h3 className="text-base font-semibold">Explainable AI — Why this verdict</h3>
      </div>
      <ul className="space-y-3">
        {insights.map((text, i) => (
          <li key={i} className="flex gap-3">
            <Icon className={"mt-0.5 h-4.5 w-4.5 shrink-0 " + tone} />
            <span className="text-sm leading-relaxed text-foreground/90">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
