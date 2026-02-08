"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "lowell-internal-access";

export default function InternalGate() {
  const accessCode = process.env.NEXT_PUBLIC_ACCESS_CODE ?? "";
  const [ready, setReady] = useState(false);
  const [granted, setGranted] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessCode) {
      setGranted(true);
      setReady(true);
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "granted") {
      setGranted(true);
    }
    setReady(true);
  }, [accessCode]);

  if (!ready || granted || !accessCode) {
    return null;
  }

  const handleSubmit = () => {
    if (value.trim() === accessCode) {
      window.localStorage.setItem(STORAGE_KEY, "granted");
      setGranted(true);
      setError(null);
      return;
    }
    setError("Access code does not match.");
  };

  return (
    <div className="gate-overlay" role="dialog" aria-modal="true">
      <div className="gate-card">
        <h2 style={{ marginTop: 0 }}>Internal Access</h2>
        <p style={{ marginTop: 6, color: "var(--muted)" }}>
          Enter the internal access code to open the dashboard.
        </p>
        <input
          type="password"
          placeholder="Access code"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <button onClick={handleSubmit}>Unlock Dashboard</button>
        {error ? (
          <div style={{ marginTop: 8, color: "var(--signal-red)", fontSize: 12 }}>
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
