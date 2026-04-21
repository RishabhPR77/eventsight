import React from "react";
import { parseMaybeJson } from "@/lib/utils";

function normalizeRecommendation(item) {
  const parsed = parseMaybeJson(item);
  if (typeof parsed === "string") {
    return { action: parsed, why: "", expected_effect: "" };
  }
  if (parsed && typeof parsed === "object") {
    return {
      action: parsed.action || parsed.title || "Recommendation",
      why: parsed.why || parsed.reason || parsed.description || "",
      expected_effect: parsed.expected_effect || parsed.impact || parsed.outcome || "",
    };
  }
  return null;
}

export default function RecommendationsPanel({ recs }) {
  const items = (Array.isArray(recs) ? recs : []).map(normalizeRecommendation).filter(Boolean);
  if (!items.length) return null;

  return (
    <section className="result-card">
      <div className="result-kicker result-kicker-good">What to improve</div>
      <h3 className="result-section-title mt-1">Simple ways to increase sponsor interest</h3>
      <p className="muted result-support-copy mt-2 max-w-5xl">
        Start with the biggest issues first. These changes are the easiest way to make the proposal feel safer and more valuable to a sponsor.
      </p>

      <div className="grid gap-3 mt-4">
        {items.map((item, index) => (
          <article key={index} className="result-accent-card result-accent-card-good">
            <div className="result-eyebrow">Step {index + 1}</div>
            <div className="result-action-title mt-2">{item.action}</div>
            {item.why ? <p className="muted mt-2 result-inline-copy">{item.why}</p> : null}
            {item.expected_effect ? <div className="result-impact mt-4">Possible impact: {item.expected_effect}</div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
