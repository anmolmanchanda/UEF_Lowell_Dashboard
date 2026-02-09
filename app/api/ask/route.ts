import { NextRequest, NextResponse } from "next/server";

import { getCatalog, getIndicatorDefinitions, getIndicatorSeries, getInternalAggregates } from "@/lib/data";
import { buildIndicatorSummary } from "@/lib/indicators";
import { formatValue } from "@/lib/format";

import OpenAI from "openai";

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

const MAX_INDICATORS = 8;

const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const MODEL_MINI = process.env.OPENAI_MODEL_MINI ?? "gpt-5-mini";
const MODEL_NARRATIVE = process.env.OPENAI_MODEL_NARRATIVE ?? "gpt-5.2";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const question = String(body?.question ?? "").slice(0, 1200);
  const task = body?.task === "narrative" ? "narrative" : "qa";
  const modelPreference = body?.model === "flagship" ? "flagship" : "mini";

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

  const definitions = await getIndicatorDefinitions();
  const series = await getIndicatorSeries();
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
  const top = selected.slice(0, MAX_INDICATORS);

  const lines = top.map((item) => {
    const value = formatValue(item.latest, item.format);
    const delta = item.delta > 0 ? "+" : "";
    return `${item.label}: ${value} (${item.trend}, ${delta}${item.delta.toFixed(2)} vs last period)`;
  });

  const allowAggregates = process.env.ALLOW_INTERNAL_AGGREGATES !== "false";
  const internalAggregates = allowAggregates ? await getInternalAggregates() : null;

  const baseAnswer = [
    "Here is a grounded snapshot based on the latest curated indicators:",
    ...lines,
    "Use this as directional guidance; quarterly refreshes may shift the figures."
  ].join("\n");

  const catalog = await getCatalog();
  const dataSourceIds = new Set<string>();
  top.forEach((item) => item.dataSourceIds.forEach((id) => dataSourceIds.add(id)));
  if (internalAggregates) {
    dataSourceIds.add("internal_aggregates");
  }

  const citations = Array.from(dataSourceIds)
    .map((id) => catalog.find((entry) => entry.id === id))
    .filter(Boolean)
    .map((entry) => ({
      id: entry!.id,
      name: entry!.name,
      url: entry!.url
    }));

  if (!openai) {
    return NextResponse.json({
      answer: baseAnswer,
      citations,
      warnings: ["OpenAI API key not configured; using deterministic summaries."],
      modelUsed: null
    });
  }

  const model =
    task === "narrative" && modelPreference === "flagship" ? MODEL_NARRATIVE : MODEL_MINI;

  const context = {
    question,
    indicators: top.map((item) => ({
      label: item.label,
      pillar: item.pillar,
      latest: item.latest,
      previous: item.previous,
      trend: item.trend,
      delta: item.delta,
      unit: item.unit
    })),
    internalAggregates: internalAggregates
      ? {
          summary: internalAggregates.summary,
          by_department: internalAggregates.by_department
        }
      : null
  };

  const prompt = [
    "You are the Lowell Urban Transformation assistant.",
    "Use only the provided context. Do not invent data.",
    "If something is missing, say so.",
    task === "narrative"
      ? "Write a concise quarterly narrative with highlights, bottlenecks, and risks."
      : "Answer the question with 3-6 bullet points and a short summary.",
    "Context:",
    JSON.stringify(context, null, 2)
  ].join("\n");

  try {
    const maxOutputTokens = task === "narrative" ? 1200 : 450;
    const response = await openai.responses.create({
      model,
      input: prompt,
      max_output_tokens: maxOutputTokens
    });

    const answer = response.output_text ?? baseAnswer;

    return NextResponse.json({
      answer,
      citations,
      warnings: internalAggregates ? ["Includes aggregated internal operational metrics."] : [],
      modelUsed: model
    });
  } catch (error) {
    return NextResponse.json({
      answer: baseAnswer,
      citations,
      warnings: ["OpenAI request failed; fallback to deterministic summaries."],
      modelUsed: model
    });
  }
}
