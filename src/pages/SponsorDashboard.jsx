import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass, Search, Store } from "lucide-react";
import BrandForm from "@/components/brand/BrandForm";
import EventCard, { EventGridSkeleton } from "@/components/events/EventCard";
import Button from "@/components/ui/Button";
import { Card, EmptyState, ErrorState, LoadMore, PageHeader, Tabs } from "@/components/ui/Primitives";
import { useDebouncedValue, usePagedList } from "@/hooks/usePagedList";
import { useResource } from "@/hooks/useResource";
import { fetchCities, fetchEventCategories, getMyApplications, getSponsorCompletedEvents, getSponsorEvents, getSponsorProfile } from "@/lib/api";
import { titleCase } from "@/lib/utils";

const WHEN = [
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Past events" },
];

function ActionNotice({ count }) {
  if (!count) return null;
  return (
    <Link to="/sponsorships" className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-marigold-soft p-4 transition hover:bg-[#FBE8BF]">
      <span className="font-semibold">
        {count === 1 ? "1 sponsorship needs" : `${count} sponsorships need`} your attention
      </span>
      <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
    </Link>
  );
}

export default function SponsorDashboard() {
  const [when, setWhen] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [creatingProfile, setCreatingProfile] = useState(false);

  const profile = useResource(() => getSponsorProfile().then((res) => res.data));
  const deals = useResource(() => getMyApplications().then((res) => res.data));
  const filterOptions = useResource(() => Promise.all([fetchCities(), fetchEventCategories()]));
  const [cities, categories] = filterOptions.data || [[], []];

  const term = useDebouncedValue(search.trim());
  const filtering = Boolean(term || city || category);
  const events = usePagedList(
    (paging) => (when === "upcoming" ? getSponsorEvents : getSponsorCompletedEvents)({
      ...paging,
      search: term || undefined,
      location: city || undefined,
      category: category || undefined,
    }).then((res) => res.data),
    [when, term, city, category]
  );
  const shown = events.items;

  const toConfirm = (deals.data || []).filter((item) => (
    (item.status === "accepted" && item.event?.status === "completed" && !item.sponsorConfirmedAt)
    || (["pending", "negotiating"].includes(item.status) && item.event?.status === "upcoming" && item.negotiations?.at(-1)?.from === "organizer")
  )).length;

  const clearFilters = () => {
    setSearch("");
    setCity("");
    setCategory("");
  };

  return (
    <>
      <PageHeader title="Discover events" description="Find events worth sponsoring, and check the fit before you commit." />

      <ActionNotice count={toConfirm} />

      {!profile.loading && !profile.data ? (
        <Card surface="border-brand/20 bg-brand-soft" className="mb-6 flex flex-wrap items-center gap-4 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand"><Store className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1 basis-56">
            <h2 className="text-lg font-semibold">Set up your brand first</h2>
            <p className="text-sm text-ink-soft">You'll need a brand profile to apply to events and run AI analysis.</p>
          </div>
          <Button onClick={() => setCreatingProfile(true)}>Create brand profile</Button>
        </Card>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs tabs={WHEN} value={when} onChange={setWhen} label="Event timing" />
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search events" placeholder="Search by name or city" className="field-control pl-10" />
        </div>
        <select aria-label="City" value={city} onChange={(e) => setCity(e.target.value)} className="field-control w-auto flex-1 sm:flex-none">
          <option value="">All cities</option>
          {cities.map((item) => <option key={item._id}>{item.name}</option>)}
        </select>
        <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="field-control w-auto flex-1 sm:flex-none">
          <option value="">All categories</option>
          {categories.map((item) => <option key={item._id} value={item._id}>{titleCase(item.name)}</option>)}
        </select>
      </div>

      {events.loading ? <EventGridSkeleton /> : null}
      {events.error && shown.length === 0 ? <Card><ErrorState error={events.error} onRetry={events.reload} /></Card> : null}
      {!events.loading && !events.error && shown.length === 0 ? (
        <Card>
          {filtering ? (
            <EmptyState icon={Search} title="No events match" description="Try a different search or filter." action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>} />
          ) : (
            <EmptyState icon={Compass} title={when === "upcoming" ? "No upcoming events yet" : "No past events yet"} description="New events appear here as organizers publish them." />
          )}
        </Card>
      ) : null}
      {!events.loading && shown.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((event) => <EventCard key={event._id} event={event} to={`/sponsor/event/${event._id}`} />)}
        </div>
      ) : null}
      <LoadMore list={events} />

      <BrandForm
        open={creatingProfile}
        onClose={() => setCreatingProfile(false)}
        onSaved={() => {
          setCreatingProfile(false);
          profile.reload();
        }}
      />
    </>
  );
}
