// How an organizer's offers are grouped, shared by the dashboard and the Offers page

const OPEN = ["pending", "negotiating"];
const CLOSED = ["rejected", "withdrawn", "cancelled"];

const bothConfirmed = (item) => Boolean(item.sponsorConfirmedAt && item.organizerConfirmedAt);

export const needsOrganizer = (item) => {
  if (!item.event) return false;
  if (item.status === "accepted") return item.event.status === "completed" && !item.organizerConfirmedAt;
  return OPEN.includes(item.status) && item.event.status === "upcoming" && item.negotiations?.at(-1)?.from === "sponsor";
};

export const isClosedOffer = (item) => CLOSED.includes(item.status) || (item.status === "accepted" && bothConfirmed(item));

export const isOpenOffer = (item) => OPEN.includes(item.status);

// The badge next to each offer: what happens next, and who it's waiting on
export const organizerNextStep = (item) => {
  if (needsOrganizer(item)) {
    if (item.status === "accepted") return { tone: "accent", label: "Confirm it happened" };
    return { tone: "accent", label: item.status === "negotiating" ? "Reply to counter-offer" : "Reply to new offer" };
  }
  if (isOpenOffer(item)) return { tone: "neutral", label: "Waiting for sponsor" };
  if (item.status !== "accepted") return null;
  if (bothConfirmed(item)) return { tone: "good", label: "Confirmed" };
  if (item.event?.status === "completed") return { tone: "neutral", label: "Waiting for sponsor to confirm" };
  return { tone: "brand", label: "Event coming up" };
};
