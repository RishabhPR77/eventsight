import { cn, rupees, timeAgo } from "@/lib/utils";

// Every offer in order, always open, so nobody has to dig for what was said
export default function OfferTimeline({ negotiations = [], viewer, className = "" }) {
  if (!negotiations.length) return null;
  const latestIndex = negotiations.length - 1;

  return (
    <section className={className} aria-labelledby="offer-timeline-title">
      <h3 id="offer-timeline-title" className="mb-3 font-semibold">Offer history</h3>
      <ol className="space-y-3">
        {negotiations.map((offer, index) => {
          const mine = offer.from === viewer;
          const latest = index === latestIndex;
          return (
            <li key={offer._id || index} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "w-full max-w-md rounded-2xl border p-4",
                  mine ? "border-brand/20 bg-brand-soft" : "border-line bg-paper",
                  latest && "ring-2 ring-marigold/60"
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-ink-soft">
                    {mine ? "You" : offer.from === "sponsor" ? "Sponsor" : "Organizer"}
                    {index === 0 ? " offered" : " countered"}
                    {latest ? <span className="ml-2 rounded-full bg-marigold-soft px-2 py-0.5 text-xs text-warn">Latest</span> : null}
                  </span>
                  {offer.createdAt ? <span className="text-xs text-ink-faint">{timeAgo(offer.createdAt)}</span> : null}
                </div>
                <p className="mt-1 font-display text-2xl font-bold text-ink">{rupees(offer.amount)}</p>
                {offer.message ? <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{offer.message}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
