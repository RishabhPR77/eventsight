import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarCheck, CalendarDays, CalendarPlus, Handshake, Inbox, Plus, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import EventCard, { EventGridSkeleton } from "@/components/events/EventCard";
import EventForm from "@/components/events/EventForm";
import { Card, EmptyState, ErrorState, LoadMore, PageHeader, Stat, Tabs } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useDebouncedValue, usePagedList } from "@/hooks/usePagedList";
import { useResource } from "@/hooks/useResource";
import { getOrganizerApplications, getOrganizerEvents } from "@/lib/api";
import { isOpenOffer, needsOrganizer } from "@/lib/offers";

const FILTERS = [
  { id: "", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
];

// Offers live on their own page; the dashboard only says when one needs a reply
function OffersNotice({ count }) {
  if (!count) return null;
  return (
    <Link to="/offers" className="mb-8 flex items-center justify-between gap-3 rounded-2xl bg-marigold-soft p-4 transition hover:bg-[#FBE8BF]">
      <span className="font-semibold">
        {count === 1 ? "1 offer needs" : `${count} offers need`} your attention
      </span>
      <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
    </Link>
  );
}

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  const term = useDebouncedValue(search.trim());
  const events = usePagedList(
    (paging) => getOrganizerEvents({ ...paging, type: filter || undefined, search: term || undefined }).then((res) => res.data),
    [filter, term]
  );
  const applications = useResource(() => getOrganizerApplications().then((res) => res.data));

  const shown = events.items;
  const upcoming = events.summary?.upcoming || 0;
  const completed = events.summary?.completed || 0;
  const deals = useMemo(() => applications.data || [], [applications.data]);

  const attention = useMemo(() => deals.filter(needsOrganizer).length, [deals]);

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
        <Stat label="Completed events" value={completed} icon={CalendarCheck} />
        <Stat label="Open offers" value={deals.filter(isOpenOffer).length} icon={Inbox} />
        <Stat label="Accepted sponsors" value={accepted} icon={Handshake} />
      </div>

      <OffersNotice count={attention} />

      <section aria-labelledby="events-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="events-title" className="text-xl font-bold">Your events</h2>
          <Tabs tabs={FILTERS} value={filter} onChange={setFilter} label="Filter events" />
        </div>

        {upcoming + completed > 3 ? (
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search your events" placeholder="Search your events" className="field-control pl-10" />
          </div>
        ) : null}

        {events.loading ? <EventGridSkeleton /> : null}
        {events.error && shown.length === 0 ? <Card><ErrorState error={events.error} onRetry={events.reload} /></Card> : null}
        {!events.loading && !events.error && shown.length === 0 ? (
          <Card>
            {upcoming + completed === 0 ? (
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
        <LoadMore list={events} />
      </section>

      <EventForm
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(event) => navigate(`/organizer/event/${event._id}`)}
      />
    </>
  );
}
