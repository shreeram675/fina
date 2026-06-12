import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type {
  CashflowPoint,
  SensitivityPoint,
  FeatureImportance,
  BondCurvePoint,
  CompareRow,
} from "@/lib/capex/types";
import { formatCr, formatNum } from "@/lib/capex/format";

const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
  boxShadow: "var(--shadow-card)",
  fontSize: 13,
};

export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="year" tickFormatter={(y) => `Y${y}`} {...axisProps} />
        <YAxis tickFormatter={(v) => `${v}`} {...axisProps} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number, n) => [formatCr(v, 1), n === "discounted" ? "Discounted" : "Nominal"]}
          labelFormatter={(y) => `Year ${y}`}
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
        />
        <Bar dataKey="cashflow" fill="var(--chart-1)" radius={[5, 5, 0, 0]} maxBarSize={42} />
        <Bar dataKey="discounted" fill="var(--chart-3)" radius={[5, 5, 0, 0]} maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SensitivityChart({ data, wacc }: { data: SensitivityPoint[]; wacc: number }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="npvFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="wacc" tickFormatter={(v) => `${v}%`} {...axisProps} />
        <YAxis tickFormatter={(v) => `${v}`} {...axisProps} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => [formatCr(v, 1), "NPV"]}
          labelFormatter={(w) => `WACC ${w}%`}
        />
        <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="4 4" />
        <ReferenceLine x={wacc} stroke="var(--info)" strokeDasharray="4 4" label={{ value: "WACC", fill: "var(--info)", fontSize: 11, position: "top" }} />
        <Area type="monotone" dataKey="npv" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#npvFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FeatureImportanceChart({ data }: { data: FeatureImportance[] }) {
  const chart = [...data].sort((a, b) => a.weight - b.weight);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chart} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => `${Math.round(v * 100)}%`} {...axisProps} />
        <YAxis type="category" dataKey="feature" width={140} {...axisProps} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => [`${Math.round(v * 100)}% weight`, "Contribution"]}
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
        />
        <Bar dataKey="weight" radius={[0, 5, 5, 0]} maxBarSize={26}>
          {chart.map((d, i) => (
            <Cell key={i} fill={d.direction === "positive" ? "var(--chart-3)" : "var(--chart-5)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BondCurveChart({ data, currentYield }: { data: BondCurvePoint[]; currentYield: number }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="yield" tickFormatter={(v) => `${v}%`} {...axisProps} />
        <YAxis tickFormatter={(v) => `₹${Math.round(v)}`} {...axisProps} domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => [`₹${formatNum(v, 2)}`, "Price"]}
          labelFormatter={(y) => `Yield ${y}%`}
        />
        <ReferenceLine x={currentYield} stroke="var(--info)" strokeDasharray="4 4" label={{ value: "YTM", fill: "var(--info)", fontSize: 11, position: "top" }} />
        <Line type="monotone" dataKey="price" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RiskReturnMatrix({ rows, wacc }: { rows: CompareRow[]; wacc: number }) {
  const colorFor = (v: string) =>
    v === "Invest" ? "var(--chart-3)" : v === "Caution" ? "var(--chart-4)" : "var(--chart-5)";
  const data = rows.map((r, i) => ({
    x: r.irr,
    y: r.bcr,
    z: Math.max(40, r.confidence),
    name: r.ticker,
    verdict: r.verdict,
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 8, right: 12, left: -4, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          type="number"
          dataKey="x"
          name="IRR"
          tickFormatter={(v) => `${v}%`}
          {...axisProps}
          label={{ value: "Return (IRR)", position: "insideBottom", offset: -2, fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="BCR"
          {...axisProps}
          label={{ value: "Value (BCR)", angle: -90, position: "insideLeft", fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <ZAxis type="number" dataKey="z" range={[80, 420]} />
        <ReferenceLine x={wacc} stroke="var(--info)" strokeDasharray="4 4" />
        <ReferenceLine y={1} stroke="var(--danger)" strokeDasharray="4 4" />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ strokeDasharray: "3 3" }}
          formatter={(v: number, n) => [n === "IRR" ? `${v.toFixed(1)}%` : v.toFixed(2), n]}
          labelFormatter={() => ""}
        />
        <Scatter data={data}>
          {data.map((d, i) => (
            <Cell key={i} fill={colorFor(d.verdict)} fillOpacity={0.78} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
