import { useState } from "react";
import { AlertTriangle, Check, CheckCircle2, Copy, Lightbulb, ListChecks, Mail, MessageSquareQuote, Users, Wallet, Swords, Heart } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Card, Tabs } from "@/components/ui/Primitives";
import { clampNum, cn, coldEmailToText, fmtINR, parseMaybeJson, safeArray, titleCase } from "@/lib/utils";
import { BAND_STYLES } from "@/lib/labels";
import VerdictRing from "./VerdictRing";

const SUMMARIES = {
  HIGH: "This looks promising. The brand and event match well, and the deal is easy to justify.",
  MEDIUM: "This can work, but it needs a clearer pitch, better packaging or stronger proof of audience.",
  LOW: "This may be difficult right now. Improve the fit or the price before going further.",
  UNLIKELY: "This looks weak as it stands. Change the price, audience or positioning first.",
};

function readResult(result) {
  const synergy = Math.round(clampNum(result?.breakdown?.brand_synergy));
  const crowd = clampNum(result?.attendance);
  const occupancy = clampNum(result?.breakdown?.occupancy_rate);
  const cost = clampNum(result?.breakdown?.cost_per_head);
  const competing = clampNum(result?.breakdown?.competing_events);
  const probability = result?.feasibility_probability;
  const percent = probability === null || probability === undefined ? null : Math.round(clampNum(probability) * 100);
  return { synergy, crowd, occupancy, cost, competing, percent };
}

function reasonsFor({ synergy, crowd, occupancy, cost, competing, percent }, recommendations) {
  const good = [];
  const risks = [];

  if (crowd > 0) good.push(`Around ${fmtINR(crowd)} people may attend.`);
  if (occupancy >= 70) good.push(`The venue should be about ${Math.round(occupancy)}% full.`);
  if (synergy >= 60) good.push(`Brand fit is strong at ${synergy}%.`);
  if (cost > 0 && cost < 40) good.push(`Cost per person is reasonable at ₹${cost.toFixed(2)}.`);

  if (synergy < 45) risks.push(`Brand fit is low at ${synergy}%, so the match may not be clear.`);
  if (cost >= 40) risks.push(`Cost per person is on the high side at ₹${cost.toFixed(2)}.`);
  if (competing >= 3) risks.push(`${competing} other events may split the audience's attention.`);
  else if (competing > 0) risks.push(`${competing} other event${competing > 1 ? "s" : ""} may compete for attention.`);
  if (percent !== null && percent < 35) risks.push(`The overall chance of a deal is low at ${percent}%.`);

  const next = safeArray(recommendations).slice(0, 3).map((item) => (typeof item === "string" ? item : item?.action)).filter(Boolean);
  return { good, risks, next };
}

// The AI sometimes answers with a list or an object instead of a sentence
function readable(value) {
  if (Array.isArray(value)) return value.map(readable).filter(Boolean).join(", ");
  if (value && typeof value === "object") return Object.values(value).map(readable).filter(Boolean).join(", ");
  return value ? String(value) : "";
}

function Metric({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl bg-paper p-3.5">
      <div className="flex items-center gap-1.5 text-sm text-ink-soft"><Icon className="h-4 w-4 text-ink-faint" aria-hidden="true" />{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      {hint ? <div className="text-xs text-ink-faint">{hint}</div> : null}
    </div>
  );
}

function Bullets({ icon: Icon, tone, title, items }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 font-semibold"><Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />{title}</h3>
      <ul className="space-y-1.5 text-ink-soft">
        {items.map((item) => <li key={item} className="leading-relaxed">{item}</li>)}
      </ul>
    </div>
  );
}

function WhyTab({ result, facts, brandAnalysis, compact }) {
  const { good, risks, next } = reasonsFor(facts, result.recommendations);
  const insights = result.ai_insights;
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">{insights?.headline || "Why this result"}</h3>
        <p className="mt-1 leading-relaxed text-ink-soft">
          {insights?.explanation || "We looked at brand fit, expected audience, cost and competition."}
        </p>
      </div>
      <div className={compact ? "grid gap-6" : "grid gap-6 md:grid-cols-3"}>
        <Bullets icon={CheckCircle2} tone="text-good" title="What looks good" items={good} />
        <Bullets icon={AlertTriangle} tone="text-warn" title="What could worry a sponsor" items={risks} />
        <Bullets icon={ListChecks} tone="text-brand" title="What would improve this deal" items={next} />
      </div>
      {brandAnalysis?.target_audience ? (
        <div className="border-t border-line pt-5">
          <h3 className="font-semibold">Your brand, as the AI reads it</h3>
          <dl className="mt-2 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-ink-faint">Audience</dt><dd className="text-ink-soft">{readable(brandAnalysis.target_audience)}</dd></div>
            <div><dt className="text-ink-faint">Values</dt><dd className="text-ink-soft">{readable(brandAnalysis.core_values)}</dd></div>
            <div><dt className="text-ink-faint">Personality</dt><dd className="text-ink-soft">{readable(brandAnalysis.persona)}</dd></div>
          </dl>
        </div>
      ) : null}
      <p className="rounded-xl bg-sand p-3 text-sm text-ink-soft">
        {insights?.caution || "This is an estimate to guide your decision. It doesn't guarantee a sponsor's response."}
      </p>
    </div>
  );
}

