"use client";

import { useState } from "react";

type AskResponse = {
  answer: string;
  citations: { id: string; name: string; url?: string }[];
  warnings?: string[];
};

const quickPrompts = [
  "Summarize housing affordability trends and risks.",
  "What changed in mobility and transit reliability this quarter?",
  "Generate a quarterly transformation narrative with highlights and gaps.",
  "Explain the biggest equity gaps across neighborhoods."
];

export default function AskLowellPanel() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);

  const ask = async (prompt: string) => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt })
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
        Evidence-linked answers with strict data minimization.
      </p>
      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ask about indicators, neighborhoods, or transformation goals."
      />
      <button onClick={() => ask(question)} disabled={loading}>
        {loading ? "Thinking..." : "Ask the assistant"}
      </button>
      <button
        className="secondary"
        onClick={() => {
          const prompt = "Generate a quarterly transformation narrative with change highlights, bottlenecks, and risks.";
          setQuestion(prompt);
          ask(prompt);
        }}
        disabled={loading}
      >
        Draft quarterly report
      </button>
      <div className="citations" style={{ marginTop: 12 }}>
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            className="secondary"
            style={{ textAlign: "left" }}
            onClick={() => {
              setQuestion(prompt);
              ask(prompt);
            }}
          >
            {prompt}
          </button>
        ))}
      </div>
      {response ? (
        <div className="response">
          <div>{response.answer}</div>
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
