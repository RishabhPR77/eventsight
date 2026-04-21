import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  createEvent,
  fetchCities,
  fetchEventCategories,
  getOrganizerEvents,
} from "@/lib/api";
import { fmtINR, getErrorMessage, resolveMediaUrl } from "@/lib/utils";

const cx = (...xs) => xs.filter(Boolean).join(" ");
const PLATFORMS = ["instagram", "youtube", "twitter", "facebook", "linkedin", "other"];

function IconBadge({ children, tone = "default" }) {
  return <span className={cx("organizer-stat-icon", tone !== "default" && `organizer-stat-icon-${tone}`)}>{children}</span>;
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="3" y="5" width="18" height="16" rx="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13 2 5 14h6l-1 8 9-13h-6l0-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 4h10v3a5 5 0 1 1-10 0V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M17 6h2a2 2 0 0 1 0 4h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 6H5a2 2 0 1 0 0 4h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ label, value, hint, helper, icon, tone }) {
  return (
    <div className="organizer-stat-card">
      <div className="organizer-stat-top">
        <div className="flex items-center gap-3 min-w-0">
          <IconBadge tone={tone}>{icon}</IconBadge>
          <div className="min-w-0">
            <div className="organizer-stat-label">{label}</div>
            {hint ? <div className="organizer-stat-hint">{hint}</div> : null}
          </div>
        </div>
      </div>
      <div className="organizer-stat-value">{value}</div>
      {helper ? <div className="organizer-stat-helper">{helper}</div> : null}
      <div className="organizer-stat-glow" />
    </div>
  );
}

function EventCard({ event, onClick }) {
  const status = event.status || (new Date(event.date) < new Date() ? "completed" : "upcoming");
  return (
    <button
      type="button"
      onClick={onClick}
      className="event-card text-left w-full !p-0"
      style={{ overflow: "hidden", display: "block" }}
    >
      <div className="relative">
        <img
          src={resolveMediaUrl(event.thumbnail) || "https://placehold.co/400x200?text=Event"}
          alt={event.eventName}
          className="w-full h-44 object-cover"
        />
        <div className="absolute top-3 right-3">
          <span
            className={cx(
              "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg",
              status === "completed" ? "bg-indigo-500/80 text-white" : "bg-emerald-500/80 text-white"
            )}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <div className="text-xl font-black truncate">{event.eventName}</div>
            <div className="muted text-sm mt-1 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
              {event.location}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <div className="bg-[var(--bg-soft)] px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase text-[var(--text-soft)]">
            ₹{fmtINR(event.ask)}
          </div>
          <div className="bg-[var(--bg-soft)] px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase text-[var(--text-soft)]">
            {event.eventCategory?.name || "Event"}
          </div>
        </div>
      </div>
    </button>
  );
}

function SocialRows({ initial }) {
  const [rows, setRows] = useState(() => initial?.length ? initial.map((item, index) => ({ id: index + 1, ...item })) : [{ id: 1, platform: "instagram", link: "", followers: "" }]);

  return (
    <div className="md:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <label className="field-label !mb-0">Social media channels</label>
        <button type="button" className="font-extrabold text-xs uppercase tracking-widest text-[var(--accent)] px-3 py-1 bg-[color:rgba(109,94,252,0.1)] rounded-lg" onClick={() => setRows((prev) => [...prev, { id: Date.now(), platform: "instagram", link: "", followers: "" }])}>+ Add channel</button>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[140px_1fr_130px_45px] gap-3 items-center">
            <select value={row.platform} onChange={(e) => setRows((prev) => prev.map((item) => item.id === row.id ? { ...item, platform: e.target.value } : item))} className="select-field">
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input value={row.link} onChange={(e) => setRows((prev) => prev.map((item) => item.id === row.id ? { ...item, link: e.target.value } : item))} className="input-field" placeholder="Profile link" />
            <input value={row.followers} onChange={(e) => setRows((prev) => prev.map((item) => item.id === row.id ? { ...item, followers: e.target.value } : item))} className="input-field" type="number" placeholder="Reach" />
            <button type="button" className="btn-danger !p-0 !h-11 !rounded-2xl flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity" onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}>×</button>
          </div>
        ))}
      </div>
      <input type="hidden" name="socialMediaAccount" value={JSON.stringify(rows.filter((r) => r.link).map((r) => ({ platform: r.platform, link: r.link, followers: Number(r.followers) || 0 })))} />
    </div>
  );
}

