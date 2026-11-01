import { Link } from "react-router-dom";
import { CalendarCheck, Gauge, MessagesSquare } from "lucide-react";
import Logo from "@/components/ui/Logo";

const POINTS = [
  { icon: Gauge, text: "See a sponsorship's chances before you commit" },
  { icon: MessagesSquare, text: "Talk to the other side directly, in one place" },
  { icon: CalendarCheck, text: "Track every deal from application to feedback" },
];

export default function AuthLayout({ title, description, footer, children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-brand-strong p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[56px] border-marigold/15" />
        <div aria-hidden="true" className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full border-[56px] border-white/5" />
        <Link to="/" className="relative"><Logo onDark /></Link>
        <div className="relative">
          <h2 className="max-w-md text-4xl font-bold leading-tight text-white">
            The right sponsor for every event.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/85">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-5 w-5 text-marigold" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">Built for events across Madhya Pradesh</p>
      </aside>

      <main className="flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-md animate-rise">
          <Link to="/" className="mb-8 inline-block lg:hidden"><Logo /></Link>
          <h1 className="text-3xl font-bold">{title}</h1>
          {description ? <p className="mt-2 text-ink-soft">{description}</p> : null}
          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-6 text-sm text-ink-soft">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
