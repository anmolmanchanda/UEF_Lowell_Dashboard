"use client";

import { formatDelta, formatValue } from "@/lib/format";

export type KpiSummary = {
  id: string;
  label: string;
  latest: number;
  delta: number;
  status: "good" | "warn" | "alert";
  trend: string;
  format: string;
  unit: string;
};

export default function KpiCard({ summary }: { summary: KpiSummary }) {
  return (
    <div className="kpi-card">
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{summary.label}</div>
      <strong>{formatValue(summary.latest, summary.format)}</strong>
      <div className="kpi-meta">
        <span className={`badge ${summary.status}`}>{summary.trend}</span>
        <span>{formatDelta(summary.delta, summary.format)} vs last period</span>
      </div>
    </div>
  );
}
