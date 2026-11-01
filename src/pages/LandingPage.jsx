import { Link } from "react-router-dom";
import { ArrowRight, Bell, CalendarDays, Check, Gauge, Handshake, MessagesSquare, Store } from "lucide-react";
import MarketingLayout from "@/components/layout/MarketingLayout";
import { cn } from "@/lib/utils";

const ROLES = [
  {
    to: "/for-organizers",
    icon: CalendarDays,
    eyebrow: "I'm an organizer",
    title: "I need sponsors for my event",
    points: ["List your event for brands to find", "Compare and negotiate offers", "Build a reputation that sponsors trust"],
    cta: "Continue as organizer",
    dark: true,
  },
  {
    to: "/for-sponsors",
    icon: Store,
    eyebrow: "I'm a sponsor",
    title: "I want events worth sponsoring",
    points: ["Discover events by city and category", "Check expected turnout and brand fit", "Negotiate and track every deal"],
    cta: "Continue as sponsor",
    dark: false,
  },
];

const FEATURES = [
  { icon: Gauge, title: "AI analysis", text: "Estimated turnout, brand fit and the chance of a deal, before anyone commits." },
  { icon: Handshake, title: "Real negotiation", text: "Counter-offer back and forth until both sides agree on a number." },
  { icon: MessagesSquare, title: "Chat in one place", text: "Talk directly and share images and PDFs, right next to the offer." },
  { icon: Bell, title: "Nothing gets missed", text: "A live bell for every offer, decision, message and confirmation." },
];

const STEPS = [
  { title: "Connect", text: "Organizers publish events, and sponsors find the ones that fit." },
  { title: "Agree", text: "Check the numbers, chat, and negotiate until you both accept." },
  { title: "Deliver", text: "The event happens, and both sides confirm the sponsorship." },
  { title: "Build trust", text: "Verified feedback makes the next deal easier for everyone." },
];

function RoleCard({ role }) {
  const { icon: Icon, dark } = role;
  return (
    <Link
      to={role.to}
      className={cn(
        "group flex flex-col rounded-3xl border p-6 shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-lift sm:p-8",
        dark ? "border-brand-strong bg-brand-strong text-white" : "border-line bg-white"
      )}
    >
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", dark ? "bg-white/10 text-marigold" : "bg-brand-soft text-brand")}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className={cn("mt-5 text-sm font-semibold", dark ? "text-marigold" : "text-brand")}>{role.eyebrow}</p>
      <h2 className={cn("mt-1 text-2xl font-bold sm:text-3xl", dark && "text-white")}>{role.title}</h2>
      <ul className="mt-5 flex-1 space-y-2.5">
        {role.points.map((point) => (
          <li key={point} className={cn("flex items-start gap-2.5", dark ? "text-white/80" : "text-ink-soft")}>
            <Check className={cn("mt-1 h-4 w-4 shrink-0", dark ? "text-marigold" : "text-good")} aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
      <span className={cn("mt-7 inline-flex items-center gap-2 font-semibold", dark ? "text-white" : "text-brand")}>
        {role.cta}
        <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-6xl animate-rise px-5 pb-14 pt-12 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-marigold-strong">Event sponsorship for Madhya Pradesh</p>
          <h1 className="mt-4 text-[2.75rem] font-bold leading-[1.05] sm:text-6xl">
            Where great events meet the <span className="text-brand">right sponsors.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
            SponsorWise helps organizers and brands find each other, see how a deal could perform, and agree on terms in one place.
          </p>
        </div>

        <h2 id="choose" className="mb-5 mt-12 scroll-mt-24 text-center text-lg font-semibold text-ink-soft sm:mt-14">Which one are you?</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {ROLES.map((role) => <RoleCard key={role.to} role={role} />)}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
          <h2 className="max-w-xl text-3xl font-bold sm:text-4xl">One place for the whole deal</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-marigold-soft text-marigold-strong">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        <h2 className="text-3xl font-bold sm:text-4xl">How a sponsorship comes together</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="border-t-2 border-marigold pt-4">
              <span className="text-sm font-semibold text-ink-faint">Step {index + 1}</span>
              <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </MarketingLayout>
  );
}
