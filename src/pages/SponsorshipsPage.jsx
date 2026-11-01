import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, CheckCheck, Handshake, History, IndianRupee, MapPin, Users } from "lucide-react";
import { EventCover } from "@/components/events/EventCard";
import Button from "@/components/ui/Button";
import { Badge, Card, EmptyState, ErrorState, PageHeader, PageSpinner, Stat, StatusBadge, Tabs } from "@/components/ui/Primitives";
import { useResource } from "@/hooks/useResource";
import { getMyApplications, getSponsorHistory } from "@/lib/api";
import { fmtDate, rupees } from "@/lib/utils";

const nextStep = (item) => {
  const latest = item.negotiations?.at(-1);
  if (["pending", "negotiating"].includes(item.status)) {
    return latest?.from === "organizer" ? { tone: "accent", label: "Reply to counter-offer" } : null;
  }
  if (item.status !== "accepted" || item.event?.status !== "completed") return null;
  if (!item.sponsorConfirmedAt) return { tone: "accent", label: "Confirm it happened" };
  if (!item.organizerConfirmedAt) return { tone: "neutral", label: "Waiting for organizer" };
  return { tone: "brand", label: "Feedback is open" };
};

function DealRow({ item }) {
  const removed = !item.event || item.event.isDeleted;
  const amount = item.status === "accepted" ? item.finalAmount : item.negotiations?.at(-1)?.amount;
  const step = nextStep(item);

  const body = (
    <>
      <EventCover event={item.event} className="h-16 w-16 shrink-0 rounded-xl text-2xl sm:h-20 sm:w-20" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-semibold">{removed ? "Event no longer available" : item.event.eventName}</h2>
        {removed ? null : (
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-ink-soft">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{item.event.location}</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{fmtDate(item.event.date)}</span>
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          {step ? <Badge tone={step.tone}>{step.label}</Badge> : null}
          <span className="font-display font-bold text-brand">{rupees(amount)}</span>
        </div>
      </div>
      {removed ? null : <ArrowRight className="hidden h-5 w-5 shrink-0 text-ink-faint sm:block" aria-hidden="true" />}
    </>
  );

  if (removed) return <div className="flex items-center gap-4 p-4 opacity-70">{body}</div>;
  return (
    <Link to={`/sponsor/event/${item.event._id}`} className="flex items-center gap-4 p-4 transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-paper">
      {body}
    </Link>
  );
}

function HistoryRow({ item }) {
  const removed = item.event.isDeleted;
  const body = (
    <>
      <EventCover event={item.event} className="h-16 w-16 shrink-0 rounded-xl text-2xl sm:h-20 sm:w-20" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-semibold">{item.event.eventName}</h2>
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-ink-soft">
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{item.event.location}</span>
          <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{fmtDate(item.event.date)}</span>
        </p>
        <p className="text-sm text-ink-faint">Organized by {item.organizerName}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.confirmed ? <Badge tone="good"><CheckCheck className="h-3 w-3" aria-hidden="true" />Confirmed</Badge> : <Badge tone="accent">Not confirmed yet</Badge>}
          {item.confirmed && !item.hasFeedback ? <Badge tone="brand">Feedback is open</Badge> : null}
          {item.hasFeedback ? <Badge>Feedback given</Badge> : null}
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-ink-faint">Sponsored</p>
        <p className="font-display text-lg font-bold text-brand">{rupees(item.amount)}</p>
      </div>
    </>
  );

  if (removed) return <div className="flex items-center gap-4 p-4">{body}</div>;
  return (
    <Link to={`/sponsor/event/${item.event._id}`} className="flex items-center gap-4 p-4 transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-paper">
      {body}
    </Link>
  );
}

function SponsorHistory() {
  const { data, loading, error, reload } = useResource(() => getSponsorHistory().then((res) => res.data));

  if (loading) return <PageSpinner label="Loading your history…" />;
  if (error) return <Card><ErrorState error={error} onRetry={reload} /></Card>;

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Events sponsored" value={data.summary.events} icon={Handshake} />
        <Stat label="Total sponsored" value={rupees(data.summary.spent)} icon={IndianRupee} />
        <Stat label="Organizers" value={data.summary.organizers} icon={Users} />
      </div>
      <Card>
        {data.sponsorships.length === 0 ? (
          <EmptyState icon={History} title="No past sponsorships yet" description="Events you've sponsored appear here once they've finished." />
        ) : (
          <div className="divide-y divide-line">
            {data.sponsorships.map((item) => <HistoryRow key={item._id} item={item} />)}
          </div>
        )}
      </Card>
    </>
  );
}

export default function SponsorshipsPage() {
  const [tab, setTab] = useState("active");
  const { data, loading, error, reload } = useResource(() => getMyApplications().then((res) => res.data));

  const groups = useMemo(() => {
    const all = data || [];
    const closed = (item) => ["rejected", "withdrawn", "cancelled"].includes(item.status);
    return { active: all.filter((item) => !closed(item)), closed: all.filter(closed) };
  }, [data]);

  if (loading) return <PageSpinner label="Loading your sponsorships…" />;

  const shown = groups[tab] || [];

  return (
    <>
      <PageHeader title="Your sponsorships" description="Every offer you've sent, from application to feedback." />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "active", label: "Active", count: groups.active.length },
          { id: "closed", label: "Closed", count: groups.closed.length },
          { id: "history", label: "History" },
        ]}
      />
      {tab === "history" ? <SponsorHistory /> : <Card>
        {error ? <ErrorState error={error} onRetry={reload} /> : null}
        {!error && shown.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title={tab === "active" ? "No sponsorships yet" : "Nothing closed yet"}
            description={tab === "active" ? "Find an event you like and send your first offer." : "Rejected, withdrawn and cancelled offers will appear here."}
            action={tab === "active" ? <Button to="/">Discover events</Button> : null}
          />
        ) : null}
        {shown.length > 0 ? (
          <div className="divide-y divide-line">
            {shown.map((item) => <DealRow key={item._id} item={item} />)}
          </div>
        ) : null}
      </Card>}
    </>
  );
}
