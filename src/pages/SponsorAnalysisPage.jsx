import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import ResultsPanel from "@/components/results/ResultsPanel";
import Button from "@/components/ui/Button";
import { Card, ErrorState } from "@/components/ui/Primitives";
import { useResource } from "@/hooks/useResource";
import { getEventPrediction, getSponsorEventById, getSponsorProfile } from "@/lib/api";

function Analyzing() {
  return (
    <Card className="flex flex-col items-center px-6 py-20 text-center">
      <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-marigold-soft text-marigold-strong">
        <Sparkles className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 role="status" className="mt-4 text-xl font-semibold">Analyzing this event for your brand</h2>
      <p className="mt-1 text-ink-soft">This usually takes a few seconds.</p>
    </Card>
  );
}

export default function SponsorAnalysisPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useResource(
    () => Promise.all([getSponsorEventById(id), getSponsorProfile(), getEventPrediction(id)]).then(([event, profile, prediction]) => ({
      event: event.data,
      profile: profile.data,
      prediction: prediction.data,
    })),
    [id]
  );

  return (
    <>
      <Link to={`/sponsor/event/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to event
      </Link>

      {data ? <h1 className="mb-4 text-3xl font-bold">{data.event.eventName}</h1> : null}
      {loading ? <Analyzing /> : null}
      {error ? <Card><ErrorState error={error} onRetry={reload} /></Card> : null}
      {data ? (
        <>
          <ResultsPanel
            result={data.prediction}
            brandCategory={data.profile?.brandType?.name}
            eventType={data.event.eventCategory?.name}
            city={data.event.location}
          />
          {data.event.status === "upcoming" ? (
            <div className="mt-4 flex justify-end">
              <Button to={`/sponsor/event/${id}`}>Go to sponsorship</Button>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
