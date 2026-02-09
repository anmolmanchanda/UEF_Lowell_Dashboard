import { NextRequest, NextResponse } from "next/server";

import { getIndicatorSeries } from "@/lib/data";
import { writeIndicatorSeries } from "@/lib/db";
import { setCachedJson } from "@/lib/cache";
import { refreshAllSources } from "@/lib/sources/registry";
import { putJson } from "@/lib/blob";
import type { IndicatorSeries } from "@/lib/types";

export async function GET(request: NextRequest) {
  return handleRefresh(request);
}

export async function POST(request: NextRequest) {
  return handleRefresh(request);
}

async function handleRefresh(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const incoming = request.nextUrl.searchParams.get("secret");
  if (secret && secret !== incoming) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const currentSeries = await getIndicatorSeries();
  const { updates, logs } = await refreshAllSources(currentSeries);

  const merged: IndicatorSeries = { ...currentSeries };
  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      merged[key] = value;
    }
  }
  const hasUpdates = Object.keys(updates).length > 0;

  if (hasUpdates) {
    await writeIndicatorSeries(merged);
    await setCachedJson("indicator_series", merged, 60 * 60);
    await putJson("snapshots/indicator-series.json", merged);
  }

  return NextResponse.json({
    ok: true,
    updated: Object.keys(updates),
    logs
  });
}