function EventForm({ categories, cities, onSubmit, onClose, submitting }) {
  const [preview, setPreview] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) setPreview(URL.createObjectURL(file));
  };
  return (
    <div className="modal-overlay">
      <div className="modal-card animate-fade-up">
        <div className="modal-header">
          <div>
            <h3 className="text-3xl font-black">Create New Event</h3>
            <p className="muted mt-1">Configure your event metrics and discoverable details.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6" encType="multipart/form-data">
          <div className="modal-section-grid">
            <div>
              <label className="field-label">Event name</label>
              <input name="eventName" required className="input-field" placeholder="e.g. TechConf 2026" />
            </div>
            <div>
              <label className="field-label">Category</label>
              <select name="eventCategory" required className="select-field">
                <option value="">Select category</option>
                {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
              </select>
            </div>
          </div>

          <div>
             <label className="field-label">Description</label>
             <textarea name="eventDescription" rows={3} required className="textarea-field" placeholder="Tell sponsors what makes this event unique..." />
          </div>

          <div className="modal-section-grid">
            <div>
              <label className="field-label">City / location</label>
              <select name="location" required className="select-field">
                <option value="">Select city</option>
                {cities.map((city) => <option key={city._id} value={city.name}>{city.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Event date</label>
              <input name="date" type="date" required className="input-field" />
            </div>
          </div>

          <div className="modal-section-grid">
             <div>
                <label className="field-label">Capacity</label>
                <input name="capacity" type="number" min="1" required className="input-field" />
             </div>
             <div>
                <label className="field-label">Ask (₹)</label>
                <input name="ask" type="number" min="0" required className="input-field" />
             </div>
          </div>

          <div className="modal-section-grid">
             <div>
                <label className="field-label">Ticket Price (₹)</label>
                <input name="ticketPrice" type="number" min="0" defaultValue={0} required className="input-field" />
             </div>
             <div>
                <label className="field-label">Marketing Budget (₹)</label>
                <input name="marketingBudget" type="number" min="0" defaultValue={0} required className="input-field" />
             </div>
          </div>

          <div className="flex items-center gap-2">
            <input name="isIndoor" type="checkbox" className="w-5 h-5 accent-[var(--accent)]" id="indoor-check" />
            <label htmlFor="indoor-check" className="text-sm font-bold opacity-70">Indoor event</label>
          </div>

          <SocialRows />

          <div className="md:col-span-2">
            <label className="field-label">Thumbnail image</label>
            <div className="flex gap-4 items-center mb-2">
               <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border">
                  {preview ? (
                    <img src={preview} className="w-full h-full object-cover" />
                  ) : <span className="text-xs muted">No image</span>}
               </div>
               <input 
                 name="thumbnail" 
                 type="file" 
                 accept="image/*" 
                 onChange={handleFile} 
                 className="input-field flex-1" 
               />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-4 text-lg">
            {submitting ? "Creating..." : "Launch Event Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OrganizerDashboard({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evtsRes, catRes, cityRes] = await Promise.all([
        getOrganizerEvents({ page: 1, limit: 100 }),
        fetchEventCategories(),
        fetchCities(),
      ]);
      setEvents(evtsRes?.data?.events || evtsRes?.data || []);
      setCategories(catRes);
      setCities(cityRes);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const rawForm = e.currentTarget;
    const form = new FormData();
    const fields = ["eventName", "eventCategory", "eventDescription", "location", "capacity", "date", "ask", "ticketPrice", "marketingBudget", "socialMediaAccount"];
    fields.forEach((f) => {
      const val = rawForm.elements[f]?.value;
      if (val !== undefined) form.append(f, val);
    });
    if (rawForm.elements.isIndoor) form.append("isIndoor", rawForm.elements.isIndoor.checked);
    if (rawForm.elements.thumbnail?.files?.[0]) {
      form.append("thumbnail", rawForm.elements.thumbnail.files[0]);
    }
    form.append("_v", Date.now());

    try {
      await createEvent(form);
      toast.success("Event created successfully");
      setModalMode(null);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setSubmitting(false);
  };

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchSearch = !search || evt.eventName?.toLowerCase().includes(search.toLowerCase()) || evt.location?.toLowerCase().includes(search.toLowerCase());
      const status = evt.status || (new Date(evt.date) < new Date() ? "completed" : "upcoming");
      const matchType = !filterType || status === filterType;
      return matchSearch && matchType;
    });
  }, [events, search, filterType]);

  const summary = {
    total: events.length,
    upcoming: events.filter((e) => (e.status || (new Date(e.date) >= new Date() ? "upcoming" : "")) === "upcoming").length,
    completed: events.filter((e) => (e.status || (new Date(e.date) < new Date() ? "completed" : "")) === "completed").length,
  };

  const quickHighlights = [
    `${summary.upcoming} active event${summary.upcoming === 1 ? "" : "s"}`,
    `${summary.total} total listing${summary.total === 1 ? "" : "s"}`,
    `${summary.completed} completed event${summary.completed === 1 ? "" : "s"}`,
  ];

  if (loading) return <div className="text-center py-20 muted">Loading dashboard data...</div>;

  return (
    <div className="space-y-6">
      <section className="hero-panel organizer-hero-panel">
        <div className="organizer-hero-orb organizer-hero-orb-left" />
        <div className="organizer-hero-orb organizer-hero-orb-right" />
        <div className="organizer-hero-grid relative z-10">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="organizer-hero-kicker">Organizer dashboard</div>
              <div className="space-y-3">
                <h1 className="organizer-hero-title">Welcome back, {user?.username || "Organizer"}</h1>
                <p className="organizer-hero-subtitle">
                  Manage listings, track active events, and keep your profile sponsor-ready.
                </p>
              </div>
            </div>

            <div className="organizer-hero-chip-row">
              {quickHighlights.map((item) => (
                <span key={item} className="organizer-hero-chip">
                  <CheckIcon />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="organizer-hero-actions">
            <button className="organizer-hero-create-btn" onClick={() => setModalMode("create")}>
              <span className="text-xl leading-none">+</span>
              Create event
            </button>
            <div className="organizer-hero-tip-card">
              <div className="organizer-hero-tip-label">Quick focus</div>
              <div className="organizer-hero-tip-text">
                Keep details updated so sponsors can quickly understand your event.
              </div>
            </div>
          </div>
        </div>

        <div className="organizer-stat-grid relative z-10">
          <StatCard
            label="Total listings"
            value={summary.total}
            hint="All events published"
            helper="All events currently listed."
            icon={<CalendarIcon />}
            tone="blue"
          />
          <StatCard
            label="Active events"
            value={summary.upcoming}
            hint="Currently open or upcoming"
            helper="Events sponsors are most likely to see first."
            icon={<SparkIcon />}
            tone="gold"
          />
          <StatCard
            label="Completed events"
            value={summary.completed}
            hint="Past events on record"
            helper="Shows your past event experience."
            icon={<TrophyIcon />}
            tone="emerald"
          />
        </div>
      </section>

      <section className="space-y-6">
        <div className="surface-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="section-kicker mb-2">Management board</div>
              <h2 className="section-title">Your events</h2>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search your events..."
                  className="input-field !pl-10 min-w-[320px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 muted">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </span>
              </div>
              <button className="btn-secondary" onClick={loadData}>Refresh board</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <div className="tab-row">
              {[ ["", "All"], ["upcoming", "Upcoming"], ["completed", "Completed"] ].map(([id, label]) => (
                <button key={id} className={cx("tab-pill", filterType === id && "active")} onClick={() => setFilterType(id)}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-up">
          {filteredEvents.map((evt) => (
            <EventCard
              key={evt._id}
              event={evt}
              onClick={() => navigate(`/organizer/event/${evt._id}`)}
            />
          ))}
        </div>

        {!filteredEvents.length && search && (
          <div className="surface-card text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-black mb-2">No events found matching "{search}"</h3>
            <p className="muted">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </section>

      {modalMode === "create" && (
        <EventForm
          categories={categories}
          cities={cities}
          onClose={() => setModalMode(null)}
          onSubmit={submitForm}
          submitting={submitting}
        />
      )}
    </div>
  );
}
