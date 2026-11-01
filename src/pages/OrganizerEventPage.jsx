import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, CalendarDays, Check, Inbox, MapPin, MessageCircle, MessagesSquare, Pencil, Repeat2, Trash2, X } from "lucide-react";
import CancelDealModal from "@/components/events/CancelDealModal";
import { EventCover } from "@/components/events/EventCard";
import EventForm from "@/components/events/EventForm";
import OfferHistory from "@/components/events/OfferHistory";
import OfferModal from "@/components/events/OfferModal";
import Button from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { RatingSlider } from "@/components/ui/Field";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Avatar, Badge, Card, EmptyState, ErrorState, PageSpinner, StatusBadge, Tabs } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import {
  cancelDealAsOrganizer,
  confirmSponsorshipAsOrganizer,
  counterAsOrganizer,
  deleteEvent,
  getEventApplications,
  getEventConversations,
  getOrganizerEventById,
  startConversation,
  updateApplicationStatus,
} from "@/lib/api";
import { fmtDate, fmtINR, getErrorMessage, rupees, titleCase } from "@/lib/utils";

function Fact({ label, value }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="mt-0.5 font-display text-xl font-bold">{value}</dd>
    </div>
  );
}

function ConfirmDealModal({ application, eventId, onClose, onDone }) {
  const [rating, setRating] = useState(0.7);
  const [saving, setSaving] = useState(false);
  const brand = application?.brand?.brandName || application?.sponsor?.username || "this sponsor";

  const submit = async () => {
    setSaving(true);
    try {
      await confirmSponsorshipAsOrganizer(eventId, application._id, rating);
      toast.success("Sponsorship confirmed");
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setSaving(false);
  };

  return (
    <Modal open={Boolean(application)} onClose={onClose} size="sm" title="Confirm sponsorship" description={`Did the sponsorship with ${brand} really happen?`}>
      <ModalBody>
        <RatingSlider
          label="How well did the brand show up?"
          hint="Think about their stall, branding and team at the event. This helps with their future predictions."
          value={rating}
          onChange={setRating}
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Not yet</Button>
        <Button loading={saving} onClick={submit}>Yes, it happened</Button>
      </ModalFooter>
    </Modal>
  );
}

const CANCELLED_BY = { organizer: "You", sponsor: "The sponsor" };

const cancelledNote = (application) => (
  application.cancelledBy === "system"
    ? application.cancelReason
    : `${CANCELLED_BY[application.cancelledBy]} cancelled this sponsorship: ${application.cancelReason}`
);

const confirmationNote = (application) => {
  if (application.autoConfirmed) return "Confirmed automatically after 7 days without a reply.";
  if (application.organizerConfirmedAt && application.sponsorConfirmedAt) return "Confirmed by both sides.";
  if (application.organizerConfirmedAt) return "You confirmed. If the sponsor doesn't reply within 7 days, it's confirmed automatically.";
  if (application.sponsorConfirmedAt) return "The sponsor confirmed. If you don't reply within 7 days, it's confirmed automatically.";
  return "Waiting for both sides to confirm.";
};

function ApplicationRow({ application, eventDone, deciding, onDecide, onCounter, onConfirm, onCancel, onChat }) {
  const offer = application.negotiations?.at(-1);
  const open = ["pending", "negotiating"].includes(application.status) && !eventDone;
  const myTurn = open && offer?.from === "sponsor";
  const name = application.brand?.brandName || application.sponsor?.username || "Sponsor";
  const bothConfirmed = application.organizerConfirmedAt && application.sponsorConfirmedAt;

  return (
    <li className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar name={name} src={application.brand?.logo} className="h-11 w-11" />
        <div className="min-w-0 flex-1 basis-48">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{name}</h3>
            <StatusBadge status={application.status} />
          </div>
          <p className="mt-0.5 font-display text-lg font-bold text-brand">
            {rupees(application.status === "accepted" ? application.finalAmount : offer?.amount)}
          </p>
          {application.brand?.brandType?.name ? <p className="text-sm text-ink-faint">{titleCase(application.brand.brandType.name)}</p> : null}
          {open && !myTurn ? <p className="text-sm text-ink-soft">You countered. Waiting for the sponsor.</p> : null}
          {offer?.message ? <p className="mt-2 rounded-xl bg-paper p-3 text-sm text-ink-soft">{offer.message}</p> : null}
          <OfferHistory negotiations={application.negotiations} viewer="organizer" className="mt-2" />
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          {application.status !== "withdrawn" ? (
            <Button variant="ghost" size="sm" onClick={() => onChat(application.sponsor?._id)}>
              <MessageCircle className="h-4 w-4" aria-hidden="true" />Message
            </Button>
          ) : null}
          {open ? (
            <Button variant="danger-soft" size="sm" disabled={deciding} onClick={() => onDecide(application, "rejected")}>
              <X className="h-4 w-4" aria-hidden="true" />Reject
            </Button>
          ) : null}
          {myTurn ? (
            <>
              <Button variant="secondary" size="sm" disabled={deciding} onClick={() => onCounter(application)}>
                <Repeat2 className="h-4 w-4" aria-hidden="true" />Counter
              </Button>
              <Button size="sm" disabled={deciding} onClick={() => onDecide(application, "accepted")}>
                <Check className="h-4 w-4" aria-hidden="true" />Accept
              </Button>
            </>
          ) : null}
          {application.status === "accepted" && eventDone && !application.organizerConfirmedAt ? (
            <Button size="sm" onClick={() => onConfirm(application)}>Confirm sponsorship</Button>
          ) : null}
          {application.status === "accepted" && !bothConfirmed ? (
            <Button variant="danger-soft" size="sm" onClick={() => onCancel(application)}>Cancel deal</Button>
          ) : null}
        </div>
      </div>
      {application.status === "accepted" && eventDone ? (
        <p className="mt-3 text-sm text-ink-soft sm:pl-14">{confirmationNote(application)}</p>
      ) : null}
      {application.status === "cancelled" ? (
        <p className="mt-3 text-sm text-ink-soft sm:pl-14">{cancelledNote(application)}</p>
      ) : null}
    </li>
  );
}

export default function OrganizerEventPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [tab, setTab] = useState("offers");
  const [editing, setEditing] = useState(false);
  const [decidingId, setDecidingId] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [countering, setCountering] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const event = useResource(() => getOrganizerEventById(id).then((res) => res.data), [id]);
  const applications = useResource(() => getEventApplications(id).then((res) => res.data), [id]);
  const conversations = useResource(() => getEventConversations(id), [id]);

  if (event.loading) return <PageSpinner label="Loading event…" />;
  if (event.error) return <Card><ErrorState error={event.error} onRetry={event.reload} /></Card>;

  const detail = event.data;
  const eventDone = detail.status === "completed";
  const offers = applications.data || [];
  const inbox = conversations.data || [];
  const hasAccepted = offers.some((item) => item.status === "accepted");

  const handleDecide = async (application, status) => {
    const accepting = status === "accepted";
    const brand = application.brand?.brandName || "this sponsor";
    const yes = await confirm({
      title: accepting ? `Accept ${brand}?` : `Reject ${brand}?`,
      message: accepting
        ? "This locks the event's date and city, because the sponsor agreed to them. You can't undo this."
        : "They'll see this offer was rejected. You can't undo this.",
      confirmLabel: accepting ? "Accept offer" : "Reject offer",
      danger: !accepting,
    });
    if (!yes) return;

    setDecidingId(application._id);
    try {
      await updateApplicationStatus(id, application._id, status);
      toast.success(accepting ? "Offer accepted" : "Offer rejected");
      applications.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setDecidingId(null);
  };

  const handleCounter = async (offer) => {
    try {
      await counterAsOrganizer(id, countering._id, offer);
      toast.success("Counter-offer sent");
      setCountering(null);
      applications.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCancel = async (reason) => {
    try {
      await cancelDealAsOrganizer(id, cancelling._id, reason);
      toast.success("Sponsorship cancelled");
      setCancelling(null);
      applications.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openChat = async (sponsorId) => {
    try {
      const conversation = await startConversation({ eventId: id, sponsorId, organizerId: user._id });
      navigate(`/messages/${conversation._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    const yes = await confirm({
      title: "Delete this event?",
      message: "Sponsors won't be able to see it, and pending offers will be rejected.",
      confirmLabel: "Delete event",
      danger: true,
    });
    if (!yes) return;
    try {
      await deleteEvent(id);
      toast.success("Event deleted");
      navigate("/");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const socialReach = (detail.socialMediaAccount || []).reduce((sum, item) => sum + (item.followers || 0), 0);

  return (
    <>
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />Dashboard
      </Link>

      <Card className="overflow-hidden">
        <EventCover event={detail} className="h-40 w-full sm:h-56" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={detail.status} />
                <Badge>{titleCase(detail.eventCategory?.name)}</Badge>
              </div>
              <h1 className="mt-2 text-3xl font-bold">{detail.eventName}</h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-ink-soft">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{detail.location}</span>
                <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />{fmtDate(detail.date)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {!eventDone ? (
                <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
              ) : null}
              {!hasAccepted ? (
                <Button variant="danger-soft" aria-label="Delete event" onClick={handleDelete}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
              ) : null}
            </div>
          </div>

          <p className="mt-4 max-w-3xl whitespace-pre-line text-ink-soft">{detail.eventDescription}</p>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 md:grid-cols-4">
            <Fact label="Sponsorship ask" value={rupees(detail.ask)} />
            <Fact label="Capacity" value={fmtINR(detail.capacity)} />
            <Fact label="Ticket price" value={detail.ticketPrice ? rupees(detail.ticketPrice) : "Free"} />
            <Fact label="Social reach" value={fmtINR(socialReach)} />
          </dl>
        </div>
      </Card>

      <section className="mt-6">
        <Tabs
          className="mb-4"
          label="Event sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "offers", label: "Offers", count: offers.length },
            { id: "messages", label: "Messages", count: inbox.length },
          ]}
        />

        {tab === "offers" ? (
          <Card>
            {applications.error ? <ErrorState error={applications.error} onRetry={applications.reload} /> : null}
            {!applications.error && offers.length === 0 ? (
              <EmptyState icon={Inbox} title={applications.loading ? "Loading offers…" : "No offers yet"} description={applications.loading ? null : "When a sponsor applies to this event, you'll see it here."} />
            ) : null}
            {offers.length > 0 ? (
              <ul className="divide-y divide-line">
                {offers.map((application) => (
                  <ApplicationRow
                    key={application._id}
                    application={application}
                    eventDone={eventDone}
                    deciding={decidingId === application._id}
                    onDecide={handleDecide}
                    onCounter={setCountering}
                    onConfirm={setConfirming}
                    onCancel={setCancelling}
                    onChat={openChat}
                  />
                ))}
              </ul>
            ) : null}
          </Card>
        ) : null}

        {tab === "messages" ? (
          <Card>
            {inbox.length === 0 ? (
              <EmptyState icon={MessagesSquare} title="No messages yet" description="When a sponsor messages you about this event, it'll appear here." />
            ) : (
              <ul className="divide-y divide-line">
                {inbox.map((conversation) => (
                  <li key={conversation._id}>
                    <Link to={`/messages/${conversation._id}`} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-paper">
                      <Avatar name={conversation.sponsorId?.username} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{conversation.sponsorId?.username || "Deleted user"}</span>
                        <span className="block truncate text-sm text-ink-soft">{conversation.lastMessage || "No messages yet"}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}
      </section>

      <EventForm
        open={editing}
        event={detail}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          event.reload();
        }}
      />

      <ConfirmDealModal
        application={confirming}
        eventId={id}
        onClose={() => setConfirming(null)}
        onDone={() => {
          setConfirming(null);
          applications.reload();
        }}
      />

      <OfferModal
        open={Boolean(countering)}
        currentAmount={countering?.negotiations?.at(-1)?.amount}
        onClose={() => setCountering(null)}
        onSubmit={handleCounter}
      />

      <CancelDealModal open={Boolean(cancelling)} onClose={() => setCancelling(null)} onSubmit={handleCancel} />
    </>
  );
}
