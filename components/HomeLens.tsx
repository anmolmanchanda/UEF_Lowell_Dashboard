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
  const [compareMode, setCompareMode] = useState(false);
  const [compareIndicatorId, setCompareIndicatorId] = useState("");
  const [storyMode, setStoryMode] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
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
  const indicatorOptions = useMemo(
    () =>
      indicators.filter((indicator) =>
        neighborhoods.some((hood) =>
          Object.prototype.hasOwnProperty.call(hood.metrics, indicator.id)
        )
      ),
    [indicators, neighborhoods]
  );
  const compareIndicatorDef = indicators.find((indicator) => indicator.id === compareIndicatorId);

  useEffect(() => {
    if (!indicatorOptions.length) return;
    if (!compareIndicatorId || compareIndicatorId === mapLayerId) {
      const next = indicatorOptions.find((indicator) => indicator.id !== mapLayerId);
      if (next) setCompareIndicatorId(next.id);
    }
  }, [compareIndicatorId, indicatorOptions, mapLayerId]);

  const indicatorValues = useMemo(() => {
    return neighborhoods
      .map((hood) => hood.metrics[mapLayerId])
      .filter((value): value is number => typeof value === "number");
  }, [neighborhoods, mapLayerId]);

  const indicatorAverage = useMemo(() => {
    if (!indicatorValues.length) return 0;
    return indicatorValues.reduce((sum, value) => sum + value, 0) / indicatorValues.length;
  }, [indicatorValues]);

  const storyItems = useMemo(() => {
    return neighborhoods
      .map((hood) => ({
        id: hood.id,
        name: hood.name,
        lat: hood.lat,
        lon: hood.lon,
        value: hood.metrics[mapLayerId]
      }))
      .filter((item): item is { id: string; name: string; lat: number; lon: number; value: number } =>
        typeof item.value === "number"
      )
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [neighborhoods, mapLayerId]);

  useEffect(() => {
    if (!storyMode) return;
    if (!storyItems.length) return;
    setStoryIndex(0);
    const timer = window.setInterval(() => {
      setStoryIndex((prev) => (prev + 1) % storyItems.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [storyMode, storyItems.length, mapLayerId]);

  const activeStory = storyItems.length ? storyItems[storyIndex % storyItems.length] : null;
  const storyNarrative =
    activeStory && mapIndicatorDef
      ? (() => {
          const diff = activeStory.value - indicatorAverage;
          const direction = diff >= 0 ? "above" : "below";
          const diffText = formatValue(Math.abs(diff), mapIndicatorDef.format);
          const avgText = formatValue(indicatorAverage, mapIndicatorDef.format);
          return `${activeStory.name} sits ${direction} the city average (${avgText}) by ${diffText}.`;
        })()
      : null;

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
        {compareMode ? (
          <div className="map-compare">
            <div className="map-compare-item">
              <NeighborhoodMap
                neighborhoods={neighborhoods}
                className="full"
                indicatorKey={mapLayerId}
                viewMode={mapView}
                focus={
                  storyMode && activeStory
                    ? { id: activeStory.id, lat: activeStory.lat, lon: activeStory.lon }
                    : null
                }
              />
              <div className="map-title">Primary: {mapIndicatorDef?.label ?? "Indicator"}</div>
            </div>
            <div className="map-compare-item">
              <NeighborhoodMap
                neighborhoods={neighborhoods}
                className="full"
                indicatorKey={compareIndicatorId || mapLayerId}
                viewMode={mapView}
                focus={
                  storyMode && activeStory
                    ? { id: activeStory.id, lat: activeStory.lat, lon: activeStory.lon }
                    : null
                }
              />
              <div className="map-title">Compare: {compareIndicatorDef?.label ?? "Indicator"}</div>
            </div>
          </div>
        ) : (
          <NeighborhoodMap
            neighborhoods={neighborhoods}
            className="full"
            indicatorKey={mapLayerId}
            viewMode={mapView}
            focus={
              storyMode && activeStory
                ? { id: activeStory.id, lat: activeStory.lat, lon: activeStory.lon }
                : null
            }
          />
        )}
        {lensVisible ? (
          <div className="map-overlay">
            <div className="map-overlay-header">
              <div>
                <div className="stat-label">Neighborhood Lens</div>
                <div className="overlay-title">{focus.label} Focus</div>
              </div>
              <div className="map-overlay-actions">
                <button className="secondary" onClick={() => setStoryMode((prev) => !prev)}>
                  {storyMode ? "Stop story" : "Story mode"}
                </button>
                <button className="secondary" onClick={() => setCompareMode((prev) => !prev)}>
                  {compareMode ? "Single view" : "Compare"}
                </button>
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
            {compareMode ? (
              <div>
                <div className="stat-label">Compare Indicator</div>
                <select
                  style={{
                    display: "block",
                    marginTop: 6,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid var(--stroke)",
                    width: "100%"
                  }}
                  value={compareIndicatorId}
                  onChange={(event) => setCompareIndicatorId(event.target.value)}
                >
                  {indicatorOptions
                    .filter((indicator) => indicator.id !== mapLayerId)
                    .map((indicator) => (
                      <option key={indicator.id} value={indicator.id}>
                        {indicator.label}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}

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

            {storyMode && activeStory && mapIndicatorDef ? (
              <div className="story-card">
                <div className="stat-label">
                  Story mode · Stop {storyIndex + 1}/{storyItems.length}
                </div>
                <div className="overlay-title">{activeStory.name}</div>
                <div className="insight-sub">
                  {mapIndicatorDef.label}: {formatValue(activeStory.value, mapIndicatorDef.format)}
                </div>
                {storyNarrative ? <div className="insight-sub">{storyNarrative}</div> : null}
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
