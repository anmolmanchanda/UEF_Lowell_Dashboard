"use client";

import { useMemo, useState } from "react";
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

  const focus = FOCUS_CHIPS.find((chip) => chip.id === focusId) ?? FOCUS_CHIPS[0];
  const focusIndicators = useMemo(() => {
    return focus.indicators
      .map((id) => summaries.find((item) => item.id === id))
      .filter(Boolean) as IndicatorSummary[];
  }, [focus, summaries]);

  const focusIndicatorDef = indicators.find((indicator) => indicator.id === focus.indicators[0]);

  const hotspot = useMemo(() => {
    const target = focus.indicators[0];
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
  }, [focus, neighborhoods]);

  return (
    <div className="map-hero">
      <NeighborhoodMap neighborhoods={neighborhoods} className="full" />
      <div className="map-overlay">
        <div className="map-overlay-header">
          <div>
            <div className="stat-label">Neighborhood Lens</div>
            <div className="overlay-title">{focus.label} Focus</div>
          </div>
          <button className="secondary" onClick={() => setExpanded((prev) => !prev)}>
            {expanded ? "Hide details" : "Explore deeper"}
          </button>
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

        <div className="overlay-metrics">
          {focusIndicators.slice(0, 2).map((item) => (
            <div key={item.id} className="overlay-metric">
              <div className="stat-label">{item.label}</div>
              <div className="stat-value">{formatValue(item.latest, item.format)}</div>
              <div className="insight-sub">{item.trend}</div>
            </div>
          ))}
        </div>

        {hotspot && focusIndicatorDef ? (
          <div className="overlay-highlight">
            <div className="stat-label">Highest signal right now</div>
            <div className="overlay-title">{hotspot.name}</div>
            <div className="insight-sub">
              {focusIndicatorDef.label}: {formatValue(hotspot.value, focusIndicatorDef.format)}
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
    </div>
  );
}
