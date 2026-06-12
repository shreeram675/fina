import type { Verdict } from "./types";

export function formatCr(v: number, digits = 0): string {
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  return `${sign}₹${abs.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} Cr`;
}

export function formatPct(v: number, digits = 1): string {
  return `${v.toFixed(digits)}%`;
}

export function formatNum(v: number, digits = 2): string {
  return v.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export interface VerdictStyle {
  label: string;
  icon: string;
  /** tailwind text token class */
  text: string;
  bg: string;
  border: string;
  ring: string;
  dot: string;
}

export const VERDICT_STYLES: Record<Verdict, VerdictStyle> = {
  Invest: {
    label: "Invest",
    icon: "✅",
    text: "text-success",
    bg: "bg-success-muted",
    border: "border-success/30",
    ring: "var(--success)",
    dot: "bg-success",
  },
  Caution: {
    label: "Caution",
    icon: "⚠️",
    text: "text-warning-foreground",
    bg: "bg-warning-muted",
    border: "border-warning/40",
    ring: "var(--warning)",
    dot: "bg-warning",
  },
  Avoid: {
    label: "Avoid",
    icon: "❌",
    text: "text-danger",
    bg: "bg-danger-muted",
    border: "border-danger/30",
    ring: "var(--danger)",
    dot: "bg-danger",
  },
};
