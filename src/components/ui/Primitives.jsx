import { AlertTriangle, Loader2 } from "lucide-react";
import { cn, getErrorMessage, initials, resolveMediaUrl } from "@/lib/utils";
import Button from "./Button";

// `surface` replaces the default look: two bg-* classes on one element can't override each other
export function Card({ surface = "border-line bg-white shadow-card", className = "", children, ...props }) {
  return (
    <div className={cn("rounded-2xl border", surface, className)} {...props}>
      {children}
    </div>
  );
}

const TONES = {
  neutral: "bg-sand text-ink-soft",
  brand: "bg-brand-soft text-brand",
  accent: "bg-marigold-soft text-warn",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
};

export function Badge({ tone = "neutral", className = "", children }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}

const STATUS = {
  upcoming: { tone: "good", label: "Upcoming" },
  completed: { tone: "neutral", label: "Completed" },
  cancelled: { tone: "bad", label: "Cancelled" },
  pending: { tone: "accent", label: "Waiting for reply" },
  negotiating: { tone: "brand", label: "Negotiating" },
  accepted: { tone: "good", label: "Accepted" },
  rejected: { tone: "bad", label: "Rejected" },
  withdrawn: { tone: "neutral", label: "Withdrawn" },
};

export function StatusBadge({ status, className }) {
  const item = STATUS[status] || STATUS.pending;
  return <Badge tone={item.tone} className={className}>{item.label}</Badge>;
}

export function Stat({ label, value, icon: Icon, hint, className = "" }) {
  return (
    <Card className={cn("p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink-soft">{label}</span>
        {Icon ? <Icon className="h-4 w-4 text-ink-faint" aria-hidden="true" /> : null}
      </div>
      <div className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-sm text-ink-faint">{hint}</div> : null}
    </Card>
  );
}

export function PageHeader({ title, description, actions, children }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 sm:mb-8">
      <div className="min-w-0">
        {children}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Tabs({ tabs, value, onChange, className = "", label = "Sections" }) {
  return (
    <div role="tablist" aria-label={label} className={cn("scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition",
            value === tab.id ? "bg-brand text-white" : "text-ink-soft hover:bg-sand hover:text-ink"
          )}
        >
          {tab.label}
          {tab.count ? (
            <span className={cn("rounded-full px-1.5 text-xs", value === tab.id ? "bg-white/20" : "bg-sand")}>{tab.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      ) : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? <p className="mt-1.5 max-w-md text-sm text-ink-soft">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="We couldn't load this"
      description={getErrorMessage(error)}
      action={onRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : null}
    />
  );
}

export function Skeleton({ className = "" }) {
  return <div className={cn("animate-pulse rounded-xl bg-sand", className)} />;
}

export function PageSpinner({ label = "Loading…" }) {
  return (
    <div role="status" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-ink-faint">
      <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Avatar({ name, src, className = "h-10 w-10", rounded = "rounded-xl" }) {
  const image = resolveMediaUrl(src);
  if (image) return <img src={image} alt="" className={cn("shrink-0 object-cover", className, rounded)} />;
  return (
    <span className={cn("flex shrink-0 items-center justify-center bg-brand-soft font-display text-sm font-bold text-brand", className, rounded)} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
