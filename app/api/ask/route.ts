import { NextRequest, NextResponse } from "next/server";

import { getCatalog, getIndicatorDefinitions, getIndicatorSeries } from "@/lib/data";
import { buildIndicatorSummary } from "@/lib/indicators";
import { formatValue } from "@/lib/format";

const INJECTION_PATTERNS = [
  /ignore (previous|above)/i,
  /system prompt/i,
  /developer message/i,
  /bypass/i,
  /jailbreak/i
];

const PII_PATTERNS = [/social security/i, /ssn/i, /credit card/i, /email/i, /phone/i];

const KEYWORD_MAP: Record<string, string[]> = {
  Housing: ["rent", "housing", "permit", "vacancy", "afford"],
  Mobility: ["mobility", "transit", "commute", "traffic", "rail", "bus", "pothole"],
  Climate: ["climate", "heat", "precip", "air quality", "aqi"],
  Economy: ["economy", "job", "employment", "unemployment", "payroll"],
  Equity: ["equity", "inequality", "disparity", "health"],
  Governance: ["311", "service", "response", "resolution"],
  "Quality of Life": ["green", "parks", "open space"]
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const question = String(body?.question ?? "").slice(0, 800);

  if (!question.trim()) {
    return NextResponse.json({
      answer: "Please enter a question to analyze Lowell’s indicators.",
      citations: [],
      warnings: ["Empty prompt"]
    });
  }

  if (INJECTION_PATTERNS.some((pattern) => pattern.test(question))) {
    return NextResponse.json({
      answer:
        "Request cannot be processed. The assistant only answers grounded questions using approved datasets.",
      citations: [],
      warnings: ["Prompt injection detected"]
    });
  }

  if (PII_PATTERNS.some((pattern) => pattern.test(question))) {
    return NextResponse.json({
      answer:
        "This assistant does not process personal or sensitive information. Please ask about aggregated indicators or citywide trends.",
      citations: [],
      warnings: ["PII detected"]
    });
  }

  const definitions = getIndicatorDefinitions();
  const series = getIndicatorSeries();
  const summaries = definitions.map((def) => buildIndicatorSummary(def, series[def.id] ?? []));

  const matchedPillars = new Set<string>();
  const lower = question.toLowerCase();
  Object.entries(KEYWORD_MAP).forEach(([pillar, keywords]) => {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      matchedPillars.add(pillar);
    }
  });

  const relevant = summaries.filter((summary) =>
    matchedPillars.size ? matchedPillars.has(summary.pillar) : true
  );

  const selected = relevant.length ? relevant : summaries;
  const top = selected.slice(0, 6);

  const lines = top.map((item) => {
    const value = formatValue(item.latest, item.format);
    const delta = item.delta > 0 ? "+" : "";
    return `${item.label}: ${value} (${item.trend}, ${delta}${item.delta.toFixed(2)} vs last period)`;
  });

  const answer = [
    "Here is a grounded snapshot based on the latest curated indicators:",
    ...lines,
    "Use this as directional guidance; quarterly refreshes may shift the figures."
  ].join("\n");

  const catalog = getCatalog();
  const dataSourceIds = new Set<string>();
  top.forEach((item) => item.dataSourceIds.forEach((id) => dataSourceIds.add(id)));

  const citations = Array.from(dataSourceIds)
    .map((id) => catalog.find((entry) => entry.id === id))
    .filter(Boolean)
    .map((entry) => ({
      id: entry!.id,
      name: entry!.name,
      url: entry!.url
    }));

  return NextResponse.json({
    answer,
    citations,
    warnings: ["LLM provider not configured; using deterministic summaries."]
  });
}
