"use client";

import EChart from "./EChart";

export default function ChartCard({ title, subtitle, option }: { title: string; subtitle?: string; option: object }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {subtitle ? <div className="section-subtitle">{subtitle}</div> : null}
      <EChart option={option} />
    </div>
  );
}
