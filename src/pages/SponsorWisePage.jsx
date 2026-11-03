import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Sparkles } from "lucide-react";
import ResultsPanel from "@/components/results/ResultsPanel";
import Button from "@/components/ui/Button";
import { Input, RatingSlider, Select, Textarea, Toggle } from "@/components/ui/Field";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { analyzeBrand, predictDeal } from "@/lib/api";
import { CITY_FOCUS_LABELS, KPI_LABELS } from "@/lib/labels";
import { ML_BRAND_CATEGORIES, ML_CITIES, ML_EVENT_TYPES } from "@/lib/mlMappings";
import { clampNum, cn, getErrorMessage, titleCase } from "@/lib/utils";

const inDays = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

const INITIAL_DEAL = {
  city: "Indore",
  event_type: "Food Festival",
  date: inDays(45),
  price: 0,
  marketing_budget: 120000,
  sponsor_amount: 45000,
  venue_capacity: 8000,
  organizer_reputation: 0.55,
  lineup_quality: 0.5,
  is_indoor: false,
  is_festive: false,
  social_media_reach: 15000,
  past_events_organized: 5,
  brand_kpi: "awareness",
  brand_city_focus: "all_mp",
  brand_activation_maturity: 0.55,
  event_description: "",
};

function StepBar({ step }) {
  return (
    <ol className="mb-6 flex items-center gap-3 text-sm font-semibold">
      {["Your brand", "The event"].map((label, index) => (
        <li key={label} className="flex items-center gap-2">
          {index > 0 ? <span aria-hidden="true" className="h-px w-6 bg-line sm:w-10" /> : null}
          <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs", step > index ? "bg-brand text-white" : "bg-sand text-ink-faint")}>{index + 1}</span>
          <span className={step > index ? "text-ink" : "text-ink-faint"}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

function BrandStep({ brand, setBrand, categories, onDone }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      onDone(await analyzeBrand(brand));
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-xl p-5 sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Company name" value={brand.company_name} onChange={(e) => setBrand({ ...brand, company_name: e.target.value })} placeholder="Nimbu Beverages" required />
        <Select label="Industry" value={brand.industry} onChange={(e) => setBrand({ ...brand, industry: e.target.value })}>
          {categories.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
        </Select>
        <Textarea label="About the brand" optional rows={3} value={brand.brand_description} onChange={(e) => setBrand({ ...brand, brand_description: e.target.value })} placeholder="What do you sell, and who do you want to reach?" />
        {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p> : null}
        <Button type="submit" className="w-full" loading={submitting}>Continue</Button>
      </form>
    </Card>
  );
}

function EventStep({ deal, setDeal, eventTypes, onRun, running, error }) {
  const [advanced, setAdvanced] = useState(false);
  const set = (key) => (e) => setDeal((prev) => ({ ...prev, [key]: e.target.value }));
  const setValue = (key) => (value) => setDeal((prev) => ({ ...prev, [key]: value }));
  const setChecked = (key) => (e) => setDeal((prev) => ({ ...prev, [key]: e.target.checked }));

  return (
    <Card className="p-5">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onRun();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Select label="Event type" value={deal.event_type} onChange={set("event_type")}>
            {eventTypes.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
          </Select>
          <Select label="City" value={deal.city} onChange={set("city")}>
            {ML_CITIES.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
        <Input label="Event date" type="date" value={deal.date} onChange={set("date")} required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Sponsorship (₹)" type="number" min="0" value={deal.sponsor_amount} onChange={set("sponsor_amount")} required />
          <Input label="Venue capacity" type="number" min="1" value={deal.venue_capacity} onChange={set("venue_capacity")} required />
          <Input label="Ticket price (₹)" type="number" min="0" value={deal.price} onChange={set("price")} required />
          <Input label="Marketing (₹)" type="number" min="0" value={deal.marketing_budget} onChange={set("marketing_budget")} required />
        </div>
        <Textarea label="About the event" optional rows={2} value={deal.event_description} onChange={set("event_description")} placeholder="Who attends, and what's the format?" />
        <Toggle label="During a festival" checked={deal.is_festive} onChange={setChecked("is_festive")} />

        <button
          type="button"
          aria-expanded={advanced}
          onClick={() => setAdvanced((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg py-1 text-sm font-semibold text-brand"
        >
          More options
          <ChevronDown className={cn("h-4 w-4 transition", advanced && "rotate-180")} aria-hidden="true" />
        </button>

        {advanced ? (
          <div className="space-y-4">
            <Toggle label="Indoor event" checked={deal.is_indoor} onChange={setChecked("is_indoor")} />
            <RatingSlider label="Organizer reputation" value={deal.organizer_reputation} onChange={setValue("organizer_reputation")} />
            <RatingSlider label="Lineup quality" value={deal.lineup_quality} onChange={setValue("lineup_quality")} />
            <RatingSlider label="Your activation experience" value={deal.brand_activation_maturity} onChange={setValue("brand_activation_maturity")} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Social reach" type="number" min="0" value={deal.social_media_reach} onChange={set("social_media_reach")} />
              <Input label="Past events" type="number" min="0" value={deal.past_events_organized} onChange={set("past_events_organized")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Main goal" value={deal.brand_kpi} onChange={set("brand_kpi")}>
                {Object.entries(KPI_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </Select>
              <Select label="City focus" value={deal.brand_city_focus} onChange={set("brand_city_focus")}>
                {Object.entries(CITY_FOCUS_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </Select>
            </div>
          </div>
        ) : null}

        {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p> : null}
        <Button type="submit" className="w-full" loading={running}>
          {running ? null : <Sparkles className="h-4 w-4" aria-hidden="true" />}
          {running ? "Predicting…" : "Run prediction"}
        </Button>
      </form>
    </Card>
  );
}

export default function SponsorWisePage() {
  const [step, setStep] = useState(1);
  const [brand, setBrand] = useState({ company_name: "", industry: "Beverage", brand_description: "" });
  const [brandResult, setBrandResult] = useState(null);
  const [deal, setDeal] = useState(INITIAL_DEAL);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const resultsRef = useRef(null);

  // The model only knows these names, and the saved lists come back in other cases
  const brandCategories = ML_BRAND_CATEGORIES;
  const eventTypes = ML_EVENT_TYPES;

  useEffect(() => {
    if (result) resultsRef.current?.scrollIntoView({ block: "start" });
  }, [result]);

  const run = async () => {
    setRunning(true);
    setError("");
    try {
      const prediction = await predictDeal({
        ...deal,
        sponsor_category: brand.industry,
        brand_name: brand.company_name,
        brand_description: brand.brand_description || null,
        event_description: deal.event_description || null,
        price: clampNum(deal.price),
        marketing_budget: clampNum(deal.marketing_budget),
        sponsor_amount: clampNum(deal.sponsor_amount),
        venue_capacity: Math.max(1, parseInt(deal.venue_capacity, 10) || 1),
        is_indoor: deal.is_indoor ? 1 : 0,
        is_festive: deal.is_festive ? 1 : 0,
        social_media_reach: Math.max(0, parseInt(deal.social_media_reach, 10) || 0),
        past_events_organized: Math.max(0, parseInt(deal.past_events_organized, 10) || 0),
      });
      setResult({ prediction, brandAnalysis: brandResult });
    } catch (err) {
      setError(getErrorMessage(err));
    }
    setRunning(false);
  };

  return (
    <>
      <PageHeader
        title="Sponsorship predictor"
        description="Try any brand and event combination, even if the event isn't listed yet."
      />
      <StepBar step={step} />

      {step === 1 ? (
        <BrandStep
          brand={brand}
          setBrand={setBrand}
          categories={brandCategories}
          onDone={(analysis) => {
            setBrandResult(analysis);
            setStep(2);
          }}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />Change brand
            </Button>
            <Badge tone="brand">{brand.company_name}</Badge>
            <Badge>{titleCase(brand.industry)}</Badge>
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
            <EventStep deal={deal} setDeal={setDeal} eventTypes={eventTypes} onRun={run} running={running} error={error} />
            <div ref={resultsRef} className="min-w-0 scroll-mt-20">
              {result ? (
                <ResultsPanel compact result={result} brandCategory={brand.industry} eventType={deal.event_type} city={deal.city} />
              ) : (
                <Card>
                  <EmptyState icon={Sparkles} title="Your result will appear here" description="Fill in the event details and run the prediction." />
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
