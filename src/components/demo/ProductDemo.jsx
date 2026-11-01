import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, Check, MapPin, MousePointer2, Pause, Play, Plus, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Primitives";
import VerdictRing from "@/components/results/VerdictRing";

const STEP_MS = { settle: 1000, travel: 900, press: 450 };

const SCRIPTS = {
  organizer: [
    { scene: "orgDashboard", caption: "Start from your dashboard and create an event." },
    { scene: "orgForm", caption: "Add the details once. Sponsors can find it right away." },
    { scene: "orgOffer", caption: "A brand sends an offer and the bell lets you know. Counter it or accept." },
    { scene: "orgConfirm", caption: "After the event, confirm the sponsorship happened." },
    { scene: "orgDone", caption: "Once both sides confirm, the sponsor can leave feedback, and your reputation grows.", last: true },
  ],
  sponsor: [
    { scene: "spoDiscover", caption: "Browse upcoming events by city and category." },
    { scene: "spoEvent", caption: "Open an event and run the AI analysis." },
    { scene: "spoAnalysis", caption: "See likely turnout, brand fit and the chance of a deal, then apply." },
    { scene: "spoApply", caption: "Send your offer. You can negotiate in chat until you both agree." },
    { scene: "spoDone", caption: "Track it to the end, and leave feedback once both sides confirm.", last: true },
  ],
};

function MockButton({ children, target, pressed, tone = "primary" }) {
  return (
    <span
      data-demo-target={target ? "" : undefined}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition sm:h-9 sm:text-sm",
        tone === "primary" ? "bg-brand text-white" : "bg-marigold text-ink",
        pressed && "scale-95 opacity-80"
      )}
    >
      {children}
    </span>
  );
}

function Panel({ className = "", children }) {
  return <div className={cn("rounded-xl border border-line bg-white p-3 sm:p-4", className)}>{children}</div>;
}

function Line({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-paper px-2.5 py-1.5">
      <div className="text-[10px] text-ink-faint">{label}</div>
      <div className="truncate text-xs font-semibold sm:text-sm">{value}</div>
    </div>
  );
}

function EventTile({ name, city, date, ask, target, shade }) {
  return (
    <div data-demo-target={target ? "" : undefined} className="overflow-hidden rounded-xl border border-line bg-white">
      <div className={cn("flex h-12 items-end p-2 sm:h-16", shade)}>
        <Badge tone="good" className="!px-2 !py-0.5 !text-[10px]">Upcoming</Badge>
      </div>
      <div className="p-2 sm:p-3">
        <div className="truncate text-xs font-semibold sm:text-sm">{name}</div>
        <div className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-ink-faint sm:text-xs"><MapPin className="h-3 w-3" />{city} · {date}</div>
        <div className="mt-1 font-display text-sm font-bold text-brand">{ask}</div>
      </div>
    </div>
  );
}

