import { useCallback, useEffect, useState } from "react";
import { isServerAwake, wakeServer } from "@/lib/wake";

// "awake", "waking" or "failed" (no answer after a couple of minutes)
export function useServerStatus() {
  const [status, setStatus] = useState(isServerAwake() ? "awake" : "waking");

  useEffect(() => {
    if (status !== "waking") return undefined;
    let current = true;
    wakeServer().then((ok) => {
      if (current) setStatus(ok ? "awake" : "failed");
    });
    return () => {
      current = false;
    };
  }, [status]);

  const retry = useCallback(() => setStatus("waking"), []);
  return { status, retry };
}
