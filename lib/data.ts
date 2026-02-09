import catalog from "../data/catalog.json";
import indicatorDefinitions from "../data/indicator-definitions.json";
import indicatorValues from "../data/indicator-values.json";
import neighborhoods from "../data/neighborhoods.json";
import projects from "../data/projects.json";
import requestsSummary from "../data/311-summary.json";
import internalAggregates from "../data/internal-aggregates.json";

import {
  DatasetCatalogEntry,
  IndicatorDefinition,
  IndicatorSeries,
  Neighborhood,
  Project,
  InternalAggregate
} from "./types";
import {
  readIndicatorSeries,
  readNeighborhoods,
  readProjects,
  readInternalAggregates
} from "./db";
import { getCachedJson, setCachedJson } from "./cache";

const DEFAULT_CACHE_SECONDS = 60 * 60;

export async function getCatalog(): Promise<DatasetCatalogEntry[]> {
  return catalog as DatasetCatalogEntry[];
}

export async function getIndicatorDefinitions(): Promise<IndicatorDefinition[]> {
  return indicatorDefinitions as IndicatorDefinition[];
}

export async function getIndicatorSeries(): Promise<IndicatorSeries> {
  const cached = await getCachedJson<IndicatorSeries>("indicator_series");
  if (cached) return cached;

  let dbSeries: IndicatorSeries | null = null;
  try {
    dbSeries = await readIndicatorSeries();
  } catch (error) {
    dbSeries = null;
  }
  const result = dbSeries ?? (indicatorValues as IndicatorSeries);
  await setCachedJson("indicator_series", result, DEFAULT_CACHE_SECONDS);
  return result;
}

export async function getNeighborhoods(): Promise<Neighborhood[]> {
  const cached = await getCachedJson<Neighborhood[]>("neighborhoods");
  if (cached) return cached;

  let dbNeighborhoods: Neighborhood[] | null = null;
  try {
    dbNeighborhoods = await readNeighborhoods();
  } catch (error) {
    dbNeighborhoods = null;
  }
  const result = dbNeighborhoods ?? (neighborhoods as Neighborhood[]);
  await setCachedJson("neighborhoods", result, DEFAULT_CACHE_SECONDS);
  return result;
}

export async function getProjects(): Promise<Project[]> {
  const cached = await getCachedJson<Project[]>("projects");
  if (cached) return cached;

  let dbProjects: Project[] | null = null;
  try {
    dbProjects = await readProjects();
  } catch (error) {
    dbProjects = null;
  }
  const result = dbProjects ?? (projects as Project[]);
  await setCachedJson("projects", result, DEFAULT_CACHE_SECONDS);
  return result;
}

export async function getRequestsSummary(): Promise<
  { category: string; volume: number; medianResolutionDays: number }[]
> {
  return requestsSummary as { category: string; volume: number; medianResolutionDays: number }[];
}

export async function getInternalAggregates(): Promise<InternalAggregate> {
  const cached = await getCachedJson<InternalAggregate>("internal_aggregates");
  if (cached) return cached;

  let dbAggregates: InternalAggregate | null = null;
  try {
    dbAggregates = await readInternalAggregates();
  } catch (error) {
    dbAggregates = null;
  }
  const result = dbAggregates ?? (internalAggregates as InternalAggregate);
  await setCachedJson("internal_aggregates", result, DEFAULT_CACHE_SECONDS);
  return result;
}
