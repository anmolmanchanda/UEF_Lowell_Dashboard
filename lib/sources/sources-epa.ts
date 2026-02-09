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

function toSortable(value: string | number | undefined) {
  if (!value) return "";
  return String(value);
}

export async function fetchEpaAqsIndicators(
  currentSeries: IndicatorSeries
): Promise<SourceResult> {
  const email = process.env.EPA_AQS_EMAIL;
  const key = process.env.EPA_AQS_KEY;
  const endpoint = process.env.EPA_AQS_ENDPOINT;

  if (!email || !key || !endpoint) {
    return {
      updatedSeries: {},
      logs: ["EPA AQS skipped (missing EPA_AQS_EMAIL, EPA_AQS_KEY, or EPA_AQS_ENDPOINT)"]
    };
  }

  const baseUrl = process.env.EPA_AQS_BASE_URL ?? "https://aqs.epa.gov/data/api";
  const param = process.env.EPA_AQS_PARAMETER;
  const state = process.env.EPA_AQS_STATE;
  const county = process.env.EPA_AQS_COUNTY;
  const bdate = process.env.EPA_AQS_BDATE;
  const edate = process.env.EPA_AQS_EDATE;

  const params = new URLSearchParams({ email, key });
  if (param) params.set("param", param);
  if (state) params.set("state", state);
  if (county) params.set("county", county);
  if (bdate) params.set("bdate", bdate);
  if (edate) params.set("edate", edate);

  const url = `${baseUrl.replace(/\/$/, "")}/${endpoint}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`EPA AQS API error ${response.status}`);
  }

  const payload = (await response.json()) as { Data?: Record<string, string>[] };
  const rows = payload.Data ?? [];
  if (!rows.length) {
    return { updatedSeries: {}, logs: ["EPA AQS returned no rows"] };
  }

  const valueField = process.env.EPA_AQS_VALUE_FIELD ?? "aqi";
  const dateField = process.env.EPA_AQS_DATE_FIELD ?? "date_local";
  const yearField = process.env.EPA_AQS_YEAR_FIELD ?? "year";

  const sorted = [...rows].sort((a, b) =>
    toSortable(a[dateField] ?? a[yearField]).localeCompare(
      toSortable(b[dateField] ?? b[yearField])
    )
  );
  const latest = sorted[sorted.length - 1];
  const rawValue = latest[valueField] ?? latest.aqi ?? latest.arithmetic_mean;
  const value = Number(rawValue);
  if (Number.isNaN(value)) {
    return { updatedSeries: {}, logs: ["EPA AQS value missing or invalid"] };
  }

  const date = (latest[dateField] ?? latest[yearField] ?? new Date().getFullYear().toString()).toString();
  const updatedSeries: Partial<IndicatorSeries> = {
    air_quality_index: appendPoint(currentSeries, "air_quality_index", date, value)
  };

  return { updatedSeries, logs: [`EPA AQS: ${date}`] };
}
