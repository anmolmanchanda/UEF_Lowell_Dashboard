"use client";

import { useMemo, useState } from "react";

type AskResponse = {
  answer: string;
  citations: { id: string; name: string; url?: string }[];
  warnings?: string[];
  modelUsed?: string | null;
};

const quickPrompts = [
  "Summarize housing affordability trends and risks.",
  "What changed in mobility and transit reliability this quarter?",
  "Explain the biggest equity gaps across neighborhoods.",
  "Which indicators show the strongest improvement this quarter?"
];

const MODEL_PRICING = {
  mini: { label: "GPT-5 mini", input: 0.25, output: 2.0 },
  flagship: { label: "GPT-5.2", input: 1.75, output: 14.0 }
};

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function estimateCost(tokensIn: number, tokensOut: number, model: keyof typeof MODEL_PRICING) {
  const pricing = MODEL_PRICING[model];
  const inputCost = (tokensIn / 1_000_000) * pricing.input;
  const outputCost = (tokensOut / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

export default function AskLowellPanel() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [task, setTask] = useState<"qa" | "narrative">("qa");
  const [expectedOutputTokens, setExpectedOutputTokens] = useState(1200);

  const tokensIn = useMemo(() => estimateTokens(question || " "), [question]);
  const miniCost = estimateCost(tokensIn, expectedOutputTokens, "mini");
  const flagshipCost = estimateCost(tokensIn, expectedOutputTokens, "flagship");

  const ask = async (prompt: string, modelPreference: "mini" | "flagship" = "mini") => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt, task, model: modelPreference })
      });
      const data = (await res.json()) as AskResponse;
      setResponse(data);
    } catch (error) {
      setResponse({
        answer: "Unable to reach the assistant. Try again later.",
        citations: [],
        warnings: ["Network error"]
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Ask Lowell</h2>
      <p className="section-subtitle">
        Evidence-linked answers with strict data minimization. Aggregated internal metrics are
        allowed; record-level data is excluded.
      </p>
      <div className="mode-toggle" style={{ marginBottom: 10 }}>
        <button
          className={task === "qa" ? "" : "secondary"}
          onClick={() => setTask("qa")}
          disabled={loading}
        >
          Q&A mode
        </button>
        <button
          className={task === "narrative" ? "" : "secondary"}
          onClick={() => setTask("narrative")}
          disabled={loading}
        >
          Quarterly narrative
        </button>
      </div>
      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ask about indicators, neighborhoods, or transformation goals."
      />
      <button onClick={() => ask(question, "mini")} disabled={loading}>
        {loading ? "Thinking..." : "Ask the assistant"}
      </button>

      {task === "narrative" ? (
        <div className="response" style={{ marginTop: 12 }}>
          <strong>Cost estimate (approx.)</strong>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Input tokens: {tokensIn.toLocaleString()} · Output tokens: {expectedOutputTokens}
          </div>
          <label style={{ display: "block", marginTop: 10, fontSize: 12 }}>
            Expected output length
            <input
              type="range"
              min={400}
              max={3000}
              step={100}
              value={expectedOutputTokens}
              onChange={(event) => setExpectedOutputTokens(Number(event.target.value))}
              style={{ width: "100%" }}
            />
          </label>
          <div style={{ display: "grid", gap: 6, marginTop: 10, fontSize: 13 }}>
            <div>
              {MODEL_PRICING.mini.label}: ${miniCost.toFixed(4)} estimated
            </div>
            <div>
              {MODEL_PRICING.flagship.label}: ${flagshipCost.toFixed(4)} estimated
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
            Estimates are approximate; tokenization and output length can vary.
          </div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            <button onClick={() => ask(question, "mini")} disabled={loading}>
              Run quarterly report with GPT-5 mini
            </button>
            <button onClick={() => ask(question, "flagship")} disabled={loading}>
              Run quarterly report with GPT-5.2
            </button>
          </div>
        </div>
      ) : null}

      <div className="citations" style={{ marginTop: 12 }}>
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            className="secondary"
            style={{ textAlign: "left" }}
            onClick={() => {
              setQuestion(prompt);
              ask(prompt, "mini");
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {response ? (
        <div className="response">
          <div>{response.answer}</div>
          {response.modelUsed ? (
            <div className="citations">Model used: {response.modelUsed}</div>
          ) : null}
          {response.citations.length ? (
            <div className="citations">
              <strong>Sources</strong>
              {response.citations.map((cite) => (
                <div key={cite.id}>
                  {cite.url ? (
                    <a href={cite.url} target="_blank" rel="noreferrer">
                      {cite.name}
                    </a>
                  ) : (
                    cite.name
                  )}
                </div>
              ))}
            </div>
          ) : null}
          {response.warnings?.length ? (
            <div className="citations">
              <strong>Warnings</strong>
              {response.warnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
