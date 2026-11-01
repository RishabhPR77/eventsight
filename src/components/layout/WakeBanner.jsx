import { useEffect, useState } from "react";
import { Coffee } from "lucide-react";
import { subscribeSlowRequests } from "@/lib/api";

// Free hosting sleeps when nobody is using it, so tell people why it's slow
export default function WakeBanner() {
  const [slow, setSlow] = useState(false);

  useEffect(() => subscribeSlowRequests(setSlow), []);

  if (!slow) return null;

  return (
    <div role="status" className="fixed inset-x-3 top-3 z-50 mx-auto flex max-w-md animate-rise items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-lift">
      <Coffee className="h-5 w-5 shrink-0 text-marigold" aria-hidden="true" />
      <span>Waking up the server. This can take up to a minute on the first visit.</span>
    </div>
  );
}
