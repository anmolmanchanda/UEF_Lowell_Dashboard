import { IndicatorSeries } from "../types";
import { SourceResult } from "./registry";

function appendPoint(series: IndicatorSeries, id: string, date: string, value: number) {
  const existing = series[id] ? [...series[id]] : [];
  if (existing.length && existing[existing.length - 1].date === date) {
    existing[existing.length - 1] = { date, value };
  } else {
    existing.push({ date, value });
  }
  return existing;
}

export async function fetchMbtaReliability(currentSeries: IndicatorSeries): Promise<SourceResult> {
  const routeId = process.env.MBTA_ROUTE_ID ?? "CR-Lowell";
  const apiKey = process.env.MBTA_API_KEY;
  const headers: Record<string, string> = apiKey ? { "x-api-key": apiKey } : {};

  const url = `https://api-v3.mbta.com/alerts?filter[route]=${routeId}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`MBTA API error ${response.status}`);
  }

  const data = (await response.json()) as { data: { id: string }[] };
  const alertCount = data.data.length;

  const reliability = Math.max(50, 95 - alertCount * 5);
  const date = new Date().toISOString().slice(0, 10);

  const updatedSeries: Partial<IndicatorSeries> = {
    transit_reliability: appendPoint(currentSeries, "transit_reliability", date, reliability)
  };

  return { updatedSeries, logs: [`MBTA alerts=${alertCount}`] };
}