function normalizeRecommendation(item) {
  const parsed = parseMaybeJson(item);
  if (typeof parsed === "string") return { action: parsed };
  return parsed && typeof parsed === "object" ? parsed : null;
}

function ImproveTab({ recommendations }) {
  const items = safeArray(recommendations).map(normalizeRecommendation).filter(Boolean);
  if (!items.length) return <p className="py-6 text-center text-ink-soft">Nothing to improve right now.</p>;
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={item.action} className="flex gap-3 rounded-xl bg-paper p-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand font-display text-sm font-bold text-white">{index + 1}</span>
          <div className="min-w-0">
            <p className="font-semibold">{item.action}</p>
            {item.why ? <p className="mt-1 text-sm text-ink-soft">{item.why}</p> : null}
            {item.expected_effect ? <Badge tone="good" className="mt-2 whitespace-normal">{item.expected_effect}</Badge> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function NegotiateTab({ points }) {
  const items = safeArray(points).map(parseMaybeJson).filter((item) => item && typeof item === "object");
  if (!items.length) return <p className="py-6 text-center text-ink-soft">No negotiation points for this deal.</p>;
  return (
    <div className="space-y-3">
      <p className="text-ink-soft">Questions that are likely to come up, with an answer ready.</p>
      {items.map((item) => (
        <div key={item.objection} className="rounded-xl bg-paper p-4">
          <p className="font-semibold">“{item.objection}”</p>
          {item.rebuttal ? <p className="mt-2 text-ink-soft"><span className="font-semibold text-brand">You could say: </span>{item.rebuttal}</p> : null}
        </div>
      ))}
    </div>
  );
}

function EmailTab({ text }) {
  const [copied, setCopied] = useState(false);
  if (!text) return <p className="py-6 text-center text-ink-soft">No email draft for this deal.</p>;

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-ink-soft">A draft to send the organizer. Change anything you like.</p>
        <Button variant="secondary" size="sm" onClick={copy}>
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy email"}
        </Button>
      </div>
      <pre className="whitespace-pre-wrap break-words rounded-xl bg-paper p-4 font-sans text-[15px] leading-relaxed">{text}</pre>
    </div>
  );
}

// `compact` is for narrow columns, where the wide layout would squeeze the text
export default function ResultsPanel({ result, brandCategory, eventType, city, compact = false }) {
  const [tab, setTab] = useState("why");

  const prediction = result?.prediction || result;
  const brandAnalysis = result?.brandAnalysis || null;
  const facts = readResult(prediction);
  const band = prediction.verdict_band || "UNKNOWN";
  const style = BAND_STYLES[band] || BAND_STYLES.UNKNOWN;

  return (
    <Card className="animate-rise overflow-hidden">
      <div className="flex flex-col gap-5 border-b border-line p-5 sm:flex-row sm:items-center sm:p-6">
        <VerdictRing percent={facts.percent} band={band} />
        <div className="min-w-0">
          <p className="eyebrow">Chance of a deal</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl" style={{ color: style.color }}>{style.title}</h2>
          <p className="mt-2 max-w-xl text-ink-soft">{SUMMARIES[band]}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {brandCategory ? <Badge>{titleCase(brandCategory)}</Badge> : null}
            {eventType ? <Badge>{titleCase(eventType)}</Badge> : null}
            {city ? <Badge>{city}</Badge> : null}
          </div>
        </div>
      </div>

      <div className={cn("grid grid-cols-2 gap-3 border-b border-line p-5 sm:p-6", !compact && "md:grid-cols-4")}>
        <Metric icon={Users} label="Expected turnout" value={facts.crowd ? fmtINR(facts.crowd) : "—"} hint={`${Math.round(facts.occupancy)}% of capacity`} />
        <Metric icon={Heart} label="Brand fit" value={`${facts.synergy}%`} hint={prediction.breakdown?.synergy_source === "ai" ? "Scored by AI" : "Estimated"} />
        <Metric icon={Wallet} label="Cost per person" value={facts.cost ? `₹${facts.cost.toFixed(2)}` : "—"} hint={`${titleCase(prediction.breakdown?.roi_bucket || "")} value`} />
        <Metric icon={Swords} label="Competing events" value={facts.competing} hint="Around the same time" />
      </div>

      <div className="p-5 sm:p-6">
        <Tabs
          className="mb-5"
          label="Analysis sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "why", label: <><Lightbulb className="h-4 w-4" aria-hidden="true" />Why</> },
            { id: "improve", label: <><ListChecks className="h-4 w-4" aria-hidden="true" />Improve</> },
            { id: "negotiate", label: <><MessageSquareQuote className="h-4 w-4" aria-hidden="true" />Negotiate</> },
            { id: "email", label: <><Mail className="h-4 w-4" aria-hidden="true" />Email</> },
          ]}
        />
        {tab === "why" ? <WhyTab result={prediction} facts={facts} brandAnalysis={brandAnalysis} compact={compact} /> : null}
        {tab === "improve" ? <ImproveTab recommendations={prediction.recommendations} /> : null}
        {tab === "negotiate" ? <NegotiateTab points={prediction.negotiation_points} /> : null}
        {tab === "email" ? <EmailTab text={coldEmailToText(prediction.cold_email)} /> : null}
      </div>
    </Card>
  );
}
