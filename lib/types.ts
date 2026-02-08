export type Thresholds = {
  direction: "up" | "down";
  good: number;
  warn: number;
  alert: number;
};

export type IndicatorDefinition = {
  id: string;
  label: string;
  pillar: string;
  unit: string;
  format: string;
  description: string;
  dataSourceIds: string[];
  updateFrequency: string;
  thresholds: Thresholds;
};

export type IndicatorValuePoint = {
  date: string;
  value: number;
};

export type IndicatorSeries = Record<string, IndicatorValuePoint[]>;

export type DatasetCatalogEntry = {
  id: string;
  name: string;
  source: string;
  url?: string;
  license: string;
  refreshCadence: string;
  lastUpdated: string;
  notes?: string;
};

export type Neighborhood = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  metrics: Record<string, number>;
};

export type Project = {
  id: string;
  name: string;
  department: string;
  status: "Explore" | "Pilot" | "Scale" | "Commercialize";
  budget: number;
  timeline: string;
  outcome: string;
  metrics: string[];
  notes?: string;
};
