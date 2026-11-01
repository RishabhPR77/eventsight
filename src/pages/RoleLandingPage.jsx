import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, Bell, CalendarPlus, Check, FileText, Gauge, Handshake, History, Inbox, MailCheck, MessagesSquare, Repeat2, Search, Sparkles, Users,
} from "lucide-react";
import ProductDemo from "@/components/demo/ProductDemo";
import MarketingLayout from "@/components/layout/MarketingLayout";
import VerdictRing from "@/components/results/VerdictRing";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Primitives";

const PAGES = {
  organizer: {
    title: "SponsorWise for event organizers",
    signUp: "/register?role=organizer",
    other: { to: "/for-sponsors", label: "Looking to sponsor an event instead?" },
    eyebrow: "For event organizers",
    heading: <>Find sponsors for your event <span className="text-brand">without the cold calls.</span></>,
    intro: "Publish your event once, and let brands come to you. Compare offers, negotiate the amount, and keep every conversation in one place.",
    cta: "Create organizer account",
    problemsHeading: "Sponsorship shouldn't feel like guesswork",
    problems: [
      { before: "Calling brands that may never reply", after: "Brands browse your event and send you offers" },
      { before: "Offers scattered across calls and chats", after: "Every offer in one list, with its full history" },
      { before: "No way to prove you deliver", after: "Verified feedback builds your reputation" },
    ],
    featuresHeading: "Everything you need to land a sponsor",
    features: [
      { icon: CalendarPlus, title: "Publish in minutes", text: "Add your event, capacity, budget and ask. Sponsors can find it right away." },
      { icon: Inbox, title: "Offers in one place", text: "See every offer with the brand behind it, and what still needs a reply." },
      { icon: Repeat2, title: "Counter-offer", text: "Not the right number? Counter it, and go back and forth until you agree." },
      { icon: MessagesSquare, title: "Chat and share files", text: "Talk to sponsors directly, and share posters, plans and proposals." },
      { icon: BadgeCheck, title: "Earn your reputation", text: "Ratings come only from sponsors whose deals both sides confirmed." },
      { icon: History, title: "Your track record", text: "Past events, sponsors and money raised, all kept in one place." },
    ],
    demoHeading: "See your side of a deal",
    stepsHeading: "From first event to first sponsor",
    steps: [
      { title: "Create your account", text: "Sign up and verify your email." },
      { title: "Publish your event", text: "Add the details sponsors care about." },
      { title: "Agree on a deal", text: "Review offers, chat, counter and accept." },
      { title: "Confirm and grow", text: "Confirm after the event and earn feedback." },
    ],
    faqs: [
      { q: "Does it cost anything to sign up?", a: "No. Creating an account and publishing events is free." },
      { q: "Which cities are supported?", a: "SponsorWise covers cities across Madhya Pradesh, including Indore, Bhopal, Gwalior and Jabalpur." },
      { q: "Can I have more than one sponsor for an event?", a: "Yes. You can accept several sponsors for the same event." },
      { q: "Can I change my event after accepting a sponsor?", a: "You can edit most details, but the date and city lock once a sponsor is accepted, because that's what they agreed to." },
      { q: "How do ratings work?", a: "Once the event is over, you and the sponsor both confirm the deal happened. Only then can the sponsor leave feedback, so every rating comes from a real deal." },
    ],
    closing: "Ready to find your next sponsor?",
  },
  sponsor: {
    title: "SponsorWise for sponsors and brands",
    signUp: "/register?role=sponsor",
    other: { to: "/for-organizers", label: "Looking for sponsors for your event instead?" },
    eyebrow: "For brands and sponsors",
    heading: <>Back the right events, <span className="text-brand">and know why before you pay.</span></>,
    intro: "Discover events across Madhya Pradesh, see the expected turnout and brand fit, and negotiate directly with the people running them.",
    cta: "Create sponsor account",
    problemsHeading: "Stop sponsoring on gut feeling",
    problems: [
      { before: "Guessing how many people will show up", after: "See an estimated turnout for each event" },
      { before: "Paying the asking price and hoping", after: "Check cost per person, then negotiate" },
      { before: "No idea if an organizer delivers", after: "Read their history and verified ratings" },
    ],
    featuresHeading: "Everything you need to sponsor with confidence",
    features: [
      { icon: Search, title: "Discover events", text: "Browse upcoming events by city, category and budget." },
      { icon: Gauge, title: "AI event analysis", text: "Estimated turnout, brand fit, cost per person and the chance of a deal." },
      { icon: Sparkles, title: "Sponsorship predictor", text: "Try any brand and event combination, even if it isn't listed yet." },
      { icon: Handshake, title: "Negotiate your way", text: "Send an offer and counter until you and the organizer agree." },
      { icon: MailCheck, title: "Ready-made pitch", text: "Get likely objections, suggested answers and an outreach email." },
      { icon: History, title: "Every deal on record", text: "Track offers to the finish, and keep a history of what you've sponsored." },
    ],
    demoHeading: "See your side of a deal",
    stepsHeading: "From brand profile to first sponsorship",
    steps: [
      { title: "Set up your brand", text: "Tell us your industry, goal and audience." },
      { title: "Find an event", text: "Browse events and run the AI analysis." },
      { title: "Agree on a deal", text: "Send an offer, chat, and negotiate." },
      { title: "Confirm and review", text: "Confirm after the event and leave feedback." },
    ],
    faqs: [
      { q: "Does it cost anything to sign up?", a: "No. Creating an account and running event analysis is free." },
      { q: "How accurate is the AI analysis?", a: "It's an estimate to guide your decision, not a guarantee. It's built on modelled data for events in Madhya Pradesh, so use it alongside your own judgement." },
      { q: "Do I have to pay the amount the organizer asks for?", a: "No. Offer what you think is fair, and counter until you both agree." },
      { q: "Can I change my mind after sending an offer?", a: "Yes. You can withdraw an offer until it's accepted, but you can't apply to the same event again." },
      { q: "Does SponsorWise handle the payment?", a: "No. SponsorWise helps you find and agree the deal. You arrange payment directly with the organizer." },
    ],
    closing: "Ready to find your next event?",
  },
};

