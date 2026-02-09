import { NextResponse } from "next/server";

import { getCatalog } from "@/lib/data";

export async function GET() {
  const data = await getCatalog();
  return NextResponse.json({ data });
}
