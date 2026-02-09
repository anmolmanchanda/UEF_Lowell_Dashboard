import { NextResponse } from "next/server";

import { getIndicatorDefinitions, getIndicatorSeries } from "@/lib/data";
import { buildIndicatorSummary } from "@/lib/indicators";

export async function GET() {
  const definitions = await getIndicatorDefinitions();
  const series = await getIndicatorSeries();
  const summaries = definitions.map((def) => buildIndicatorSummary(def, series[def.id] ?? []));

  return NextResponse.json({ definitions, series, summaries });
}
