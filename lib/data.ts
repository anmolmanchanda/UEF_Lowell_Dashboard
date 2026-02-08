import catalog from "../data/catalog.json";
import indicatorDefinitions from "../data/indicator-definitions.json";
import indicatorValues from "../data/indicator-values.json";
import neighborhoods from "../data/neighborhoods.json";
import projects from "../data/projects.json";
import requestsSummary from "../data/311-summary.json";

import {
  DatasetCatalogEntry,
  IndicatorDefinition,
  IndicatorSeries,
  Neighborhood,
  Project
} from "./types";

export function getCatalog(): DatasetCatalogEntry[] {
  return catalog as DatasetCatalogEntry[];
}

export function getIndicatorDefinitions(): IndicatorDefinition[] {
  return indicatorDefinitions as IndicatorDefinition[];
}

export function getIndicatorSeries(): IndicatorSeries {
  return indicatorValues as IndicatorSeries;
}

export function getNeighborhoods(): Neighborhood[] {
  return neighborhoods as Neighborhood[];
}

export function getProjects(): Project[] {
  return projects as Project[];
}

export function getRequestsSummary():
  { category: string; volume: number; medianResolutionDays: number }[] {
  return requestsSummary as { category: string; volume: number; medianResolutionDays: number }[];
}
