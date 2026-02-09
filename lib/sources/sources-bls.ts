import { IndicatorSeries } from "../types";
import { SourceResult } from "./registry";

type BlsResponse = {
  status: string;
  message?: string[];
  Results?: {
    series: {
      seriesID: string;
      data: {
        year: string;
        period: string;
        value: string;
      }[];
    }[];
  };
};

function appendPoint(series: IndicatorSeries, id: string, date: string, value: number) {
  const existing = series[id] ? [...series[id]] : [];
  if (existing.length && existing[existing.length - 1].date === date) {
    existing[existing.length - 1] = { date, value };
  } else {
    existing.push({ date, value });
  }
  return existing;
}

function parseLatest(seriesData: { year: string; period: string; value: string }[]) {
  const filtered = seriesData
    .filter((item) => item.period.startsWith("M"))
    .sort((a, b) => (a.year + a.period).localeCompare(b.year + b.period));
  const latest = filtered[filtered.length - 1];
  return latest ? { date: `${latest.year}-${latest.period}`.replace("M", "") , value: Number(latest.value) } : null;
}

function parseYoY(seriesData: { year: string; period: string; value: string }[]) {
  const filtered = seriesData
    .filter((item) => item.period.startsWith("M"))
    .sort((a, b) => (a.year + a.period).localeCompare(b.year + b.period));
  const latest = filtered[filtered.length - 1];
  if (!latest) return null;
  const targetPeriod = latest.period;
  const previous = filtered.find(
    (item) => item.period === targetPeriod && Number(item.year) === Number(latest.year) - 1
  );
  if (!previous) return null;
  const latestValue = Number(latest.value);
  const previousValue = Number(previous.value) || 1;
  const change = ((latestValue - previousValue) / previousValue) * 100;
  return { date: `${latest.year}-${latest.period}`.replace("M", "") , value: change };
}

export async function fetchBlsIndicators(currentSeries: IndicatorSeries): Promise<SourceResult> {
  const unemploymentSeries = process.env.BLS_SERIES_UNEMPLOYMENT;
  const employmentSeries = process.env.BLS_SERIES_EMPLOYMENT;
  const apiKey = process.env.BLS_API_KEY;

  if (!unemploymentSeries && !employmentSeries) {
    return { updatedSeries: {}, logs: ["Missing BLS series IDs"] };
  }

  const seriesIds = [unemploymentSeries, employmentSeries].filter(Boolean) as string[];
  const endYear = Number(process.env.BLS_END_YEAR ?? new Date().getFullYear());
  const startYear = Number(process.env.BLS_START_YEAR ?? endYear - 3);

  const payload: Record<string, unknown> = {
    seriesid: seriesIds,
    startyear: String(startYear),
    endyear: String(endYear)
  };
  if (apiKey) payload.registrationkey = apiKey;

  const response = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`BLS API error ${response.status}`);
  }

  const data = (await response.json()) as BlsResponse;
  if (!data.Results?.series?.length) {
    return { updatedSeries: {}, logs: ["BLS returned no series data"] };
  }

  const updatedSeries: Partial<IndicatorSeries> = {};

  for (const series of data.Results.series) {
    if (series.seriesID === unemploymentSeries) {
      const latest = parseLatest(series.data);
      if (latest) {
        updatedSeries.unemployment_rate = appendPoint(
          currentSeries,
          "unemployment_rate",
          latest.date,
          latest.value
        );
      }
    }

    if (series.seriesID === employmentSeries) {
      const yoy = parseYoY(series.data);
      if (yoy) {
        updatedSeries.job_growth_proxy = appendPoint(
          currentSeries,
          "job_growth_proxy",
          yoy.date,
          yoy.value
        );
      }
    }
  }

  return { updatedSeries, logs: ["BLS updated"] };
}
