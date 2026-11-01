import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CalendarDays, LogOut, Search, Trash2, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { Input, PasswordInput } from "@/components/ui/Field";
import Logo from "@/components/ui/Logo";
import { Avatar, Badge, Card, EmptyState, ErrorState, PageSpinner, Stat, StatusBadge, Tabs } from "@/components/ui/Primitives";
import { useResource } from "@/hooks/useResource";
import {
  adminLogin,
  adminLogout,
  createBrandType,
  createCity,
  createEventCategory,
  deleteAdminEvent,
  deleteAdminUser,
  deleteBrandType,
  deleteCity,
  deleteEventCategory,
  fetchBrandTypes,
  fetchCities,
  fetchEventCategories,
  getAdminEvents,
  getAdminStats,
  getAdminUsers,
} from "@/lib/api";
import { ML_BRAND_CATEGORIES, ML_CITIES, ML_EVENT_TYPES } from "@/lib/mlMappings";
import { fmtDate, getErrorMessage, rupees, titleCase } from "@/lib/utils";

function AdminLogin({ onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await adminLogin({ username: String(form.get("username") || "").trim(), password: String(form.get("password") || "") });
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-5">
      <Card className="w-full max-w-sm p-6">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">Admin sign in</h1>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Input label="Username" name="username" autoComplete="username" required />
          <PasswordInput label="Password" name="password" autoComplete="current-password" required />
          {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p> : null}
          <Button type="submit" className="w-full" loading={submitting}>Sign in</Button>
        </form>
      </Card>
    </div>
  );
}

function Overview({ onExpired }) {
  const { data, loading, error, reload } = useResource(() => getAdminStats().then((res) => res.data));

  useEffect(() => {
    if (error?.response?.status === 401) onExpired();
  }, [error, onExpired]);

  if (loading) return <PageSpinner />;
  if (error) return <Card><ErrorState error={error} onRetry={reload} /></Card>;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Users" value={data.totalUsers} hint={`${data.recentUsers} joined in 30 days`} />
      <Stat label="Organizers" value={data.totalOrganizers} />
      <Stat label="Sponsors" value={data.totalSponsors} />
      <Stat label="Event categories" value={data.totalCategories} />
      <Stat label="Events" value={data.totalEvents} />
      <Stat label="Upcoming events" value={data.activeEvents} />
      <Stat label="Completed events" value={data.completedEvents} />
      <Stat label="Brand types" value={data.totalBrandTypes} />
    </div>
  );
}

function SearchBox({ value, onChange, label }) {
  return (
    <div className="relative mb-4 max-w-sm">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} placeholder={label} className="field-control pl-10" />
    </div>
  );
}

