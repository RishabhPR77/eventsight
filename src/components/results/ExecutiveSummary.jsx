import React from "react";
import { bandStyles, clampNum, fmtINR } from "@/lib/utils";

function Chip({ children, tone }) {
  return (
    <span className="result-chip" style={tone ? { background: tone.chipBg, color: tone.chipText } : undefined}>
      {children}
    </span>
  );
}

function StatBox({ label, value, sub }) {
  return (
    <div className="result-stat-box">
      <div className="result-eyebrow">{label}</div>
      <div className="result-stat-value">{value}</div>
      {sub ? <div className="result-subcopy">{sub}</div> : null}
    </div>
  );
}

function getFriendlyVerdict(band, probPct) {
  if (band === "HIGH") return "Strong chance of getting this sponsor";
  if (band === "MEDIUM") return "Decent chance, but the pitch needs work";
  if (band === "LOW") return `Low chance of getting this sponsor${probPct ? ` (${probPct})` : ""}`;
  if (band === "UNLIKELY") return "Very difficult to close this sponsor";
  return "Sponsorship outcome summary";
}

function getVerdictSummary({ band, probPct, synergy, crowd, comp, cost }) {
  if (band === "HIGH") {
    return `This looks promising. The brand-event match is strong, the expected audience looks useful, and the deal is easier to justify for a sponsor.`;
  }
  if (band === "MEDIUM") {
    return `This can still work, but the sponsor may need a clearer pitch, better packaging, or stronger proof of audience value before saying yes.`;
  }
  if (band === "LOW") {
    return `Right now this deal may be hard to close. The model estimates only a ${probPct || "low"} chance because the brand match is ${synergy}%${comp ? `, there are ${comp} other competing events` : ""}${cost ? `, and the cost per person reached is ₹${cost.toFixed(2)}` : ""}.`;
  }
  if (band === "UNLIKELY") {
    return `This looks like a weak sponsorship opportunity in its current form. You would likely need to change the price, audience targeting, or event positioning before approaching sponsors.`;
  }
  return `This score uses brand fit, expected audience, competition, and pricing to estimate how likely a sponsor is to accept the proposal.`;
}

function getMainReason({ synergy, comp, cost, crowd }) {
  const reasons = [];

  if (synergy < 40) reasons.push("the brand and event do not look like a strong match");
  else if (synergy < 60) reasons.push("the brand match is only average");
  else reasons.push("the brand match is a positive signal");

  if (comp >= 3) reasons.push(`the sponsor may split attention across ${comp} nearby events`);
  else if (comp > 0) reasons.push(`there is some competition from ${comp} other event${comp > 1 ? "s" : ""}`);

  if (cost >= 100) reasons.push("the cost per person reached is quite high");
  else if (cost >= 40) reasons.push("the cost per person reached is on the higher side");
  else if (cost > 0) reasons.push("the cost per person reached is manageable");

  if (crowd > 0 && crowd < 300) reasons.push("the expected audience size is modest");

  return reasons.slice(0, 3);
}

function prettyValue(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
}

export default function ExecutiveSummary({ brandCategory, dealData, result }) {
  if (!result) return null;

  const band = result.verdict_band || "UNKNOWN";
  const styles = bandStyles(band);

  const crowd = clampNum(result.attendance, 0);
  const prob = result.feasibility_probability;
  const probPctNumber = prob === null || prob === undefined ? null : Math.round(clampNum(prob, 0) * 100);
  const probPct = probPctNumber === null ? "" : `${probPctNumber}%`;
  const synergy = Math.round(clampNum(result?.breakdown?.brand_synergy, 0));
  const occupancy = clampNum(result?.breakdown?.occupancy_rate, 0);
  const cost = clampNum(result?.breakdown?.cost_per_head, 0);
  const comp = clampNum(result?.breakdown?.competing_events, 0);

  const eventType = prettyValue(
    dealData?.event_type || dealData?.eventCategory?.name || dealData?.category?.name,
    "Event type not added"
  );
  const city = prettyValue(dealData?.city || dealData?.location || dealData?.venueCity, "City not added");

  const reasons = getMainReason({ synergy, comp, cost, crowd });

  return (
    <section className="result-card result-summary-card">
      <div className="result-summary-grid">
        <div>
          <div className="result-kicker" style={{ color: styles.text }}>Simple result</div>
          <h2 className="result-hero-title" style={{ color: styles.text }}>
            {getFriendlyVerdict(band, probPct)}
          </h2>

          <p className="muted text-lg leading-8 mt-4 max-w-4xl">
            {getVerdictSummary({ band, probPct, synergy, crowd, comp, cost })}
          </p>

          <div className="result-chip-row">
            <Chip tone={styles}>{result.verdict_label || "Result"}</Chip>
            <Chip>{`Brand category: ${brandCategory || "Not added"}`}</Chip>
            <Chip>{`Event: ${eventType}`}</Chip>
            <Chip>{`Location: ${city}`}</Chip>
          </div>

          <div className="result-note-card mt-6">
            <div className="result-eyebrow">Main reasons</div>
            <ul className="result-list mt-3">
              {reasons.map((reason, index) => (
                <li key={index}>{reason.charAt(0).toUpperCase() + reason.slice(1)}.</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="result-stat-grid">
            <StatBox label="Chance sponsor says yes" value={probPct || "—"} sub="Estimated approval chance" />
            <StatBox label="Brand match" value={`${synergy}%`} sub="How well the sponsor fits this event" />
            <StatBox label="Expected attendees" value={crowd ? fmtINR(crowd) : "—"} sub="Approximate crowd size" />
            <StatBox label="Other similar events" value={comp || 0} sub="More events can reduce sponsor attention" />
          </div>

          <div className="result-inline-card">
            <div className="flex items-center justify-between font-extrabold text-[var(--text-soft)] gap-4">
              <span>Expected turnout</span>
              <span>{occupancy.toFixed(1)}%</span>
            </div>
            <div className="result-progress mt-3">
              <div className="result-progress-bar" style={{ width: `${Math.max(0, Math.min(100, occupancy))}%` }} />
            </div>
            <div className="flex items-center justify-between mt-5 font-extrabold text-[var(--text-soft)] gap-4">
              <span>Cost per person reached</span>
              <span>{cost ? `₹${cost.toFixed(2)}` : "—"}</span>
            </div>
            <p className="muted mt-3 text-sm leading-6">
              Lower cost per person usually makes the deal easier for sponsors to accept.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