function OrganizerPreview() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-lift sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">Example offer</span>
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-sand text-ink-soft">
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-bad text-[10px] font-bold text-white">1</span>
        </span>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-marigold-soft font-display font-bold text-warn">NB</span>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">Nimbu Beverages</h3>
          <p className="text-sm text-ink-soft">Indore Food Festival</p>
        </div>
      </div>
      <p className="mt-4 rounded-xl bg-paper p-3 text-sm text-ink-soft">“We'd love a sampling stall near the main stage.”</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <div>
          <p className="text-xs text-ink-faint">Offered</p>
          <p className="font-display text-2xl font-bold text-brand">₹45,000</p>
        </div>
        <div className="flex gap-2" aria-hidden="true">
          <span className="inline-flex h-10 items-center rounded-xl border border-line px-4 text-sm font-semibold">Counter</span>
          <span className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-semibold text-white"><Check className="h-4 w-4" />Accept</span>
        </div>
      </div>
    </div>
  );
}

function SponsorPreview() {
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
          <p className="mt-1 text-sm text-ink-soft">For a beverage brand</p>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-5">
        {[[Users, "Turnout", "6,400"], [Handshake, "Brand fit", "85%"], [FileText, "Per person", "₹7"]].map(([Icon, label, value]) => (
          <div key={label}>
            <dt className="flex items-center gap-1 text-xs text-ink-faint"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</dt>
            <dd className="mt-1 font-display text-xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function RoleLandingPage({ role }) {
  const page = PAGES[role];

  useEffect(() => {
    document.title = page.title;
    window.scrollTo(0, 0);
    return () => {
      document.title = "SponsorWise · Event sponsorship, made clear";
    };
  }, [page.title]);

  return (
    <MarketingLayout signUpTo={page.signUp}>
      <section className="mx-auto grid max-w-6xl animate-rise items-center gap-10 px-5 pb-14 pt-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pt-16">
        <div>
          <p className="eyebrow text-marigold-strong">{page.eyebrow}</p>
          <h1 className="mt-4 text-[2.5rem] font-bold leading-[1.05] sm:text-6xl">{page.heading}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">{page.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" to={page.signUp}>{page.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
            <Button size="lg" variant="secondary" href="#demo">Watch the demo</Button>
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            Already have an account? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link>
          </p>
        </div>
        {role === "organizer" ? <OrganizerPreview /> : <SponsorPreview />}
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-3xl font-bold sm:text-4xl">{page.problemsHeading}</h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {page.problems.map((item) => (
              <li key={item.before} className="rounded-2xl bg-paper p-5">
                <p className="text-sm text-ink-faint line-through decoration-bad/40">{item.before}</p>
                <p className="mt-2 flex items-start gap-2 font-semibold">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-good" aria-hidden="true" />
                  {item.after}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">{page.featuresHeading}</h2>
        <div className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {page.features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className="scroll-mt-20 border-y border-line bg-sand/50">
        <div className="mx-auto max-w-4xl px-5 py-14 sm:py-16">
          <h2 className="mb-6 text-center text-3xl font-bold sm:text-4xl">{page.demoHeading}</h2>
          <ProductDemo key={role} role={role} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        <h2 className="text-3xl font-bold sm:text-4xl">{page.stepsHeading}</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {page.steps.map((step, index) => (
            <li key={step.title}>
              <span className="font-display text-3xl font-bold text-marigold">{index + 1}</span>
              <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-14 sm:pb-16">
        <h2 className="text-3xl font-bold sm:text-4xl">Common questions</h2>
        <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-white">
          {page.faqs.map((faq) => (
            <details key={faq.q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span aria-hidden="true" className="text-xl leading-none text-ink-faint transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 leading-relaxed text-ink-soft">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-14 sm:pb-16">
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-brand-strong p-8 sm:p-10">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{page.closing}</h2>
            <p className="mt-2 text-white/75">It takes a minute to set up.</p>
          </div>
          <Button variant="accent" size="lg" to={page.signUp}>{page.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
        </div>
        <p className="mt-5 text-center text-sm">
          <Link to={page.other.to} className="font-semibold text-brand hover:underline">{page.other.label}</Link>
        </p>
      </section>
    </MarketingLayout>
  );
}