function useDebounced(value, delay = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

function RemoveButton({ label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-faint transition hover:bg-bad-soft hover:text-bad"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function UsersTab() {
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const term = useDebounced(search);
  const { data, loading, error, reload } = useResource(() => getAdminUsers({ search: term, limit: 100 }).then((res) => res.data.users), [term]);

  const remove = async (user) => {
    const yes = await confirm({
      title: `Delete ${user.username}?`,
      message: "Their profile and events are removed, and pending offers are closed. This can't be undone.",
      confirmLabel: "Delete user",
      danger: true,
    });
    if (!yes) return;
    try {
      await deleteAdminUser(user._id);
      toast.success("User deleted");
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <SearchBox value={search} onChange={setSearch} label="Search users" />
      <Card>
        {error ? <ErrorState error={error} onRetry={reload} /> : null}
        {!loading && !error && !data?.length ? <EmptyState icon={Users} title="No users found" /> : null}
        <ul className="divide-y divide-line">
          {(data || []).map((user) => (
            <li key={user._id} className="flex items-center gap-3 p-4">
              <Avatar name={user.username} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{user.username}</p>
                <p className="truncate text-sm text-ink-soft">{user.email}</p>
              </div>
              <Badge tone={user.role === "sponsor" ? "accent" : "brand"} className="capitalize">{user.role}</Badge>
              <RemoveButton label={`Delete ${user.username}`} onClick={() => remove(user)} />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function EventsTab() {
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const term = useDebounced(search);
  const { data, loading, error, reload } = useResource(() => getAdminEvents({ search: term, limit: 100 }).then((res) => res.data.events), [term]);

  const remove = async (event) => {
    const yes = await confirm({
      title: `Delete ${event.eventName}?`,
      message: "It disappears for everyone, even if it has accepted sponsors.",
      confirmLabel: "Delete event",
      danger: true,
    });
    if (!yes) return;
    try {
      await deleteAdminEvent(event._id);
      toast.success("Event deleted");
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <SearchBox value={search} onChange={setSearch} label="Search events" />
      <Card>
        {error ? <ErrorState error={error} onRetry={reload} /> : null}
        {!loading && !error && !data?.length ? <EmptyState icon={CalendarDays} title="No events found" /> : null}
        <ul className="divide-y divide-line">
          {(data || []).map((event) => (
            <li key={event._id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{event.eventName}</p>
                <p className="truncate text-sm text-ink-soft">
                  {event.location} · {fmtDate(event.date)} · {rupees(event.ask)} · by {event.organizerInfo?.username || "unknown"}
                </p>
              </div>
              <StatusBadge status={event.status} className="max-sm:hidden" />
              <RemoveButton label={`Delete ${event.eventName}`} onClick={() => remove(event)} />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function MasterList({ title, description, options, items, normalize = (name) => name, onCreate, onDelete, display = (name) => name, reload }) {
  const confirm = useConfirm();
  const [choice, setChoice] = useState("");
  const existing = new Set(items.map((item) => normalize(item.name)));
  const available = options.filter((name) => !existing.has(normalize(name)));

  const add = async (e) => {
    e.preventDefault();
    if (!choice) return;
    try {
      await onCreate({ name: choice });
      setChoice("");
      toast.success("Added");
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (item) => {
    const yes = await confirm({ title: `Delete ${display(item.name)}?`, message: "It won't be offered in forms any more.", confirmLabel: "Delete", danger: true });
    if (!yes) return;
    try {
      await onDelete(item._id);
      toast.success("Deleted");
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Card className="flex flex-col p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{description}</p>
      <form onSubmit={add} className="mt-4 flex gap-2">
        <select aria-label={`Add to ${title}`} value={choice} onChange={(e) => setChoice(e.target.value)} className="field-control min-w-0">
          <option value="">{available.length ? "Choose one to add" : "All added"}</option>
          {available.map((name) => <option key={name}>{name}</option>)}
        </select>
        <Button type="submit" disabled={!choice}>Add</Button>
      </form>
      <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto">
        {items.map((item) => (
          <li key={item._id} className="flex items-center justify-between gap-2 py-1.5">
            <span className="truncate text-sm font-medium">{display(item.name)}</span>
            <RemoveButton label={`Delete ${display(item.name)}`} onClick={() => remove(item)} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function MasterData() {
  const { data, loading, error, reload } = useResource(() => Promise.all([fetchEventCategories(), fetchBrandTypes(), fetchCities()]));

  if (loading) return <PageSpinner />;
  if (error) return <Card><ErrorState error={error} onRetry={reload} /></Card>;

  const [categories, brandTypes, cities] = data;
  const upper = (name) => name.toUpperCase();

  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      <MasterList title="Event categories" description="Only types the prediction model knows." options={ML_EVENT_TYPES} items={categories} normalize={upper} display={titleCase} onCreate={createEventCategory} onDelete={deleteEventCategory} reload={reload} />
      <MasterList title="Brand types" description="Only industries the model knows." options={ML_BRAND_CATEGORIES} items={brandTypes} normalize={upper} display={titleCase} onCreate={createBrandType} onDelete={deleteBrandType} reload={reload} />
      <MasterList title="Cities" description="Madhya Pradesh cities the model knows." options={ML_CITIES} items={cities} onCreate={createCity} onDelete={deleteCity} reload={reload} />
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "events", label: "Events" },
  { id: "master", label: "Setup data" },
];

export default function AdminPage() {
  const [status, setStatus] = useState("checking");
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    getAdminStats()
      .then(() => setStatus("in"))
      .catch(() => setStatus("out"));
  }, []);

  if (status === "checking") return <PageSpinner />;
  if (status === "out") return <AdminLogin onSuccess={() => setStatus("in")} />;

  const handleSignOut = async () => {
    await adminLogout().catch(() => {});
    setStatus("out");
  };

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge tone="accent">Admin</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}><LogOut className="h-4 w-4" aria-hidden="true" />Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Tabs className="mb-6" tabs={TABS} value={tab} onChange={setTab} label="Admin sections" />
        {tab === "overview" ? <Overview onExpired={() => setStatus("out")} /> : null}
        {tab === "users" ? <UsersTab /> : null}
        {tab === "events" ? <EventsTab /> : null}
        {tab === "master" ? <MasterData /> : null}
      </main>
    </div>
  );
}
