import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, CalendarDays, Handshake, History, IndianRupee, MapPin, Star } from "lucide-react";
import { EventCover } from "@/components/events/EventCard";
import Button from "@/components/ui/Button";
import { Avatar, Badge, Card, EmptyState, ErrorState, PageHeader, PageSpinner, Stat } from "@/components/ui/Primitives";
import { useResource } from "@/hooks/useResource";
import { getOrganizerHistory } from "@/lib/api";
import { fmtDate, rupees, titleCase } from "@/lib/utils";

function PastEvent({ event }) {
  return (
    <li className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-4">
        <EventCover event={event} className="h-20 w-20 shrink-0 rounded-xl text-2xl" />
        <div className="min-w-0 flex-1 basis-56">
          <Link to={`/organizer/event/${event._id}`} className="text-lg font-semibold hover:text-brand hover:underline">{event.eventName}</Link>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-ink-soft">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{event.location}</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{fmtDate(event.date)}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{titleCase(event.eventCategory?.name)}</Badge>
            {event.rating !== null ? (
              <Badge tone="accent"><Star className="h-3 w-3" aria-hidden="true" />{Math.round(event.rating * 100)}% from {event.feedbackCount} sponsor{event.feedbackCount === 1 ? "" : "s"}</Badge>
            ) : null}
          </div>
        </div>
        <div className="w-full sm:w-auto sm:text-right">
          <p className="text-xs text-ink-faint">Raised</p>
          <p className="font-display text-xl font-bold text-brand">{rupees(event.raised)}</p>
        </div>
      </div>
      {event.sponsors.length ? (
        <ul className="mt-3 flex flex-wrap gap-2 sm:pl-24">
          {event.sponsors.map((sponsor) => (
            <li key={sponsor._id} className="flex items-center gap-2 rounded-full bg-paper py-1 pl-1 pr-3 text-sm">
              <Avatar name={sponsor.name} src={sponsor.logo} className="h-6 w-6 text-[10px]" rounded="rounded-full" />
              {sponsor.name}
              <span className="font-semibold text-brand">{rupees(sponsor.amount)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-ink-faint sm:pl-24">No sponsors on this event.</p>}
    </li>
  );
}

export default function HistoryPage() {
  const { data, loading, error, reload } = useResource(() => getOrganizerHistory().then((res) => res.data));

  const pastSponsors = useMemo(() => {
    const totals = new Map();
    (data?.events || []).forEach((event) => event.sponsors.forEach((sponsor) => {
      const entry = totals.get(sponsor.id) || { ...sponsor, total: 0, deals: 0 };
      totals.set(sponsor.id, { ...entry, total: entry.total + sponsor.amount, deals: entry.deals + 1 });
    }));
    return [...totals.values()].sort((a, b) => b.total - a.total);
  }, [data]);

  if (loading) return <PageSpinner label="Loading your history…" />;
  if (error) return <Card><ErrorState error={error} onRetry={reload} /></Card>;

  const { summary, events } = data;

  return (
    <>
      <PageHeader title="History" description="Your past events and the sponsors who backed them." />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Events run" value={summary.events} icon={CalendarCheck} />
        <Stat label="Total raised" value={rupees(summary.raised)} icon={IndianRupee} />
        <Stat label="Sponsors" value={pastSponsors.length} icon={Handshake} />
        <Stat label="Average rating" value={summary.rating === null ? "—" : `${Math.round(summary.rating * 100)}%`} icon={Star} />
      </div>

      {events.length === 0 ? (
        <Card>
          <EmptyState icon={History} title="No past events yet" description="Events appear here once they've finished." action={<Button to="/">Go to dashboard</Button>} />
        </Card>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section aria-labelledby="past-events">
            <h2 id="past-events" className="mb-3 text-xl font-bold">Past events</h2>
            <Card><ul className="divide-y divide-line">{events.map((event) => <PastEvent key={event._id} event={event} />)}</ul></Card>
          </section>

          <section aria-labelledby="past-sponsors">
            <h2 id="past-sponsors" className="mb-3 text-xl font-bold">Past sponsors</h2>
            <Card>
              {pastSponsors.length === 0 ? <p className="p-5 text-sm text-ink-faint">No sponsors yet.</p> : (
                <ul className="divide-y divide-line">
                  {pastSponsors.map((sponsor) => (
                    <li key={sponsor.id} className="flex items-center gap-3 p-4">
                      <Avatar name={sponsor.name} src={sponsor.logo} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{sponsor.name}</p>
                        <p className="text-sm text-ink-soft">{sponsor.deals} event{sponsor.deals === 1 ? "" : "s"} · {rupees(sponsor.total)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>
      )}
    </>
  );
}
