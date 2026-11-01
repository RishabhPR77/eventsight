import { Link, NavLink } from "react-router-dom";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const ROLE_LINKS = [
  { to: "/for-organizers", label: "For organizers" },
  { to: "/for-sponsors", label: "For sponsors" },
];

// Without signUpTo the visitor hasn't picked a role yet, so "Get started" goes to the role cards
export default function MarketingLayout({ signUpTo, children }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
          <Link to="/" aria-label="SponsorWise home"><Logo /></Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {ROLE_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition",
                  isActive ? "bg-brand-soft text-brand" : "text-ink-soft hover:bg-sand hover:text-ink"
                )}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" to="/login">Sign in</Button>
            <Button to={signUpTo} href={signUpTo ? undefined : "#choose"} className="max-sm:hidden">Get started</Button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-ink-faint">
          <span>© {new Date().getFullYear()} SponsorWise</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-4">
            {ROLE_LINKS.map((item) => <Link key={item.to} to={item.to} className="hover:text-ink">{item.label}</Link>)}
            <Link to="/login" className="hover:text-ink">Sign in</Link>
            <Link to="/privacy" className="hover:text-ink">Privacy</Link>
            <Link to="/terms" className="hover:text-ink">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
