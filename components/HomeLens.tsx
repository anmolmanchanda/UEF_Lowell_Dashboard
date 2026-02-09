"use client";

import { useEffect, useMemo, useState } from "react";
import { IndicatorDefinition, Neighborhood } from "@/lib/types";
import { formatValue } from "@/lib/format";
import { getStatus } from "@/lib/indicators";
import NeighborhoodMap from "./NeighborhoodMap";

const FOCUS_CHIPS = [
  {
    id: "housing",
    label: "Housing",
    description: "Affordability pressure and supply signals.",
    indicators: ["median_rent", "housing_cost_burden", "vacancy_rate", "permits_issued"],
    prompt: "Where is rent pressure rising the fastest?"
  },
  {
    id: "climate",
    label: "Climate",
    description: "Heat exposure, precipitation, and air quality.",
    indicators: ["extreme_heat_days", "precipitation_anomaly", "air_quality_index"],
    prompt: "Which neighborhoods face the highest climate risk?"
  },
  {
    id: "equity",
    label: "Equity",
    description: "Disparities in income and health outcomes.",
    indicators: ["income_inequality", "health_disparity", "green_space_access"],
    prompt: "Show neighborhoods with the widest equity gaps."
  },
  {
    id: "mobility",
    label: "Mobility",
    description: "Commute time, transit reliability, and service strain.",
    indicators: ["commute_time", "transit_reliability", "mobility_311"],
    prompt: "Where are mobility bottlenecks most visible?"
  }
];

const LAYERS = [
  { id: "housing_cost_burden", label: "Rent burden" },
  { id: "extreme_heat_days", label: "Heat risk" },
  { id: "response_time_311", label: "Service time" }
];

const MAP_VIEWS = [
  { id: "bubbles", label: "Bubbles" },
  { id: "heatmap", label: "Heatmap" }
];

const FOCUS_LAYER_MAP: Record<string, string> = {
  housing: "housing_cost_burden",
  climate: "extreme_heat_days",
  mobility: "response_time_311"
};

type IndicatorSummary = {
  id: string;
  label: string;
  pillar: string;
  latest: number;
  delta: number;
  trend: string;
  format: string;
  description: string;
  dataSourceIds: string[];
};

export default function HomeLens({
  indicators,
  summaries,
  neighborhoods
}: {
  indicators: IndicatorDefinition[];
  summaries: IndicatorSummary[];
  neighborhoods: Neighborhood[];
}) {
  const [focusId, setFocusId] = useState(FOCUS_CHIPS[0].id);
  const [expanded, setExpanded] = useState(false);
  const [mapLayerId, setMapLayerId] = useState(LAYERS[0].id);
  const [mapView, setMapView] = useState<"bubbles" | "heatmap">("bubbles");
  const [lensVisible, setLensVisible] = useState(true);

  useEffect(() => {
    const mapped = FOCUS_LAYER_MAP[focusId];
    if (mapped) setMapLayerId(mapped);
  }, [focusId]);

  const focus = FOCUS_CHIPS.find((chip) => chip.id === focusId) ?? FOCUS_CHIPS[0];
  const focusIndicators = useMemo(() => {
    return focus.indicators
      .map((id) => summaries.find((item) => item.id === id))
      .filter(Boolean) as IndicatorSummary[];
  }, [focus, summaries]);

  const mapIndicatorDef = indicators.find((indicator) => indicator.id === mapLayerId);

  const hotspot = useMemo<{ name: string; value: number } | null>(() => {
    const target = mapLayerId;
    if (!target) return null;
    let best: { name: string; value: number } | null = null;
    neighborhoods.forEach((hood) => {
      const value = hood.metrics[target];
      if (value === undefined) return;
      if (!best || value > best.value) {
        best = { name: hood.name, value };
      }
    });
    return best;
  }, [mapLayerId, neighborhoods]);

  return (
    <div className="home-surface">
      <div className="map-hero">
        <NeighborhoodMap
          neighborhoods={neighborhoods}
          className="full"
          indicatorKey={mapLayerId}
          viewMode={mapView}
        />
        {lensVisible ? (
          <div className="map-overlay">
            <div className="map-overlay-header">
              <div>
                <div className="stat-label">Neighborhood Lens</div>
                <div className="overlay-title">{focus.label} Focus</div>
              </div>
              <div className="map-overlay-actions">
                <button className="secondary" onClick={() => setLensVisible(false)}>
                  Hide lens
                </button>
                <button className="secondary" onClick={() => setExpanded((prev) => !prev)}>
                  {expanded ? "Hide details" : "Explore deeper"}
                </button>
              </div>
            </div>
            <div className="chip-row">
              {FOCUS_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  className={`chip ${chip.id === focusId ? "active" : ""}`}
                  onClick={() => setFocusId(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className="overlay-copy">{focus.description}</div>

            <div>
              <div className="stat-label">Map Layer</div>
              <div className="chip-row" style={{ marginTop: 6 }}>
                {LAYERS.map((layer) => (
                  <button
                    key={layer.id}
                    className={`chip ${layer.id === mapLayerId ? "active" : ""}`}
                    onClick={() => setMapLayerId(layer.id)}
                  >
                    {layer.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="stat-label">Map View</div>
              <div className="chip-row" style={{ marginTop: 6 }}>
                {MAP_VIEWS.map((view) => (
                  <button
                    key={view.id}
                    className={`chip ${view.id === mapView ? "active" : ""}`}
                    onClick={() => setMapView(view.id as "bubbles" | "heatmap")}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overlay-metrics">
              {focusIndicators.slice(0, 2).map((item) => (
                <div key={item.id} className="overlay-metric">
                  <div className="stat-label">{item.label}</div>
                  <div className="stat-value">{formatValue(item.latest, item.format)}</div>
                  <div className="insight-sub">{item.trend}</div>
                </div>
              ))}
            </div>

            {hotspot && mapIndicatorDef ? (
              <div className="overlay-highlight">
                <div className="stat-label">Highest signal right now</div>
                <div className="overlay-title">{hotspot.name}</div>
                <div className="insight-sub">
                  {mapIndicatorDef.label}: {formatValue(hotspot.value, mapIndicatorDef.format)}
                </div>
              </div>
            ) : null}

            <div className="overlay-ai">
              <div className="stat-label">Ask Lowell</div>
              <div className="insight-sub">Suggested question</div>
              <div className="overlay-title">{focus.prompt}</div>
            </div>

            {expanded ? (
              <div className="overlay-detail">
                {focusIndicators.map((item) => {
                  const def = indicators.find((indicator) => indicator.id === item.id);
                  const status = def ? getStatus(def, item.latest) : "warn";
                  return (
                    <div key={item.id} className="overlay-detail-card">
                      <div className="stat-label">{item.label}</div>
                      <div className="stat-value">{formatValue(item.latest, item.format)}</div>
                      <span className={`badge ${status}`}>{item.trend}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : (
          <button className="lens-toggle" onClick={() => setLensVisible(true)}>
            Show Neighborhood Lens
          </button>
        )}
      </div>
    </div>
  );
}
