import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { Input, Select, Textarea, Toggle } from "@/components/ui/Field";
import ImageField from "@/components/ui/ImageField";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import { createEvent, fetchCities, fetchEventCategories, updateEvent } from "@/lib/api";
import { useResource } from "@/hooks/useResource";
import { getErrorMessage, titleCase } from "@/lib/utils";

const PLATFORMS = ["instagram", "youtube", "twitter", "facebook", "linkedin", "other"];

function SocialRows({ rows, setRows }) {
  const update = (id, patch) => setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold">Social media</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRows((prev) => [...prev, { id: crypto.randomUUID(), platform: "instagram", link: "", followers: "" }])}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />Add account
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[130px_1fr_110px_auto]">
            <select aria-label="Platform" value={row.platform} onChange={(e) => update(row.id, { platform: e.target.value })} className="field-control col-span-1 capitalize">
              {PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
            </select>
            <input aria-label="Profile link" value={row.link} onChange={(e) => update(row.id, { link: e.target.value })} placeholder="Profile link" className="field-control col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto" />
            <input aria-label="Followers" type="number" min="0" value={row.followers} onChange={(e) => update(row.id, { followers: e.target.value })} placeholder="Followers" className="field-control col-span-2 row-start-3 sm:col-span-1 sm:row-start-auto" />
            <button
              type="button"
              aria-label="Remove account"
              onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}
              className="col-start-2 row-start-1 flex h-11 w-11 items-center justify-center rounded-xl text-ink-faint hover:bg-bad-soft hover:text-bad sm:col-start-auto sm:row-start-auto"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const toRows = (accounts = []) => accounts.map((item) => ({ ...item, id: crypto.randomUUID() }));

function EventFormBody({ event, onClose, onSaved }) {
  const { data } = useResource(() => Promise.all([fetchEventCategories(), fetchCities()]));
  const [categories, cities] = data || [[], []];
  const [rows, setRows] = useState(() => toRows(event?.socialMediaAccount));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const raw = new FormData(e.currentTarget);
    const form = new FormData();
    ["eventName", "eventCategory", "eventDescription", "location", "date", "capacity", "ask", "ticketPrice", "marketingBudget"]
      .forEach((key) => form.append(key, raw.get(key)));
    form.append("isIndoor", raw.get("isIndoor") === "on");
    form.append("isFestive", raw.get("isFestive") === "on");
    form.append("socialMediaAccount", JSON.stringify(
      rows.filter((row) => row.link.trim()).map(({ platform, link, followers }) => ({ platform, link: link.trim(), followers: Number(followers) || 0 }))
    ));
    const thumbnail = raw.get("thumbnail");
    if (thumbnail?.size) form.append("thumbnail", thumbnail);

    try {
      const res = await (event ? updateEvent(event._id, form) : createEvent(form));
      toast.success(event ? "Event updated" : "Event published");
      onSaved(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  // Native selects need their options before defaultValue can apply
  const selectsReady = Boolean(data);

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <ModalBody className="space-y-4">
        <ImageField name="thumbnail" label="Cover image" current={event?.thumbnail} />
        <Input label="Event name" name="eventName" defaultValue={event?.eventName} placeholder="Indore Food Festival" required />
        <Textarea label="Description" name="eventDescription" defaultValue={event?.eventDescription} placeholder="What's the event, who comes, and what can a sponsor do there?" rows={3} required />

        {selectsReady ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" name="eventCategory" defaultValue={event?.eventCategory?._id || ""} required>
              <option value="" disabled>{categories.length ? "Choose a category" : "No categories yet"}</option>
              {categories.map((item) => <option key={item._id} value={item._id}>{titleCase(item.name)}</option>)}
            </Select>
            <Select label="City" name="location" defaultValue={event?.location || ""} required>
              <option value="" disabled>{cities.length ? "Choose a city" : "No cities yet"}</option>
              {cities.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}
            </Select>
          </div>
        ) : <div className="h-[74px] animate-pulse rounded-xl bg-sand" />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Date" name="date" type="date" defaultValue={event?.date ? event.date.slice(0, 10) : ""} min={new Date().toISOString().slice(0, 10)} required />
          <Input label="Capacity" name="capacity" type="number" min="1" defaultValue={event?.capacity} hint="How many people the venue holds" required />
          <Input label="Sponsorship ask (₹)" name="ask" type="number" min="1" defaultValue={event?.ask} required />
          <Input label="Ticket price (₹)" name="ticketPrice" type="number" min="0" defaultValue={event?.ticketPrice ?? 0} hint="Use 0 for a free event" required />
          <Input label="Marketing budget (₹)" name="marketingBudget" type="number" min="0" defaultValue={event?.marketingBudget ?? 0} className="sm:col-span-2" required />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle name="isIndoor" label="Indoor event" defaultChecked={Boolean(event?.isIndoor)} />
          <Toggle name="isFestive" label="During a festival" defaultChecked={Boolean(event?.isFestive)} />
        </div>

        <SocialRows rows={rows} setRows={setRows} />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={submitting}>{event ? "Save changes" : "Publish event"}</Button>
      </ModalFooter>
    </form>
  );
}

export default function EventForm({ open, event, onClose, onSaved }) {
  return (
    <Modal open={open} onClose={onClose} size="lg" title={event ? "Edit event" : "Create an event"} description={event ? null : "Sponsors will see this once you publish."}>
      {open ? <EventFormBody event={event} onClose={onClose} onSaved={onSaved} /> : null}
    </Modal>
  );
}
