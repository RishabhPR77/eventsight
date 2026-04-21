import React from "react";

function friendlyNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildCards(result, brandAnalysis, recommendations) {
  const synergy = Math.round(friendlyNumber(result?.breakdown?.brand_synergy, 0));
  const crowd = Math.round(friendlyNumber(result?.attendance, 0));
  const occupancy = friendlyNumber(result?.breakdown?.occupancy_rate, 0);
  const comp = Math.round(friendlyNumber(result?.breakdown?.competing_events, 0));
  const cost = friendlyNumber(result?.breakdown?.cost_per_head, 0);
  const prob = Math.round(friendlyNumber(result?.feasibility_probability, 0) * 100);

  const positives = [];
  const concerns = [];
  const nextSteps = [];

  if (crowd > 0) positives.push(`The event may still attract around ${crowd.toLocaleString("en-IN")} people.`);
  if (occupancy >= 70) positives.push(`Expected turnout is healthy at about ${occupancy.toFixed(1)}%.`);
  if (synergy >= 60) positives.push(`Brand match is reasonably strong at ${synergy}%.`);
  if (!positives.length) positives.push("There are still some usable signals, but the overall case is not strong enough yet.");

  if (synergy < 45) concerns.push(`Brand match is low (${synergy}%), so the sponsor may not see a clear fit.`);
  if (cost >= 100) concerns.push(`Cost per person reached is high at ₹${cost.toFixed(2)}, which can make the proposal feel expensive.`);
  else if (cost >= 40) concerns.push(`Cost per person reached is a little high at ₹${cost.toFixed(2)}.`);
  if (comp >= 3) concerns.push(`There are ${comp} other competing events, so sponsor attention may get divided.`);
  else if (comp > 0) concerns.push(`There is some competition from ${comp} other event${comp > 1 ? "s" : ""}.`);
  if (prob < 35) concerns.push(`Overall approval chance is currently low at ${prob}%.`);
  if (!concerns.length && brandAnalysis?.fit_reason) concerns.push(brandAnalysis.fit_reason);

  (Array.isArray(recommendations) ? recommendations : []).slice(0, 3).forEach((item) => {
    if (typeof item === "string") nextSteps.push(item);
    else if (item?.action) nextSteps.push(item.action);
  });
  if (!nextSteps.length) {
    nextSteps.push("Improve the package value before approaching the sponsor.");
    nextSteps.push("Show clearer audience proof and stronger credibility signals.");
  }

  return [
    { title: "What looks okay", items: positives },
    { title: "What may worry the sponsor", items: concerns },
    { title: "What you should do next", items: nextSteps },
  ];
}

export default function AiInsightsPanel({ insights, brandAnalysis, result }) {
  const cards = buildCards(result, brandAnalysis, result?.recommendations);
  const headline = insights?.headline || "Why the result looks like this";
  const explanation = insights?.explanation || brandAnalysis?.summary || "We looked at brand fit, expected audience, cost, and competition to estimate how easy this sponsorship will be to close.";

  return (
    <section className="result-card">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="result-kicker">Understanding the result</div>
          <h3 className="result-section-title mt-1">{headline}</h3>
          <p className="muted result-support-copy mt-2 max-w-5xl">{explanation}</p>
        </div>
        <span className="result-chip">Easy summary</span>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.title} className="result-inline-card h-full">
            <div className="result-eyebrow">{card.title}</div>
            <ul className="result-list mt-3">
              {card.items.slice(0, 6).map((item, index) => (
                <li key={`${card.title}-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="result-caution">
        This is a smart estimate to guide decisions. It helps you pitch better, but it does not guarantee a sponsor response.
      </div>
    </section>
  );
}
