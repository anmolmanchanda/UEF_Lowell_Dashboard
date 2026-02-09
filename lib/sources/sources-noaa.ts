import { IndicatorSeries } from "../types";
import { SourceResult } from "./registry";

const NOAA_BASE = "https://www.ncei.noaa.gov/cdo-web/api/v2/data";

async function fetchNoaaData(
  stationId: string,
  token: string,
  year: number,
  datatype: string
) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const limit = 1000;
  let offset = 1;
  const values: number[] = [];

  while (true) {
    const url = `${NOAA_BASE}?datasetid=GHCND&stationid=${stationId}&datatypeid=${datatype}&startdate=${start}&enddate=${end}&limit=${limit}&offset=${offset}`;
    const response = await fetch(url, {
      headers: { token }
    });
    if (!response.ok) {
      throw new Error(`NOAA API error ${response.status}`);
    }
    const data = (await response.json()) as { results?: { value: number }[] };
    const results = data.results ?? [];
    values.push(...results.map((item) => item.value));
    if (results.length < limit) break;
    offset += limit;
  }

  return values;
}

function appendPoint(series: IndicatorSeries, id: string, date: string, value: number) {
  const existing = series[id] ? [...series[id]] : [];
  if (existing.length && existing[existing.length - 1].date === date) {
    existing[existing.length - 1] = { date, value };
  } else {
    existing.push({ date, value });
  }
  return existing;
}

export async function fetchNoaaClimate(currentSeries: IndicatorSeries): Promise<SourceResult> {
  const stationId = process.env.NOAA_STATION_ID;
  const token = process.env.NOAA_TOKEN;
  if (!stationId || !token) {
    return { updatedSeries: {}, logs: ["Missing NOAA_STATION_ID or NOAA_TOKEN"] };
  }

  const year = Number(process.env.NOAA_YEAR ?? new Date().getFullYear() - 1);
  const previousYear = year - 1;

  const tmaxValues = await fetchNoaaData(stationId, token, year, "TMAX");
  const tmaxCelsius = tmaxValues.map((value) => value / 10);
  const extremeHeatDays = tmaxCelsius.filter((value) => value >= 32.2).length;

  const prcpValues = await fetchNoaaData(stationId, token, year, "PRCP");
  const prcpPrev = await fetchNoaaData(stationId, token, previousYear, "PRCP");
  const totalPrcp = prcpValues.reduce((sum, value) => sum + value, 0);
  const totalPrev = prcpPrev.reduce((sum, value) => sum + value, 0) || 1;
  const anomaly = ((totalPrcp - totalPrev) / totalPrev) * 100;

  const period = `${year}`;
  const updatedSeries: Partial<IndicatorSeries> = {
    extreme_heat_days: appendPoint(currentSeries, "extreme_heat_days", period, extremeHeatDays),
    precipitation_anomaly: appendPoint(currentSeries, "precipitation_anomaly", period, anomaly)
  };

  return { updatedSeries, logs: [`NOAA station ${stationId} year ${year}`] };
}
