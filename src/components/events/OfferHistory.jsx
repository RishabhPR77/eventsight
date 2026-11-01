import { cn, rupees } from "@/lib/utils";

// Shows the back-and-forth; hidden until there has actually been a counter-offer
export default function OfferHistory({ negotiations = [], viewer, className = "" }) {
  if (negotiations.length < 2) return null;

  return (
    <details className={cn("rounded-xl bg-paper p-3 text-sm", className)}>
      <summary className="cursor-pointer font-semibold text-ink-soft">Offer history ({negotiations.length})</summary>
      <ol className="mt-2 space-y-2">
        {negotiations.map((offer, index) => (
          <li key={offer._id || index} className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="text-ink-soft">{offer.from === viewer ? "You" : offer.from === "sponsor" ? "Sponsor" : "Organizer"}</span>
              {offer.message ? <span className="block text-ink-faint">{offer.message}</span> : null}
            </span>
            <span className="shrink-0 font-display font-bold">{rupees(offer.amount)}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
