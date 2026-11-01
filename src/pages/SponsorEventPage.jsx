import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, CalendarDays, MapPin, MessageCircle, Sparkles, Star } from "lucide-react";
import CancelDealModal from "@/components/events/CancelDealModal";
import DealProgress from "@/components/events/DealProgress";
import { EventCover } from "@/components/events/EventCard";
import OfferHistory from "@/components/events/OfferHistory";
import OfferModal from "@/components/events/OfferModal";
import Button from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { Input, RatingSlider, Textarea } from "@/components/ui/Field";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Badge, Card, ErrorState, PageSpinner, StatusBadge } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import {
  acceptOfferAsSponsor,
  applyToEvent,
  cancelDealAsSponsor,
  confirmSponsorship,
  counterAsSponsor,
  getMyEventApplication,
  getMyEventFeedback,
  getSponsorEventById,
  getSponsorProfile,
  giveEventFeedback,
  startConversation,
  updateEventFeedback,
  withdrawApplication,
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

function ApplyModal({ open, ask, eventId, onClose, onDone }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      await applyToEvent(eventId, { amount: Number(form.get("amount")), message: form.get("message") });
      toast.success("Offer sent");
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setSubmitting(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Apply to sponsor" description="You can apply once to each event.">
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="space-y-4">
          <Input label="Your offer (₹)" name="amount" type="number" min="1" defaultValue={ask} hint={`The organizer is asking for ${rupees(ask)}.`} required />
          <Textarea label="Message to the organizer" name="message" optional maxLength={1000} rows={4} placeholder="What would your brand like to do at this event?" />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submitting}>Send offer</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function FeedbackModal({ existing, eventId, onClose, onDone }) {
  const [reputation, setReputation] = useState(existing?.organizerReputation ?? 0.7);
  const [lineup, setLineup] = useState(existing?.lineupQuality ?? 0.7);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const payload = { organizerReputation: reputation, lineupQuality: lineup };
    try {
      await (existing ? updateEventFeedback(eventId, payload) : giveEventFeedback(eventId, payload));
      toast.success("Thanks for your feedback");
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} size="sm" title="Rate this event" description="Your rating helps other sponsors and improves future predictions.">
      <ModalBody className="space-y-6">
        <RatingSlider label="How was the organizer?" value={reputation} onChange={setReputation} />
        <RatingSlider label="How good was the lineup?" value={lineup} onChange={setLineup} />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={submit}>{existing ? "Update feedback" : "Submit feedback"}</Button>
      </ModalFooter>
    </Modal>
  );
}

const CANCELLED_BY = { sponsor: "You", organizer: "The organizer" };

const cancelledNote = (application) => (
  application.cancelledBy === "system"
    ? application.cancelReason
    : `${CANCELLED_BY[application.cancelledBy]} cancelled this sponsorship: ${application.cancelReason}`
);

function DealCard({ detail, application, feedback, hasProfile, onApply, onAccept, onCounter, onWithdraw, onConfirm, onFeedback, onCancel }) {
  const eventDone = detail.status === "completed";
  const accepted = application?.status === "accepted";
  const open = ["pending", "negotiating"].includes(application?.status);
  const latest = application?.negotiations?.at(-1);
  const myTurn = open && !eventDone && latest?.from === "organizer";
  const bothConfirmed = Boolean(application?.sponsorConfirmedAt && application?.organizerConfirmedAt);
  const cancelled = application?.status === "cancelled";

  let action = null;
  if (!application && !eventDone) {
    action = hasProfile
      ? <Button className="w-full" onClick={onApply}>Apply to sponsor</Button>
      : <Button className="w-full" to="/brand">Create brand profile to apply</Button>;
  } else if (open && !eventDone) {
    action = (
      <div className="space-y-2">
        {myTurn ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onCounter}>Counter</Button>
            <Button onClick={onAccept}>Accept</Button>
          </div>
        ) : null}
        <Button variant="ghost" className="w-full" onClick={onWithdraw}>Withdraw offer</Button>
      </div>
    );
  } else if (accepted && eventDone && !application.sponsorConfirmedAt) {
    action = <Button className="w-full" onClick={onConfirm}>Confirm it happened</Button>;
  } else if (bothConfirmed) {
    action = (
      <Button className="w-full" variant={feedback ? "secondary" : "primary"} onClick={onFeedback}>
        <Star className="h-4 w-4" aria-hidden="true" />{feedback ? "Update feedback" : "Leave feedback"}
      </Button>
    );
  }

  let note = null;
  if (!application) note = eventDone ? "This event has finished." : `The organizer is asking for ${rupees(detail.ask)}.`;
  else if (myTurn) note = `The organizer countered with ${rupees(latest.amount)}. Accept it or reply with your own number.`;
  else if (open && !eventDone) note = `Your offer of ${rupees(latest.amount)} is with the organizer.`;
  else if (application.status === "rejected") note = "The organizer didn't accept this offer.";
  else if (application.status === "withdrawn") note = "You withdrew this offer.";
  else if (accepted && !eventDone) note = "Your sponsorship is agreed. You can confirm it after the event.";
  else if (cancelled) note = cancelledNote(application);
  else if (accepted && application.autoConfirmed) note = "Confirmed automatically after 7 days without a reply.";
  else if (accepted && application.sponsorConfirmedAt && !application.organizerConfirmedAt) note = "You confirmed. If the organizer doesn't reply within 7 days, it's confirmed automatically and feedback opens.";
  else if (accepted && application.organizerConfirmedAt && !application.sponsorConfirmedAt) note = "The organizer confirmed. If you don't reply within 7 days, it's confirmed automatically.";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Your sponsorship</h2>
        {application ? <StatusBadge status={application.status} /> : null}
      </div>
      {accepted ? <p className="mt-1 font-display text-2xl font-bold text-brand">{rupees(application.finalAmount)}</p> : null}
      {open ? <p className="mt-1 font-display text-2xl font-bold text-brand">{rupees(latest?.amount)}</p> : null}
      {cancelled ? null : (
        <div className="mt-4">
          <DealProgress application={application} eventDone={eventDone} hasFeedback={Boolean(feedback)} />
        </div>
      )}
      {note ? <p className="mt-4 text-sm text-ink-soft">{note}</p> : null}
      <OfferHistory negotiations={application?.negotiations} viewer="sponsor" className="mt-3" />
      {action ? <div className="mt-4">{action}</div> : null}
      {accepted && !bothConfirmed ? (
        <Button variant="ghost" className="mt-2 w-full" onClick={onCancel}>Cancel sponsorship</Button>
      ) : null}
    </Card>
  );
}

