import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, CalendarPlus, FileSignature, Gauge, MailCheck, MessagesSquare, Search, TrendingUp, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { Badge } from "@/components/ui/Primitives";
import VerdictRing from "@/components/results/VerdictRing";
import ProductDemo from "@/components/demo/ProductDemo";

const AUDIENCES = [
  {
    title: "For event organizers",
    points: [
      { icon: CalendarPlus, text: "List your event once, in front of brands looking for one" },
      { icon: FileSignature, text: "Review offers and accept the right sponsor" },
      { icon: BadgeCheck, text: "Build a reputation sponsors can trust" },
    ],
  },
  {
    title: "For brands and sponsors",
    points: [
      { icon: Search, text: "Find events by city, category and audience" },
      { icon: Gauge, text: "See likely turnout and cost per person before you commit" },
      { icon: MailCheck, text: "Get negotiation points and a ready outreach email" },
    ],
  },
];

const STEPS = [
  { title: "List or discover", text: "Organizers publish events. Sponsors browse what's coming up." },
  { title: "Check the fit", text: "AI estimates turnout, brand fit and the chance of a deal." },
  { title: "Agree the deal", text: "Chat, share files and counter-offer until you both accept." },
  { title: "Confirm and review", text: "After the event, both sides confirm and feedback opens." },
];

function PreviewCard() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-lift sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">Example analysis</span>
        <Badge tone="good">Strong fit</Badge>
      </div>
      <div className="mt-5 flex items-center gap-5">
        <VerdictRing percent={72} band="HIGH" size={112} />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">Food Festival, Indore</h3>
          <p className="mt-1 text-sm text-ink-soft">Sponsored by a beverage brand</p>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-5">
        {[
          [Users, "Turnout", "6,400"],
          [TrendingUp, "Brand fit", "85%"],
          [MessagesSquare, "Per person", "₹7"],
        ].map(([Icon, label, value]) => (
          <div key={label}>
            <dt className="flex items-center gap-1 text-xs text-ink-faint"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</dt>
            <dd className="mt-1 font-display text-xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" to="/login">Sign in</Button>
          <Button to="/register">Get started</Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pt-16">
          <div className="animate-rise">
            <p className="eyebrow text-marigold-strong">Event sponsorship for Madhya Pradesh</p>
            <h1 className="mt-4 text-[2.75rem] font-bold leading-[1.05] sm:text-6xl">
              Know a sponsorship will work <span className="text-brand">before you pitch it.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              SponsorWise connects event organizers with the right brands, predicts how a deal will perform, and keeps every step in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" to="/register">Create a free account <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
              <Button size="lg" variant="secondary" href="#demo">Watch the demo</Button>
            </div>
          </div>
          <PreviewCard />
        </section>

        <section id="demo" className="mx-auto max-w-4xl px-5 pb-16">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">See how it works for you</h2>
            <p className="mt-2 text-ink-soft">Pick your side and watch a sponsorship go from start to finish.</p>
          </div>
          <ProductDemo />
        </section>

        <section className="border-y border-line bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-2">
            {AUDIENCES.map((audience) => (
              <div key={audience.title}>
                <h2 className="text-2xl font-bold">{audience.title}</h2>
                <ul className="mt-5 space-y-4">
                  {audience.points.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex gap-3 text-ink-soft">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="pt-1.5">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-3xl font-bold">How it works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="font-display text-3xl font-bold text-marigold">{index + 1}</span>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-brand-strong p-8 sm:p-10">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to find your next sponsor?</h2>
              <p className="mt-2 text-white/75">It takes a minute to set up.</p>
            </div>
            <Button variant="accent" size="lg" to="/register">Get started <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-ink-faint">
          <span>© {new Date().getFullYear()} SponsorWise</span>
          <Link to="/login" className="hover:text-ink">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
