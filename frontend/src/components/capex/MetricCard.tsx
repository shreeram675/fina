import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  sub?: string;
  tone?: "neutral" | "success" | "danger" | "warning" | "info";
  hint?: string;
}

const TONE: Record<NonNullable<MetricCardProps["tone"]>, { icon: string; value: string }> = {
  neutral: { icon: "bg-secondary text-foreground", value: "text-foreground" },
  success: { icon: "bg-success-muted text-success", value: "text-success" },
  danger: { icon: "bg-danger-muted text-danger", value: "text-danger" },
  warning: { icon: "bg-warning-muted text-warning-foreground", value: "text-warning-foreground" },
  info: { icon: "bg-info-muted text-info", value: "text-info" },
};

export function MetricCard({ label, value, icon: Icon, sub, tone = "neutral", hint }: MetricCardProps) {
  const t = TONE[tone];
  return (
    <div className="group rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={cn("grid h-9 w-9 place-items-center rounded-xl transition-transform group-hover:scale-110", t.icon)}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <div className={cn("mt-3 font-display text-3xl font-bold font-mono-nums tracking-tight", t.value)}>
        {value}
      </div>
      {sub && <div className="mt-1 text-sm text-muted-foreground">{sub}</div>}
      {hint && <div className="mt-2 text-xs text-muted-foreground/80">{hint}</div>}
    </div>
  );
}