export default function SponsorEventPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [applying, setApplying] = useState(false);
  const [countering, setCountering] = useState(false);
  const [rating, setRating] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const event = useResource(() => getSponsorEventById(id).then((res) => res.data), [id]);
  const application = useResource(() => getMyEventApplication(id).then((res) => res.data), [id]);
  const feedback = useResource(() => getMyEventFeedback(id).then((res) => res.data).catch(() => null), [id]);
  const profile = useResource(() => getSponsorProfile().then((res) => res.data));

  if (event.loading) return <PageSpinner label="Loading event…" />;
  if (event.error) return <Card><ErrorState error={event.error} onRetry={event.reload} /></Card>;

  const detail = event.data;
  const upcoming = detail.status === "upcoming";
  const socialReach = (detail.socialMediaAccount || []).reduce((sum, item) => sum + (item.followers || 0), 0);

  const handleCounter = async (offer) => {
    try {
      await counterAsSponsor(id, offer);
      toast.success("Counter-offer sent");
      setCountering(false);
      application.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleAccept = async () => {
    const amount = application.data?.negotiations?.at(-1)?.amount;
    const yes = await confirm({
      title: `Accept ${rupees(amount)}?`,
      message: "This agrees the sponsorship at this amount.",
      confirmLabel: "Accept offer",
    });
    if (!yes) return;
    try {
      await acceptOfferAsSponsor(id);
      toast.success("Deal agreed");
      application.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openChat = async () => {
    try {
      const conversation = await startConversation({ eventId: id, sponsorId: user._id, organizerId: detail.organizer });
      navigate(`/messages/${conversation._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleWithdraw = async () => {
    const yes = await confirm({
      title: "Withdraw your offer?",
      message: "You won't be able to apply to this event again.",
      confirmLabel: "Withdraw offer",
      danger: true,
    });
    if (!yes) return;
    try {
      await withdrawApplication(id);
      toast.success("Offer withdrawn");
      application.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleConfirm = async () => {
    const yes = await confirm({
      title: "Did this sponsorship happen?",
      message: "Confirm only if the event took place and your sponsorship went ahead.",
      confirmLabel: "Yes, it happened",
      cancelLabel: "Not yet",
    });
    if (!yes) return;
    try {
      await confirmSponsorship(id);
      toast.success("Sponsorship confirmed");
      application.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCancel = async (reason) => {
    try {
      await cancelDealAsSponsor(id, reason);
      toast.success("Sponsorship cancelled");
      setCancelling(false);
      application.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />Discover
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <EventCover event={detail} className="h-44 w-full sm:h-64" />
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.status} />
              <Badge>{titleCase(detail.eventCategory?.name)}</Badge>
              {detail.isFestive ? <Badge tone="accent">Festival season</Badge> : null}
              <Badge>{detail.isIndoor ? "Indoor" : "Outdoor"}</Badge>
            </div>
            <h1 className="mt-2 text-3xl font-bold">{detail.eventName}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-ink-soft">
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{detail.location}</span>
              <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />{fmtDate(detail.date)}</span>
            </div>
            <p className="mt-4 whitespace-pre-line text-ink-soft">{detail.eventDescription}</p>

            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 xl:grid-cols-4">
              <Fact label="Sponsorship ask" value={rupees(detail.ask)} />
              <Fact label="Capacity" value={fmtINR(detail.capacity)} />
              <Fact label="Ticket price" value={detail.ticketPrice ? rupees(detail.ticketPrice) : "Free"} />
              <Fact label="Social reach" value={fmtINR(socialReach)} />
            </dl>

            <div className="mt-5 border-t border-line pt-5">
              <h2 className="text-lg font-semibold">About the organizer</h2>
              <p className="mt-1 text-ink-soft">
                {detail.organizerInfo?.username || "Organizer"} has run {detail.pastEventOrganized || 0} past event{detail.pastEventOrganized === 1 ? "" : "s"}
                {detail.totalFeedbacks
                  ? `, with a ${Math.round(detail.avgOrganizerReputation * 100)}% rating from ${detail.totalFeedbacks} sponsor${detail.totalFeedbacks === 1 ? "" : "s"}.`
                  : ". No sponsor ratings yet."}
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-8">
          <DealCard
            detail={detail}
            application={application.data}
            feedback={feedback.data}
            hasProfile={Boolean(profile.data)}
            onApply={() => setApplying(true)}
            onAccept={handleAccept}
            onCounter={() => setCountering(true)}
            onWithdraw={handleWithdraw}
            onConfirm={handleConfirm}
            onFeedback={() => setRating(true)}
            onCancel={() => setCancelling(true)}
          />

          {upcoming ? (
            <Card surface="border-brand-strong bg-brand-strong" className="p-5">
              <h2 className="text-lg font-semibold text-white">Is this event right for you?</h2>
              <p className="mt-1 text-sm text-white/75">Get expected turnout, brand fit and the chance of a deal.</p>
              {profile.data ? (
                <Button variant="accent" className="mt-4 w-full" to={`/sponsor/analysis/${id}`}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />Run AI analysis
                </Button>
              ) : <Button variant="accent" className="mt-4 w-full" to="/brand">Create brand profile first</Button>}
            </Card>
          ) : null}

          <Button variant="secondary" className="w-full" onClick={openChat}>
            <MessageCircle className="h-4 w-4" aria-hidden="true" />Message organizer
          </Button>
        </div>
      </div>

      <ApplyModal
        open={applying}
        ask={detail.ask}
        eventId={id}
        onClose={() => setApplying(false)}
        onDone={() => {
          setApplying(false);
          application.reload();
        }}
      />

      {rating ? (
        <FeedbackModal
          existing={feedback.data}
          eventId={id}
          onClose={() => setRating(false)}
          onDone={() => {
            setRating(false);
            feedback.reload();
          }}
        />
      ) : null}

      <OfferModal
        open={countering}
        currentAmount={application.data?.negotiations?.at(-1)?.amount}
        onClose={() => setCountering(false)}
        onSubmit={handleCounter}
      />

      <CancelDealModal open={cancelling} onClose={() => setCancelling(false)} onSubmit={handleCancel} />
    </>
  );
}
