import { IndicatorSeries } from "../types";
import { fetchCensusIndicators } from "./sources-census";
import { fetchBlsIndicators } from "./sources-bls";
import { fetchMbtaReliability } from "./sources-mbta";
import { fetchNoaaClimate } from "./sources-noaa";

export type SourceResult = {
  updatedSeries: Partial<IndicatorSeries>;
  logs: string[];
};

export type SourceHandler = {
  id: string;
  label: string;
  cadence: string;
  requiredEnv: string[];
  fetcher: (currentSeries: IndicatorSeries) => Promise<SourceResult>;
};

export const SOURCE_REGISTRY: SourceHandler[] = [
  {
    id: "census_acs",
    label: "Census ACS",
    cadence: "annual",
    requiredEnv: ["CENSUS_API_KEY", "CENSUS_PLACE_CODE"],
    fetcher: fetchCensusIndicators
  },
  {
    id: "bls",
    label: "BLS Employment",
    cadence: "monthly",
    requiredEnv: [],
    fetcher: fetchBlsIndicators
  },
  {
    id: "mbta",
    label: "MBTA API",
    cadence: "hourly",
    requiredEnv: [],
    fetcher: fetchMbtaReliability
  },
  {
    id: "noaa_ncei",
    label: "NOAA NCEI",
    cadence: "monthly",
    requiredEnv: ["NOAA_TOKEN", "NOAA_STATION_ID"],
    fetcher: fetchNoaaClimate
  }
];

export async function refreshAllSources(
  currentSeries: IndicatorSeries
): Promise<{ updates: Partial<IndicatorSeries>; logs: string[] }> {
  const updates: Partial<IndicatorSeries> = {};
  const logs: string[] = [];

  for (const source of SOURCE_REGISTRY) {
    const missing = source.requiredEnv.filter((key) => !process.env[key]);
    if (missing.length) {
      logs.push(`${source.label}: skipped (missing ${missing.join(", ")})`);
      continue;
    }

    try {
      const result = await source.fetcher(currentSeries);
      Object.assign(updates, result.updatedSeries);
      logs.push(`${source.label}: updated ${Object.keys(result.updatedSeries).length} indicators`);
    } catch (error) {
      logs.push(`${source.label}: failed (${(error as Error).message})`);
    }
  }

  return { updates, logs };
}
