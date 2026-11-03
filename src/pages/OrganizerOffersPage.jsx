import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Inbox } from "lucide-react";
import Button from "@/components/ui/Button";
import { Avatar, Badge, Card, EmptyState, ErrorState, PageHeader, PageSpinner, StatusBadge, Tabs } from "@/components/ui/Primitives";
import { useResource } from "@/hooks/useResource";
import { getOrganizerApplications } from "@/lib/api";
import { isClosedOffer, needsOrganizer, organizerNextStep } from "@/lib/offers";
import { fmtDate, rupees } from "@/lib/utils";

const EMPTY = {
  needs: { title: "You're all caught up", description: "New offers and counter-offers that need your reply appear here." },
  active: { title: "Nothing in progress", description: "Offers waiting on sponsors, and agreed deals, appear here." },
  closed: { title: "Nothing closed yet", description: "Confirmed, rejected, withdrawn and cancelled offers appear here." },
};

function OfferRow({ item }) {
  const name = item.brand?.brandName || item.sponsor?.username || "Sponsor";
  const amount = item.status === "accepted" ? item.finalAmount : item.negotiations?.at(-1)?.amount;
  const step = organizerNextStep(item);
  const removed = !item.event;

  const body = (
    <>
      <Avatar name={name} src={item.brand?.logo} className="h-12 w-12" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-semibold">{name}</h2>
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-ink-soft">
          <span className="truncate">{removed ? "Event no longer available" : item.event.eventName}</span>
          {removed ? null : <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{fmtDate(item.event.date)}</span>}
        </p>
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
    <Link to={`/organizer/event/${item.event._id}`} className="flex items-center gap-4 p-4 transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-paper">
      {body}
    </Link>
  );
}

// Every offer and deal across the organizer's events, kept off the dashboard
export default function OrganizerOffersPage() {
  const { data, loading, error, reload } = useResource(() => getOrganizerApplications().then((res) => res.data));
  const [tab, setTab] = useState(null);

  const groups = useMemo(() => {
    const all = data || [];
    return {
      needs: all.filter(needsOrganizer),
      active: all.filter((item) => !needsOrganizer(item) && !isClosedOffer(item)),
      closed: all.filter(isClosedOffer),
    };
  }, [data]);

  if (loading) return <PageSpinner label="Loading your offers…" />;

  // Start where there's something to do
  const current = tab || (groups.needs.length ? "needs" : "active");
  const shown = groups[current];

  return (
    <>
      <PageHeader title="Offers" description="Every offer and deal across your events. Open one to reply, confirm or cancel." />
      <Tabs
        className="mb-4"
        label="Offer groups"
        value={current}
        onChange={setTab}
        tabs={[
          { id: "needs", label: "Needs you", count: groups.needs.length },
          { id: "active", label: "In progress", count: groups.active.length },
          { id: "closed", label: "Closed", count: groups.closed.length },
        ]}
      />
      <Card>
        {error ? <ErrorState error={error} onRetry={reload} /> : null}
        {!error && shown.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={EMPTY[current].title}
            description={EMPTY[current].description}
            action={current === "needs" ? <Button variant="secondary" to="/">Go to your events</Button> : null}
          />
        ) : null}
        {shown.length > 0 ? (
          <div className="divide-y divide-line">
            {shown.map((item) => <OfferRow key={item._id} item={item} />)}
          </div>
        ) : null}
      </Card>
    </>
  );
}
