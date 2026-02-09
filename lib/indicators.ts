import { IndicatorDefinition, IndicatorSeries, IndicatorValuePoint } from "./types";

export type IndicatorStatus = "good" | "warn" | "alert";

export function getLatestPoint(series: IndicatorValuePoint[]) {
  if (!series.length) {
    return {
      latest: { date: "n/a", value: 0 },
      previous: { date: "n/a", value: 0 },
      delta: 0
    };
  }
  const latest = series[series.length - 1];
  const previous = series[series.length - 2] ?? latest;
  const delta = latest.value - previous.value;
  return { latest, previous, delta };
}

export function getStatus(definition: IndicatorDefinition, value: number): IndicatorStatus {
  const { direction, good, warn } = definition.thresholds;
  if (direction === "up") {
    if (value >= good) return "good";
    if (value >= warn) return "warn";
    return "alert";
  }
  if (value <= good) return "good";
  if (value <= warn) return "warn";
  return "alert";
}

export function getTrendLabel(definition: IndicatorDefinition, delta: number) {
  if (Math.abs(delta) < 0.001) return "Flat";
  const improving = definition.thresholds.direction === "down" ? delta < 0 : delta > 0;
  return improving ? "Improving" : "Worsening";
}

export function buildIndicatorSummary(
  definition: IndicatorDefinition,
  series: IndicatorValuePoint[]
) {
  const { latest, previous, delta } = getLatestPoint(series);
  return {
    id: definition.id,
    label: definition.label,
    pillar: definition.pillar,
    unit: definition.unit,
    format: definition.format,
    description: definition.description,
    dataSourceIds: definition.dataSourceIds,
    updateFrequency: definition.updateFrequency,
    latest: latest.value,
    previous: previous.value,
    delta,
    status: getStatus(definition, latest.value),
    trend: getTrendLabel(definition, delta),
    series
  };
}

export function buildPillarScores(
  definitions: IndicatorDefinition[],
  series: IndicatorSeries
) {
  const byPillar: Record<string, number[]> = {};
  definitions.forEach((def) => {
    const values = series[def.id];
    if (!values?.length) return;
    const latest = values[values.length - 1].value;
    const score = normalize(def, latest);
    if (!byPillar[def.pillar]) byPillar[def.pillar] = [];
    byPillar[def.pillar].push(score);
  });

  return Object.entries(byPillar).map(([pillar, scores]) => {
    const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    return { pillar, score: Math.round(avg * 100) };
  });
}

export function normalize(definition: IndicatorDefinition, value: number) {
  const { direction, good, warn, alert } = definition.thresholds;
  if (direction === "up") {
    if (value >= good) return 1;
    if (value >= warn) return 0.65;
    if (value >= alert) return 0.35;
    return 0.15;
  }
  if (value <= good) return 1;
  if (value <= warn) return 0.65;
  if (value <= alert) return 0.35;
  return 0.15;
}
