import React from "react";
import { parseMaybeJson } from "@/lib/utils";

function normalizePoint(item) {
  const parsed = parseMaybeJson(item);
  if (typeof parsed === "string") {
    return { objection: parsed, rebuttal: "" };
  }
  if (parsed && typeof parsed === "object") {
    return {
      objection: parsed.objection || parsed.question || parsed.concern || "Objection",
      rebuttal: parsed.rebuttal || parsed.response || parsed.answer || "",
    };
  }
  return null;
}

export default function NegotiationPanel({ points }) {
  const items = (Array.isArray(points) ? points : []).map(normalizePoint).filter(Boolean);
  if (!items.length) return null;

  return (
    <section className="result-card">
      <div className="result-kicker result-kicker-warn">Sponsor concerns</div>
      <h3 className="result-section-title mt-1">Questions the sponsor may ask</h3>
      <p className="muted mt-2 text-lg leading-8 max-w-5xl">
        Use these ready-made answers during calls or meetings when the sponsor raises doubts.
      </p>

      <div className="grid gap-4 mt-5">
        {items.slice(0, 4).map((item, index) => (
          <article key={index} className="result-accent-card result-accent-card-warn">
            <div className="result-eyebrow">Question {index + 1}</div>
            <div className="result-action-title mt-2">“{item.objection}”</div>
            {item.rebuttal ? (
              <p className="muted mt-3 leading-8">
                <span className="font-black text-[var(--warn)]">Simple reply:</span> {item.rebuttal}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
