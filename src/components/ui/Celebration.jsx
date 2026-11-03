import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const CelebrationContext = createContext(() => {});

// Big moments (a deal agreed, a sponsorship complete) fill the screen in green;
// smaller wins get the same tick over a light backdrop and leave sooner
const DURATION_MS = { big: 3200, small: 1800 };

function Tick({ big }) {
  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <span aria-hidden="true" className={cn("celebrate-anim celebrate-ring absolute inset-0 rounded-full", big ? "bg-white/30" : "bg-good/20")} />
      <svg viewBox="0 0 120 120" className="celebrate-anim celebrate-pop relative h-32 w-32" aria-hidden="true">
        <circle cx="60" cy="60" r="54" fill={big ? "#FFFFFF" : "#1C7C54"} />
        <path
          d="M36 62 L53 78 L85 44"
          fill="none"
          stroke={big ? "#1C7C54" : "#FFFFFF"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="celebrate-anim celebrate-draw"
        />
      </svg>
    </div>
  );
}

export function CelebrationProvider({ children }) {
  const [moment, setMoment] = useState(null);

  // { title, message, amount, big }
  const celebrate = useCallback((next) => setMoment({ ...next, key: Date.now() }), []);
  const close = useCallback(() => setMoment(null), []);

  useEffect(() => {
    if (!moment) return undefined;
    const timer = setTimeout(close, moment.big ? DURATION_MS.big : DURATION_MS.small);
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [moment, close]);

  return (
    <CelebrationContext.Provider value={celebrate}>
      {children}
      {moment ? (
        <div
          key={moment.key}
          role="status"
          aria-live="polite"
          onClick={close}
          className={cn(
            "celebrate-anim celebrate-fade fixed inset-0 z-[70] flex cursor-pointer flex-col items-center justify-center px-6 text-center",
            moment.big ? "bg-good text-white" : "bg-paper/95 text-ink backdrop-blur-sm"
          )}
        >
          <Tick big={moment.big} />
          <h2 className="celebrate-anim celebrate-rise mt-8 font-display text-3xl font-bold sm:text-4xl">{moment.title}</h2>
          {moment.amount ? (
            <p className={cn("celebrate-anim celebrate-rise mt-2 font-display text-4xl font-bold sm:text-5xl", moment.big ? "text-marigold" : "text-brand")}>
              {moment.amount}
            </p>
          ) : null}
          {moment.message ? (
            <p className={cn("celebrate-anim celebrate-rise mt-3 max-w-md text-lg", moment.big ? "text-white/85" : "text-ink-soft")}>{moment.message}</p>
          ) : null}
          <p className={cn("mt-10 text-sm", moment.big ? "text-white/60" : "text-ink-faint")}>Tap anywhere to continue</p>
        </div>
      ) : null}
    </CelebrationContext.Provider>
  );
}

export function useCelebrate() {
  return useContext(CelebrationContext);
}
