"use client";

import { useMemo, useState } from "react";

import { IndicatorDefinition, Neighborhood } from "@/lib/types";
import { formatValue } from "@/lib/format";
import { getStatus } from "@/lib/indicators";
import NeighborhoodMap from "./NeighborhoodMap";

export default function NeighborhoodExplorer({
  indicators,
  neighborhoods
}: {
  indicators: IndicatorDefinition[];
  neighborhoods: Neighborhood[];
}) {
  const availableIndicators = useMemo(() => {
    return indicators.filter((indicator) =>
      neighborhoods.some((hood) =>
        Object.prototype.hasOwnProperty.call(hood.metrics, indicator.id)
      )
    );
  }, [indicators, neighborhoods]);

  const [selectedId, setSelectedId] = useState(availableIndicators[0]?.id ?? "");

  const selectedIndicator = availableIndicators.find((indicator) => indicator.id === selectedId);

  const rows = useMemo(() => {
    if (!selectedIndicator) return [];
    return [...neighborhoods].sort((a, b) => {
      const av = a.metrics[selectedIndicator.id] ?? 0;
      const bv = b.metrics[selectedIndicator.id] ?? 0;
      return bv - av;
    });
  }, [neighborhoods, selectedIndicator]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="section-title">Neighborhood Explorer</h2>
          <p className="section-subtitle">
            Compare neighborhood performance against core indicators and spatial signals.
          </p>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>
            Indicator Focus
            <select
              style={{
                display: "block",
                marginTop: 6,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid var(--stroke)"
              }}
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {availableIndicators.map((indicator) => (
                <option key={indicator.id} value={indicator.id}>
                  {indicator.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <NeighborhoodMap neighborhoods={neighborhoods} />

      <div className="panel" style={{ marginTop: 18, padding: 18 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Neighborhood</th>
              <th>{selectedIndicator?.label}</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((hood) => {
              const value = selectedIndicator ? hood.metrics[selectedIndicator.id] : undefined;
              const status =
                selectedIndicator && value !== undefined
                  ? getStatus(selectedIndicator, value)
                  : "warn";
              return (
                <tr key={hood.id}>
                  <td>{hood.name}</td>
                  <td>{
                    value !== undefined && selectedIndicator
                      ? formatValue(value, selectedIndicator.format)
                      : "n/a"
                  }</td>
                  <td>
                    <span className={`badge ${status}`}>{status.toUpperCase()}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
