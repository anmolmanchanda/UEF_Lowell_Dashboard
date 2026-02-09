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

function escapeValue(value: string) {
  return value.replace(/'/g, "''");
}

export async function fetchCdcPlacesIndicators(
  currentSeries: IndicatorSeries
): Promise<SourceResult> {
  const endpoint = process.env.CDC_PLACES_ENDPOINT;
  const measureId = process.env.CDC_PLACES_MEASURE_ID;
  const appToken = process.env.CDC_PLACES_APP_TOKEN;

  if (!endpoint || !measureId) {
    return {
      updatedSeries: {},
      logs: ["CDC PLACES skipped (missing CDC_PLACES_ENDPOINT or CDC_PLACES_MEASURE_ID)"]
    };
  }

  const location = process.env.CDC_PLACES_LOCATION ?? "Lowell";
  const state = process.env.CDC_PLACES_STATE ?? "MA";
  const year = process.env.CDC_PLACES_YEAR;
  const locationId = process.env.CDC_PLACES_LOCATION_ID;

  const fieldLocation = process.env.CDC_PLACES_FIELD_LOCATION ?? "locationname";
  const fieldLocationId = process.env.CDC_PLACES_FIELD_LOCATION_ID ?? "locationid";
  const fieldState = process.env.CDC_PLACES_FIELD_STATE ?? "stateabbr";
  const fieldYear = process.env.CDC_PLACES_FIELD_YEAR ?? "year";
  const fieldMeasure = process.env.CDC_PLACES_FIELD_MEASURE ?? "measureid";
  const fieldValue = process.env.CDC_PLACES_FIELD_VALUE ?? "data_value";

  const filters: string[] = [`${fieldMeasure}='${escapeValue(measureId)}'`];
  if (locationId) {
    filters.push(`${fieldLocationId}='${escapeValue(locationId)}'`);
  } else if (location) {
    filters.push(`${fieldLocation}='${escapeValue(location)}'`);
  }
  if (state) {
    filters.push(`${fieldState}='${escapeValue(state)}'`);
  }
  if (year) {
    filters.push(`${fieldYear}='${escapeValue(year)}'`);
  }

  const selectFields = [fieldValue, fieldYear, fieldLocation, fieldLocationId, fieldMeasure];
  const params = new URLSearchParams();
  params.set("$select", Array.from(new Set(selectFields)).join(","));
  if (filters.length) {
    params.set("$where", filters.join(" AND "));
  }
  params.set("$order", `${fieldYear} DESC`);
  params.set("$limit", "1");

  const url = `${endpoint}?${params.toString()}`;
  const response = await fetch(url, appToken ? { headers: { "X-App-Token": appToken } } : undefined);

  if (!response.ok) {
    throw new Error(`CDC PLACES API error ${response.status}`);
  }

  const rows = (await response.json()) as Record<string, string>[];
  if (!rows.length) {
    return { updatedSeries: {}, logs: ["CDC PLACES returned no rows"] };
  }

  const row = rows[0];
  const rawValue = row[fieldValue];
  const value = Number(rawValue);
  if (Number.isNaN(value)) {
    return { updatedSeries: {}, logs: ["CDC PLACES value missing or invalid"] };
  }

  const date = (row[fieldYear] ?? new Date().getFullYear().toString()).toString();
  const updatedSeries: Partial<IndicatorSeries> = {
    health_disparity: appendPoint(currentSeries, "health_disparity", date, value)
  };

  const label = row[fieldLocation] ?? location ?? "selected location";
  return { updatedSeries, logs: [`CDC PLACES: ${label}`] };
}
