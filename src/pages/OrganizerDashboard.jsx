import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarCheck, CalendarDays, CalendarPlus, Handshake, Inbox, Plus, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import EventCard, { EventGridSkeleton } from "@/components/events/EventCard";
import EventForm from "@/components/events/EventForm";
import { Avatar, Card, EmptyState, ErrorState, PageHeader, Stat, Tabs } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import { getOrganizerApplications, getOrganizerEvents } from "@/lib/api";
import { rupees } from "@/lib/utils";

const FILTERS = [
  { id: "", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
];

function AttentionList({ items }) {
  if (!items.length) return null;
  return (
    <section className="mb-8" aria-labelledby="attention-title">
      <h2 id="attention-title" className="mb-3 text-xl font-bold">Needs your attention</h2>
      <Card className="divide-y divide-line">
        {items.map((item) => {
          const offer = item.negotiations?.at(-1);
          const confirm = item.status === "accepted";
          return (
            <Link key={item._id} to={`/organizer/event/${item.event._id}`} className="flex items-center gap-3 p-4 transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-paper">
              <Avatar name={item.brand?.brandName || item.sponsor?.username} src={item.brand?.logo} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {confirm ? "Confirm sponsorship with " : item.status === "negotiating" ? "Counter-offer from " : "New offer from "}
                  {item.brand?.brandName || item.sponsor?.username || "a sponsor"}
                </p>
                <p className="truncate text-sm text-ink-soft">{item.event.eventName} · {rupees(confirm ? item.finalAmount : offer?.amount)}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-ink-faint" aria-hidden="true" />
            </Link>
          );
        })}
      </Card>
    </section>
  );
}

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  const events = useResource(() => getOrganizerEvents({ page: 1, limit: 50 }).then((res) => res.data.events));
  const applications = useResource(() => getOrganizerApplications().then((res) => res.data));

  const list = useMemo(() => events.data || [], [events.data]);
  const deals = useMemo(() => applications.data || [], [applications.data]);

  const attention = useMemo(() => deals.filter((item) => {
    if (!item.event) return false;
    if (item.status === "accepted") return item.event.status === "completed" && !item.organizerConfirmedAt;
    return item.event.status === "upcoming" && item.negotiations?.at(-1)?.from === "sponsor";
  }), [deals]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return list.filter((event) => (
      (!filter || event.status === filter)
      && (!term || event.eventName.toLowerCase().includes(term) || event.location.toLowerCase().includes(term))
    ));
  }, [list, search, filter]);

  const upcoming = list.filter((event) => event.status === "upcoming").length;
  const accepted = deals.filter((item) => item.status === "accepted").length;

  return (
    <>
      <PageHeader
        title={`Hi, ${user?.username}`}
        description="Here's what's happening with your events."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden="true" />New event</Button>}
      />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Upcoming events" value={upcoming} icon={CalendarDays} />
        <Stat label="Completed events" value={list.length - upcoming} icon={CalendarCheck} />
        <Stat label="Open offers" value={deals.filter((item) => item.status !== "accepted").length} icon={Inbox} />
        <Stat label="Accepted sponsors" value={accepted} icon={Handshake} />
      </div>

      <AttentionList items={attention} />

      <section aria-labelledby="events-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="events-title" className="text-xl font-bold">Your events</h2>
          <Tabs tabs={FILTERS} value={filter} onChange={setFilter} label="Filter events" />
        </div>

        {list.length > 3 ? (
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search your events" placeholder="Search your events" className="field-control pl-10" />
          </div>
        ) : null}

        {events.loading ? <EventGridSkeleton /> : null}
        {events.error ? <Card><ErrorState error={events.error} onRetry={events.reload} /></Card> : null}
        {!events.loading && !events.error && shown.length === 0 ? (
          <Card>
            {list.length === 0 ? (
              <EmptyState
                icon={CalendarPlus}
                title="Create your first event"
                description="Publish an event and sponsors can start sending you offers."
                action={<Button onClick={() => setCreating(true)}>Create an event</Button>}
              />
            ) : <EmptyState icon={Search} title="No events match" description="Try a different search or filter." />}
          </Card>
        ) : null}
        {shown.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((event) => <EventCard key={event._id} event={event} to={`/organizer/event/${event._id}`} />)}
          </div>
        ) : null}
      </section>

      <EventForm
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(event) => navigate(`/organizer/event/${event._id}`)}
      />
    </>
  );
}
