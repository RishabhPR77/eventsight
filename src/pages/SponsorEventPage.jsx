import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getSponsorEventById,
  getMyEventFeedback,
  getSponsorCompletedEvents,
  getEventPrediction,
  getSponsorProfile,
  giveEventFeedback,
  updateEventFeedback,
  applyToEvent,
  getMyEventApplication,
  withdrawApplication,
  confirmSponsorship,
} from "@/lib/api";
import { APPLICATION_STATUS_CLASS, fmtINR, getErrorMessage, coldEmailToText, resolveMediaUrl } from "@/lib/utils";
import ResultsPanel from "@/components/results/ResultsPanel";
import ChatBox from "@/components/ChatBox";
import { useAuth } from "@/context/AuthContext";

const cx = (...xs) => xs.filter(Boolean).join(" ");
const STATUS_CLASS = {
  upcoming: "status-chip status-upcoming",
  completed: "status-chip status-completed",
  cancelled: "status-chip status-cancelled",
};

function Metric({ label, value }) {
  return (
    <div className="soft-card">
      <div className="field-label">{label}</div>
      <div className="text-3xl font-black">{value ?? "—"}</div>
    </div>
  );
}



function FeedbackForm({ initial, onSubmit, submitting, submitLabel }) {
  const values = initial || {
    organizerReputation: 0.5,
    lineupQuality: 0.5,
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {[
        ["organizerReputation", "Organizer reputation"],
        ["lineupQuality", "Lineup quality"],
      ].map(([key, label]) => (
        <div key={key}>
          <div className="field-label">{label}</div>
          <input
            type="range"
            name={key}
            min="0"
            max="1"
            step="0.01"
            defaultValue={values[key]}
            className="w-full accent-[var(--accent)]"
          />
        </div>
      ))}

      <button className="btn-primary" disabled={submitting}>
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function ApplyForm({ ask, onSubmit, onClose, submitting }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card animate-fade-up">
        <div className="modal-header">
          <div>
            <h3 className="text-3xl font-black">Apply for sponsorship</h3>
            <p className="muted mt-1">You can apply once. The organizer will accept or reject your offer.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="field-label">Offered amount (₹)</label>
            <input name="amount" type="number" min="1" defaultValue={ask || ""} required className="input-field" />
          </div>

          <div>
            <label className="field-label">Message to organizer (optional)</label>
            <textarea name="message" rows={4} maxLength={1000} className="textarea-field" placeholder="What would your brand want from this sponsorship?" />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Submitting..." : "Submit application"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SponsorEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eventDetail, setEventDetail] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myFeedback, setMyFeedback] = useState(null);
  const [tab, setTab] = useState("overview");
  const [predicting, setPredicting] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [organizerQualityMetrics, setOrganizerQualityMetrics] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [application, setApplication] = useState(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applying, setApplying] = useState(false);

  const DEFAULT_RATINGS = { organizerReputation: 0.5, lineupQuality: 0.55, activationMaturity: 0.5 };

  const computeOrganizerMetrics = (completedEvts) => {
    const withFeedback = completedEvts.filter((e) => (e.totalFeedbacks || 0) > 0);
    if (withFeedback.length === 0) return null;
    let sumRep = 0, sumLineup = 0, totalCount = 0;
    withFeedback.forEach((e) => {
      const n = e.totalFeedbacks || 0;
      sumRep        += (e.avgOrganizerReputation || DEFAULT_RATINGS.organizerReputation) * (n + 1) - DEFAULT_RATINGS.organizerReputation;
      sumLineup     += (e.avgLineupQuality || DEFAULT_RATINGS.lineupQuality) * (n + 1) - DEFAULT_RATINGS.lineupQuality;
      totalCount    += n;
    });
    const divisor = totalCount + 1;
    const r = (v) => parseFloat(v.toFixed(4));
    return {
      avgOrganizerReputation: r((sumRep + DEFAULT_RATINGS.organizerReputation) / divisor),
      avgLineupQuality:       r((sumLineup + DEFAULT_RATINGS.lineupQuality) / divisor),
      totalFeedbacks:         totalCount,
    };
  };

  const loadData = async () => {
    setWorkspaceLoading(true);
    try {
      const [profRes] = await Promise.all([getSponsorProfile()]);
      setProfile(profRes?.data || profRes);

      let detail;
      try {
        const detailRes = await getSponsorEventById(id);
        detail = detailRes?.data || detailRes;
      } catch (e) {
        // Fallback: search in completed events list if direct fetch fails
        const compRes = await getSponsorCompletedEvents({ page: 1, limit: 100 });
        const allComp = compRes?.data?.events || compRes?.data || [];
        detail = allComp.find(it => it._id === id);
        if (!detail) throw e;
      }
      
      setEventDetail(detail);

      const isUpcomingEvent = detail?.status === "upcoming" || new Date(detail?.date) >= new Date();
      if (isUpcomingEvent) {
        try {
          const completedRes = await getSponsorCompletedEvents({ page: 1, limit: 100 });
          const payload = completedRes?.data || completedRes;
          const allCompleted = payload?.events || payload?.data?.events || [];
          const organizerId = detail?.organizer || detail?.organizerInfo?._id;
          const orgCompleted = organizerId
            ? allCompleted.filter((e) => {
                const eOrg = e.organizer || e.organizerInfo?._id;
                return String(eOrg) === String(organizerId);
              })
            : allCompleted;
          setOrganizerQualityMetrics(computeOrganizerMetrics(orgCompleted));
        } catch {}
      }

      try {
        const fbRes = await getMyEventFeedback(id);
        setMyFeedback(fbRes?.data || fbRes);
      } catch {
        setMyFeedback(null);
      }

      try {
        const appRes = await getMyEventApplication(id);
        setApplication(appRes?.data || null);
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      navigate(-1);
    }
    setWorkspaceLoading(false);
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const handlePredict = async () => {
    setTab("prediction");
    setPredicting(true);
    try {
      const res = await getEventPrediction(id);
      setPrediction(res?.data || res);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setPredicting(false);
  };

  const handleSubmitFeedback = async (e, isUpdate = false) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      organizerReputation: Number(form.get("organizerReputation") || 0.5),
      lineupQuality: Number(form.get("lineupQuality") || 0.5),
    };
    try {
      if (isUpdate) await updateEventFeedback(id, payload);
      else await giveEventFeedback(id, payload);
      const fbRes = await getMyEventFeedback(id);
      setMyFeedback(fbRes?.data || fbRes);
      toast.success(isUpdate ? "Feedback updated" : "Feedback submitted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setSubmittingFeedback(false);
  };

  const handleWithdraw = async () => {
    if (!window.confirm("Withdraw this application? You can't apply to this event again.")) return;
    try {
      const res = await withdrawApplication(id);
      setApplication(res?.data || null);
      toast.success("Application withdrawn");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleConfirm = async () => {
    if (!window.confirm("Confirm that this sponsorship really happened?")) return;
    try {
      const res = await confirmSponsorship(id);
      setApplication(res?.data || null);
      toast.success("Sponsorship confirmed");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await applyToEvent(id, {
        amount: Number(form.get("amount")),
        message: form.get("message"),
      });
      setApplication(res?.data || null);
      setShowApplyForm(false);
      toast.success("Application submitted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setApplying(false);
  };

  if (workspaceLoading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="muted">Loading event details...</p>
      </div>
    );
  }

  if (!eventDetail) return null;

  const canApply = eventDetail.status === "upcoming";
  const canConfirm = application?.status === "accepted" && eventDetail.status === "completed" && !application.sponsorConfirmedAt;
  const feedbackOpen = Boolean(application?.sponsorConfirmedAt && application?.organizerConfirmedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
         <button onClick={() => navigate(-1)} className="btn-secondary !py-2 !px-4">← Back to dashboard</button>
      </div>

      <section className="workspace-panel space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-5 min-w-0">
            <img
              src={resolveMediaUrl(eventDetail.thumbnail) || "https://placehold.co/360x240?text=Event"}
              alt={eventDetail.eventName}
              className="w-44 h-32 rounded-3xl object-cover flex-shrink-0"
            />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h3 className="text-5xl font-black leading-none">{eventDetail.eventName}</h3>
                <span
                  className={
                    STATUS_CLASS[
                      eventDetail.status ||
                        (new Date(eventDetail.date) < new Date() ? "completed" : "upcoming")
                    ] || STATUS_CLASS.upcoming
                  }
                >
                  {eventDetail.status ||
                    (new Date(eventDetail.date) < new Date() ? "completed" : "upcoming")}
                </span>
              </div>

              <p className="section-subtitle text-lg leading-8 max-w-3xl">
                {eventDetail.eventDescription}
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="info-chip">
                  {eventDetail.eventCategory?.name || "Event"}
                </span>
                <span className="info-chip">{eventDetail.location}</span>
                <span className="info-chip">
                  {new Date(eventDetail.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="info-chip">{eventDetail.isIndoor ? "Indoor" : "Outdoor"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {application ? (
              <span className={APPLICATION_STATUS_CLASS[application.status] || APPLICATION_STATUS_CLASS.pending}>
                Application {application.status}
                {application.status === "accepted" ? ` · ₹${fmtINR(application.finalAmount)}` : ""}
              </span>
            ) : canApply ? (
              <button className="btn-primary" onClick={() => setShowApplyForm(true)}>Apply for sponsorship</button>
            ) : null}
            {application?.status === "pending" ? (
              <button className="btn-secondary" onClick={handleWithdraw}>Withdraw</button>
            ) : null}
            {canConfirm ? (
              <button className="btn-primary" onClick={handleConfirm}>Confirm sponsorship happened</button>
            ) : null}
            <button className="btn-secondary" onClick={() => setShowChat(true)}>Chat with organizer</button>
          </div>
        </div>

        <div className="tab-row mt-6">
          {["overview", "prediction", "feedback"].map((t) => (
            <button
              key={t}
              className={cx("tab-pill", tab === t && "active")}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid xl:grid-cols-[1fr_auto] gap-6 items-start animate-fade-up">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Metric label="Ask" value={`₹${fmtINR(eventDetail.ask)}`} />
              <Metric label="Ticket price" value={`₹${fmtINR(eventDetail.ticketPrice)}`} />
              <Metric label="Capacity" value={eventDetail.capacity} />
              <Metric label="Marketing budget" value={`₹${fmtINR(eventDetail.marketingBudget)}`} />
            </div>

            <div className="surface-card min-w-[320px]">
              <div className="field-label">Quality metrics</div>
              <div className="grid gap-4 mt-4">
                {[
                  ["Organizer reputation", organizerQualityMetrics?.avgOrganizerReputation || eventDetail.avgOrganizerReputation || 0.5],
                  ["Lineup quality", organizerQualityMetrics?.avgLineupQuality || eventDetail.avgLineupQuality || 0.5],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="muted uppercase tracking-wider">{label}</span>
                      <span>{Number(val).toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--bg-soft)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)]"
                        style={{ width: `${Math.min(100, val * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="faint text-[10px] mt-6 uppercase tracking-wider font-extrabold">
                {organizerQualityMetrics ? "Historical signal verified" : "Limited feedback data"}
              </div>
            </div>
          </div>
        )}

        {tab === "prediction" && (
          <div className="animate-fade-up min-h-[400px]">
             <div className="surface-card text-center py-24">
                <div className="text-6xl mb-6">🤖</div>
                <h3 className="text-3xl font-black mb-3">AI Event Analysis</h3>
                <p className="muted mb-10 max-w-md mx-auto leading-7">Use our AI engine to calculate ROI probability, brand-fit score, and generated automated outreach drafts.</p>
                <button className="btn-primary !px-10 !py-4" onClick={() => navigate(`/sponsor/analysis/${id}`)}>
                  Run AI prediction →
                </button>
              </div>
          </div>
        )}

        {tab === "feedback" && (
          <div className="max-w-2xl animate-fade-up">
            <h4 className="text-2xl font-black mb-2">Post-event feedback</h4>
            {feedbackOpen ? (
              <>
                <p className="muted mb-8 leading-7">Help the community by rating the organizer’s actual performance. This data improves future predictions.</p>
                <FeedbackForm
                  initial={myFeedback}
                  onSubmit={(e) => handleSubmitFeedback(e, !!myFeedback)}
                  submitting={submittingFeedback}
                  submitLabel={myFeedback ? "Update feedback" : "Submit feedback"}
                />
              </>
            ) : (
              <p className="muted leading-7">
                Feedback opens after the event, once your sponsorship was accepted and both you and the organizer confirm it happened.
              </p>
            )}
          </div>
        )}
      </section>

      {showApplyForm && (
        <ApplyForm
          ask={eventDetail.ask}
          onSubmit={handleApply}
          onClose={() => setShowApplyForm(false)}
          submitting={applying}
        />
      )}

      {showChat && (
        <ChatBox
          eventId={id}
          sponsorId={user?._id}
          organizerId={eventDetail.organizer?._id || eventDetail.organizer}
          currentUserRole="sponsor"
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
