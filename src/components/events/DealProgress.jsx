import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const stepsFor = (application, eventDone, hasFeedback) => [
  { label: "Offer sent", done: Boolean(application) },
  { label: "Accepted", done: application?.status === "accepted" },
  { label: "Event finished", done: eventDone },
  { label: "Confirmed by both", done: Boolean(application?.sponsorConfirmedAt && application?.organizerConfirmedAt) },
  { label: "Feedback", done: hasFeedback },
];

export default function DealProgress({ application, eventDone, hasFeedback }) {
  const steps = stepsFor(application, eventDone, hasFeedback);
  const current = steps.findIndex((step) => !step.done);

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => (
        <li key={step.label} className="relative flex items-center gap-3 pb-4 last:pb-0">
          {index < steps.length - 1 ? (
            <span aria-hidden="true" className={cn("absolute left-[11px] top-6 h-[calc(100%-24px)] w-0.5", step.done ? "bg-good" : "bg-line")} />
          ) : null}
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              step.done ? "bg-good text-white" : index === current ? "border-2 border-brand text-brand" : "border-2 border-line text-ink-faint"
            )}
          >
            {step.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
          </span>
          <span className={cn("text-sm", step.done || index === current ? "font-semibold text-ink" : "text-ink-faint")}>
            {step.label}
            <span className="sr-only">{step.done ? " (done)" : ""}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
