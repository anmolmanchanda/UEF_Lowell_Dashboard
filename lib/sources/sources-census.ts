import { IndicatorSeries } from "../types";
import { SourceResult } from "./registry";

const DEFAULT_YEAR = "2022";
const DEFAULT_STATE = "25"; // Massachusetts

function appendPoint(series: IndicatorSeries, id: string, date: string, value: number) {
  const existing = series[id] ? [...series[id]] : [];
  if (existing.length && existing[existing.length - 1].date === date) {
    existing[existing.length - 1] = { date, value };
  } else {
    existing.push({ date, value });
  }
  return existing;
}

export async function fetchCensusIndicators(currentSeries: IndicatorSeries): Promise<SourceResult> {
  const year = process.env.CENSUS_YEAR ?? DEFAULT_YEAR;
  const state = process.env.CENSUS_STATE ?? DEFAULT_STATE;
  const place = process.env.CENSUS_PLACE_CODE;
  const apiKey = process.env.CENSUS_API_KEY;

  if (!place || !apiKey) {
    return { updatedSeries: {}, logs: ["Missing CENSUS_PLACE_CODE or CENSUS_API_KEY"] };
  }

  const variables = ["NAME", "B25064_001E", "B08303_001E"]; // median rent, mean commute time
  const url = `https://api.census.gov/data/${year}/acs/acs5?get=${variables.join(",")}&for=place:${place}&in=state:${state}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Census API error ${response.status}`);
  }

  const data = (await response.json()) as string[][];
  const row = data[1];
  if (!row) {
    throw new Error("No Census data returned for place.");
  }

  const medianRent = Number(row[1]);
  const commute = Number(row[2]);

  const period = `${year}`;
  const updatedSeries: Partial<IndicatorSeries> = {
    median_rent: appendPoint(currentSeries, "median_rent", period, medianRent),
    commute_time: appendPoint(currentSeries, "commute_time", period, commute)
  };

  return { updatedSeries, logs: [`Census: ${row[0]}`] };
}
