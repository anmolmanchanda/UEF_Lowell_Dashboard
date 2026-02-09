import { neon } from "@neondatabase/serverless";

import { IndicatorSeries, Neighborhood, Project, InternalAggregate } from "./types";

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;

async function ensureSchema() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS indicator_series (
      id TEXT PRIMARY KEY,
      series JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS neighborhoods (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS internal_aggregates (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
}

export async function readIndicatorSeries(): Promise<IndicatorSeries | null> {
  if (!sql) return null;
  await ensureSchema();
  const rows = (await sql`
    SELECT id, series FROM indicator_series;
  `) as { id: string; series: unknown }[];
  if (!rows.length) return null;
  const result: IndicatorSeries = {};
  rows.forEach((row) => {
    result[row.id] = row.series as IndicatorSeries[string];
  });
  return result;
}

export async function writeIndicatorSeries(series: IndicatorSeries) {
  if (!sql) return;
  await ensureSchema();
  const entries = Object.entries(series);
  for (const [id, payload] of entries) {
    await sql`
      INSERT INTO indicator_series (id, series, updated_at)
      VALUES (${id}, ${JSON.stringify(payload)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        series = EXCLUDED.series,
        updated_at = NOW();
    `;
  }
}

export async function readNeighborhoods(): Promise<Neighborhood[] | null> {
  if (!sql) return null;
  await ensureSchema();
  const rows = (await sql`
    SELECT payload FROM neighborhoods WHERE id = 'default' LIMIT 1;
  `) as { payload: Neighborhood[] }[];
  return rows[0]?.payload ?? null;
}

export async function writeNeighborhoods(payload: Neighborhood[]) {
  if (!sql) return;
  await ensureSchema();
  await sql`
    INSERT INTO neighborhoods (id, payload, updated_at)
    VALUES ('default', ${JSON.stringify(payload)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = NOW();
  `;
}

export async function readProjects(): Promise<Project[] | null> {
  if (!sql) return null;
  await ensureSchema();
  const rows = (await sql`
    SELECT payload FROM projects WHERE id = 'default' LIMIT 1;
  `) as { payload: Project[] }[];
  return rows[0]?.payload ?? null;
}

export async function writeProjects(payload: Project[]) {
  if (!sql) return;
  await ensureSchema();
  await sql`
    INSERT INTO projects (id, payload, updated_at)
    VALUES ('default', ${JSON.stringify(payload)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = NOW();
  `;
}

export async function readInternalAggregates(): Promise<InternalAggregate | null> {
  if (!sql) return null;
  await ensureSchema();
  const rows = (await sql`
    SELECT payload FROM internal_aggregates WHERE id = 'default' LIMIT 1;
  `) as { payload: InternalAggregate }[];
  return rows[0]?.payload ?? null;
}

export async function writeInternalAggregates(payload: InternalAggregate) {
  if (!sql) return;
  await ensureSchema();
  await sql`
    INSERT INTO internal_aggregates (id, payload, updated_at)
    VALUES ('default', ${JSON.stringify(payload)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = NOW();
  `;
}
