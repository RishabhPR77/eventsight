import React, { useState } from "react";

export default function OutreachPanel({ text }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <section className="result-card result-outreach-card">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="result-kicker">Ready-to-send message</div>
          <h3 className="result-section-title mt-1">Email draft for the sponsor</h3>
          <p className="muted mt-2">Copy this, replace the name and brand details if needed, then send it.</p>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button onClick={copy} className="btn-secondary !rounded-2xl !px-4 !py-2.5">
            {copied ? "Copied ✅" : "Copy text"}
          </button>
          <button onClick={() => window.print()} className="btn-secondary !rounded-2xl !px-4 !py-2.5">
            Print / Export
          </button>
        </div>
      </div>

      <div className="result-email-surface">{text}</div>
    </section>
  );
}
