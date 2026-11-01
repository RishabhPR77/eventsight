import { Link } from "react-router-dom";
import { CalendarDays, MapPin } from "lucide-react";
import { cn, fmtDate, resolveMediaUrl, rupees, titleCase } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Primitives";

const SHADES = ["bg-brand-soft text-brand", "bg-marigold-soft text-marigold-strong", "bg-good-soft text-good", "bg-sand text-ink-soft"];

export function EventCover({ event, className = "" }) {
  const image = resolveMediaUrl(event?.thumbnail);
  const name = event?.eventName || "Event";

  if (image) return <img src={image} alt="" className={cn("object-cover", className)} />;

  const shade = SHADES[name.charCodeAt(0) % SHADES.length];
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden font-display text-5xl font-bold", shade, className)} aria-hidden="true">
      <span className="absolute -right-10 -top-14 aspect-square h-[110%] rounded-full border-[1.25rem] border-current opacity-10" />
      <span className="absolute -bottom-16 -left-10 aspect-square h-[90%] rounded-full border-[1rem] border-current opacity-10" />
      <span className="relative">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

export default function EventCard({ event, to }) {
  return (
    <Link
      to={to}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative">
        <EventCover event={event} className="h-40 w-full" />
        <StatusBadge status={event.status} className="absolute left-3 top-3 shadow-sm" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-ink-faint">{titleCase(event.eventCategory?.name) || "Event"}</p>
        <h3 className="mt-1 truncate text-lg font-semibold group-hover:text-brand">{event.eventName}</h3>
        <div className="mt-2 space-y-1 text-sm text-ink-soft">
          <p className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-ink-faint" aria-hidden="true" />{event.location}</p>
          <p className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-ink-faint" aria-hidden="true" />{fmtDate(event.date)}</p>
        </div>
        <div className="mt-3 border-t border-line pt-3">
          <span className="text-xs text-ink-faint">Sponsorship ask</span>
          <p className="font-display text-lg font-bold text-brand">{rupees(event.ask)}</p>
        </div>
      </div>
    </Link>
  );
}

export function EventGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((key) => <div key={key} className="h-80 animate-pulse rounded-2xl bg-sand" />)}
    </div>
  );
}