function Scene({ id, pressed }) {
  switch (id) {
    case "orgDashboard":
      return (
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="font-display text-base font-bold sm:text-xl">Good evening, Priya</div>
            <MockButton target pressed={pressed}><Plus className="h-3.5 w-3.5" />New event</MockButton>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[["Events", "3"], ["Open offers", "2"], ["Sponsors", "4"]].map(([label, value]) => (
              <Panel key={label} className="!p-2.5"><div className="text-[10px] text-ink-faint sm:text-xs">{label}</div><div className="font-display text-lg font-bold sm:text-2xl">{value}</div></Panel>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <EventTile name="Campus Fest" city="Bhopal" date="12 Dec" ask="₹60,000" shade="bg-brand-soft" />
            <EventTile name="Comedy Night" city="Indore" date="20 Dec" ask="₹25,000" shade="bg-marigold-soft" />
          </div>
        </div>
      );
    case "orgForm":
      return (
        <Panel>
          <div className="font-display text-base font-bold sm:text-lg">Create event</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Line label="Event name" value="Indore Food Festival" />
            <Line label="Category" value="Food Festival" />
            <Line label="City" value="Indore" />
            <Line label="Date" value="18 Jan 2027" />
            <Line label="Expected capacity" value="8,000" />
            <Line label="Sponsorship ask" value="₹45,000" />
          </div>
          <div className="mt-3 flex justify-end"><MockButton target pressed={pressed}>Publish event</MockButton></div>
        </Panel>
      );
    case "orgOffer":
      return (
        <div>
          <div className="font-display text-base font-bold sm:text-lg">Indore Food Festival</div>
          <div className="mt-1 text-xs text-ink-faint">Sponsorship offers</div>
          <Panel className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marigold-soft font-display text-sm font-bold text-warn">NB</span>
              <div>
                <div className="text-sm font-semibold">Nimbu Beverages</div>
                <div className="text-xs text-ink-faint">Offered ₹45,000</div>
              </div>
            </div>
            <span className="flex gap-1.5">
              <span className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold sm:h-9 sm:text-sm">Counter</span>
              <MockButton target pressed={pressed}><Check className="h-3.5 w-3.5" />Accept</MockButton>
            </span>
          </Panel>
          <Panel className="mt-2 flex items-center gap-2.5 opacity-60">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft font-display text-sm font-bold text-brand">TW</span>
            <div><div className="text-sm font-semibold">TechWave</div><div className="text-xs text-ink-faint">Offered ₹30,000</div></div>
          </Panel>
        </div>
      );
    case "orgConfirm":
      return (
        <Panel>
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Nimbu Beverages</div>
            <Badge tone="good">Accepted · ₹45,000</Badge>
          </div>
          <p className="mt-2 text-xs text-ink-soft sm:text-sm">The event is over. Did this sponsorship happen?</p>
          <div className="mt-3 text-xs font-semibold">How well did the brand show up?</div>
          <div className="mt-1.5 h-2 rounded-full bg-sand"><div className="h-2 w-4/5 rounded-full bg-brand" /></div>
          <div className="mt-3 flex justify-end"><MockButton target pressed={pressed}>Confirm sponsorship</MockButton></div>
        </Panel>
      );
    case "orgDone":
      return (
        <Panel className="flex h-full flex-col items-center justify-center py-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-good-soft text-good"><Check className="h-6 w-6" /></span>
          <div className="mt-2 font-display text-lg font-bold">Confirmed by both sides</div>
          <div className="mt-1 text-sm text-ink-soft">Feedback is open for Nimbu Beverages</div>
          <span data-demo-target="" className="mt-3"><Badge tone="brand">Reputation updated</Badge></span>
        </Panel>
      );
    case "spoDiscover":
      return (
        <div>
          <div className="font-display text-base font-bold sm:text-xl">Discover events</div>
          <div className="mt-2 flex gap-1.5">
            {["All cities", "Indore", "Food Festival"].map((chip, i) => (
              <span key={chip} className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold", i === 1 ? "bg-brand text-white" : "bg-sand text-ink-soft")}>{chip}</span>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <EventTile name="Indore Food Festival" city="Indore" date="18 Jan" ask="₹45,000" shade="bg-marigold-soft" target />
            <EventTile name="Comedy Night" city="Indore" date="20 Dec" ask="₹25,000" shade="bg-brand-soft" />
          </div>
        </div>
      );
    case "spoEvent":
      return (
        <div>
          <div className="h-14 rounded-xl bg-marigold-soft sm:h-20" />
          <div className="mt-3 font-display text-base font-bold sm:text-lg">Indore Food Festival</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-ink-faint"><CalendarDays className="h-3.5 w-3.5" />18 Jan 2027 · Indore</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Line label="Ask" value="₹45,000" />
            <Line label="Capacity" value="8,000" />
            <Line label="Ticket" value="Free" />
          </div>
          <div className="mt-3 flex justify-end"><MockButton target tone="accent" pressed={pressed}><Sparkles className="h-3.5 w-3.5" />Run AI analysis</MockButton></div>
        </div>
      );
    case "spoAnalysis":
      return (
        <Panel>
          <div className="flex items-center gap-4">
            <VerdictRing percent={72} band="HIGH" size={92} />
            <div className="min-w-0">
              <div className="font-display text-base font-bold sm:text-lg">Strong chance of a deal</div>
              <div className="text-xs text-ink-soft sm:text-sm">Your brand fits this audience well.</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Line label="Turnout" value="6,400" />
            <Line label="Brand fit" value="85%" />
            <Line label="Per person" value="₹7" />
          </div>
          <div className="mt-3 flex justify-end"><MockButton target pressed={pressed}>Apply to sponsor</MockButton></div>
        </Panel>
      );
    case "spoApply":
      return (
        <Panel>
          <div className="font-display text-base font-bold sm:text-lg">Apply for sponsorship</div>
          <div className="mt-3 space-y-2">
            <Line label="Your offer" value="₹45,000" />
            <Line label="Message to organizer" value="We'd love a sampling stall near the main stage." />
          </div>
          <div className="mt-3 flex justify-end"><MockButton target pressed={pressed}><Send className="h-3.5 w-3.5" />Send offer</MockButton></div>
        </Panel>
      );
    case "spoDone":
      return (
        <Panel className="h-full">
          <div className="font-display text-base font-bold sm:text-lg">Your sponsorship</div>
          <ol className="mt-4 space-y-2.5">
            {["Offer sent", "Accepted by organizer", "Event finished", "Confirmed by both sides"].map((label) => (
              <li key={label} className="flex items-center gap-2 text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-good text-white"><Check className="h-3 w-3" /></span>
                {label}
              </li>
            ))}
          </ol>
          <div data-demo-target="" className="mt-3 inline-block"><Badge tone="brand">Feedback is open</Badge></div>
        </Panel>
      );
    default:
      return null;
  }
}

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function ProductDemo() {
  const [role, setRole] = useState("organizer");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("settle");
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [cursor, setCursor] = useState({ x: 40, y: 40 });
  const stage = useRef(null);

  const steps = SCRIPTS[role];
  const step = steps[index];
  const pressed = phase === "press";

  // Aim at the real element in the scene, so the cursor lands right at any screen size
  useLayoutEffect(() => {
    if (phase === "settle") return;
    const target = stage.current?.querySelector("[data-demo-target]");
    if (!target) return;
    const box = stage.current.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    setCursor({ x: rect.left - box.left + rect.width * 0.55, y: rect.top - box.top + rect.height * 0.6 });
  }, [phase, index, role]);

  useEffect(() => {
    if (!playing) return undefined;
    const delay = step.last && phase === "press" ? 2400 : STEP_MS[phase];
    const timer = setTimeout(() => {
      if (phase === "settle") setPhase("travel");
      else if (phase === "travel") setPhase("press");
      else {
        setPhase("settle");
        setIndex((i) => (i + 1) % steps.length);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [playing, phase, index, step, steps]);

  const chooseRole = (next) => {
    setRole(next);
    setIndex(0);
    setPhase("settle");
  };

  const chooseStep = (next) => {
    setIndex(next);
    setPhase("settle");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Choose a demo" className="inline-flex rounded-xl border border-line bg-white p-1">
          {[["organizer", "I'm an organizer"], ["sponsor", "I'm a sponsor"]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={role === id}
              onClick={() => chooseRole(id)}
              className={cn("h-10 rounded-lg px-4 text-sm font-semibold transition", role === id ? "bg-brand text-white" : "text-ink-soft hover:text-ink")}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink-soft hover:bg-sand"
        >
          {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          {playing ? "Pause" : "Play"}
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
        <div className="flex items-center gap-1.5 border-b border-line bg-sand px-4 py-2.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="ml-3 rounded-md bg-white px-3 py-0.5 text-xs text-ink-faint">sponsorwise</span>
        </div>

        <div ref={stage} className="relative h-[330px] overflow-hidden bg-paper p-4 sm:h-[340px] sm:p-6" aria-hidden="true">
          <div key={`${role}-${index}`} className="mx-auto h-full max-w-xl animate-rise">
            <Scene id={step.scene} pressed={pressed} />
          </div>
          <span
            className="pointer-events-none absolute left-0 top-0 z-10 transition-transform duration-700 ease-in-out"
            style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
          >
            {pressed ? <span className="absolute -left-3 -top-3 h-7 w-7 animate-ping rounded-full bg-marigold/60" /> : null}
            <MousePointer2 className={cn("h-6 w-6 fill-ink text-white drop-shadow transition-transform", pressed && "scale-90")} />
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
          <p aria-live="off" className="min-h-[2.5rem] flex-1 basis-64 text-[15px] font-medium text-ink">
            <span className="text-ink-faint">Step {index + 1}.</span> {step.caption}
          </p>
          <div className="flex gap-1">
            {steps.map((item, i) => (
              <button
                key={item.scene}
                type="button"
                onClick={() => chooseStep(i)}
                aria-label={`Go to step ${i + 1}`}
                aria-current={i === index ? "step" : undefined}
                className="flex h-8 w-8 items-center justify-center"
              >
                <span className={cn("h-2.5 w-2.5 rounded-full transition", i === index ? "bg-brand" : "bg-line")} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-ink-faint">The names and numbers in this demo are examples.</p>
    </div>
  );
}
