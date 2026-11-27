import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Button from "@/components/ui/Button";
import { useServerStatus } from "@/hooks/useServerStatus";
import { subscribeAiWaiting } from "@/lib/wake";

const MESSAGES = {
  server: {
    title: "Waking up the server",
    text: "It sleeps when nobody's using it, to stay on free hosting. This takes up to a minute, just this once.",
  },
  ai: {
    title: "Starting the AI engine",
    text: "It sleeps when nobody's using it. This takes up to a minute, then your analysis runs straight away.",
  },
};

// Answers that come back almost at once shouldn't flash the ring
const SHOW_AFTER_MS = 400;

function useShowAfterDelay() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);
  return show;
}

export function WakeRing({ kind }) {
  const { title, text } = MESSAGES[kind];
  return (
    <div role="status" aria-live="polite" className="flex max-w-sm flex-col items-center px-6 text-center">
      <span
        aria-hidden="true"
        className="h-14 w-14 animate-spin rounded-full border-4 border-brand-soft border-t-marigold motion-reduce:animate-[spin_2.5s_linear_infinite]"
      />
      <h2 className="mt-5 text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-ink-soft">One moment, please.</p>
      <p className="mt-3 text-sm text-ink-faint">{text}</p>
    </div>
  );
}

export function ServerWaitScreen({ failed, onRetry }) {
  const show = useShowAfterDelay();
  if (!show) return <div className="min-h-dvh bg-paper" />;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper">
      {failed ? (
        <div role="alert" className="flex max-w-sm flex-col items-center px-6 text-center">
          <h2 className="text-xl font-semibold text-ink">The server isn't answering</h2>
          <p className="mt-1 text-ink-soft">Please check your connection and try again.</p>
          <Button className="mt-5" onClick={onRetry}>Try again</Button>
        </div>
      ) : (
        <WakeRing kind="server" />
      )}
    </div>
  );
}

// Pages that talk to the server (sign in, sign up and the rest) open once it's awake
export function ServerGate() {
  const { status, retry } = useServerStatus();
  if (status !== "awake") return <ServerWaitScreen failed={status === "failed"} onRetry={retry} />;
  return <Outlet />;
}

// Covers the page while a click waits for the AI to wake
export function AiWakeOverlay() {
  const [waiting, setWaiting] = useState(false);
  useEffect(() => subscribeAiWaiting(setWaiting), []);

  if (!waiting) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-paper/90 backdrop-blur-sm animate-rise">
      <WakeRing kind="ai" />
    </div>
  );
}
