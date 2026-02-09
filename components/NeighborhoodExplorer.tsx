"use client";

import { useMemo, useState } from "react";

import { IndicatorDefinition, Neighborhood } from "@/lib/types";
import { formatValue } from "@/lib/format";
import { getStatus, normalize } from "@/lib/indicators";
import NeighborhoodMap from "./NeighborhoodMap";
import EChart from "./EChart";

const PROFILE_INDICATORS = [
  "median_rent",
  "housing_cost_burden",
  "commute_time",
  "air_quality_index",
  "unemployment_rate",
  "green_space_access"
];

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
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState(
    neighborhoods[0]?.id ?? ""
  );

  const selectedIndicator = availableIndicators.find((indicator) => indicator.id === selectedId);
  const selectedNeighborhood = neighborhoods.find((hood) => hood.id === selectedNeighborhoodId);

  const rows = useMemo(() => {
    if (!selectedIndicator) return [];
    return [...neighborhoods].sort((a, b) => {
      const av = a.metrics[selectedIndicator.id] ?? 0;
      const bv = b.metrics[selectedIndicator.id] ?? 0;
      return bv - av;
    });
  }, [neighborhoods, selectedIndicator]);

  const distributionOption = useMemo(() => {
    if (!selectedIndicator) return {};
    return {
      tooltip: { trigger: "axis" },
      grid: { left: 12, right: 12, top: 20, bottom: 40, containLabel: true },
      xAxis: { type: "category", data: rows.map((row) => row.name), axisLabel: { rotate: 30 } },
      yAxis: { type: "value" },
      series: [
        {
          type: "bar",
          data: rows.map((row) => row.metrics[selectedIndicator.id]),
          itemStyle: { color: "#0b3d91" }
        }
      ]
    };
  }, [rows, selectedIndicator]);

  const profileOption = useMemo(() => {
    if (!selectedNeighborhood) return {};
    const profileDefs = indicators.filter((indicator) => PROFILE_INDICATORS.includes(indicator.id));
    const values = profileDefs.map((def) => {
      const val = selectedNeighborhood.metrics[def.id] ?? 0;
      return Math.round(normalize(def, val) * 100);
    });

    return {
      tooltip: { trigger: "item" },
      radar: {
        indicator: profileDefs.map((def) => ({ name: def.label, max: 100 })),
        radius: "65%"
      },
      series: [
        {
          type: "radar",
          data: [{ value: values, name: selectedNeighborhood.name }],
          areaStyle: { color: "rgba(11, 61, 145, 0.2)" },
          lineStyle: { color: "#0b3d91" }
        }
      ]
    };
  }, [indicators, selectedNeighborhood]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="section-title">Neighborhood Lens</h2>
          <p className="section-subtitle">
            Map-first view of neighborhood performance with visual comparisons and equity signals.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
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
          <label style={{ fontSize: 12, color: "var(--muted)" }}>
            Neighborhood
            <select
              style={{
                display: "block",
                marginTop: 6,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid var(--stroke)"
              }}
              value={selectedNeighborhoodId}
              onChange={(event) => setSelectedNeighborhoodId(event.target.value)}
            >
              {neighborhoods.map((hood) => (
                <option key={hood.id} value={hood.id}>
                  {hood.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="lens-grid">
        <div className="panel panel-inner">
          <h3 className="section-title">Spatial Overview</h3>
          <p className="section-subtitle">Hotspots and neighborhood markers.</p>
          <NeighborhoodMap neighborhoods={neighborhoods} />
        </div>
        <div className="panel panel-inner">
          <h3 className="section-title">Neighborhood Profile</h3>
          <p className="section-subtitle">Normalized performance across core signals.</p>
          <EChart option={profileOption} height={320} />
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-inner">
          <h3 className="section-title">Indicator Distribution</h3>
          <p className="section-subtitle">Compare how neighborhoods stack up.</p>
          <EChart option={distributionOption} height={300} />
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-inner">
          <h3 className="section-title">Neighborhood Scorecards</h3>
          <div className="stat-grid">
            {PROFILE_INDICATORS.map((indicatorId) => {
              const def = indicators.find((item) => item.id === indicatorId);
              if (!def || !selectedNeighborhood) return null;
              const value = selectedNeighborhood.metrics[indicatorId];
              const status = getStatus(def, value);
              return (
                <div key={indicatorId} className="stat-card">
                  <div className="stat-label">{def.label}</div>
                  <div className="stat-value">{formatValue(value, def.format)}</div>
                  <div className={`badge ${status}`} style={{ marginTop: 6 }}>
                    {status.toUpperCase()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-inner">
          <h3 className="section-title">Neighborhood Table</h3>
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
                    <td>
                      {value !== undefined && selectedIndicator
                        ? formatValue(value, selectedIndicator.format)
                        : "n/a"}
                    </td>
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
    </div>
  );
}
