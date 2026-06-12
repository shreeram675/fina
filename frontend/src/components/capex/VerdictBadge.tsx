import type { Verdict } from "@/lib/capex/types";
import { VERDICT_STYLES } from "@/lib/capex/format";
import { cn } from "@/lib/utils";

export function VerdictBadge({ verdict, size = "md" }: { verdict: Verdict; size?: "sm" | "md" }) {
  const s = VERDICT_STYLES[verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        s.bg,
        s.border,
        s.text,
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
      )}
    >
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}
