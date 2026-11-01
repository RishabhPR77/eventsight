import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, error, optional, className = "", children }) {
  const id = useId();
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold text-ink">
          {label}
          {optional ? <span className="text-xs font-normal text-ink-faint">Optional</span> : null}
        </label>
      ) : null}
      {children(id)}
      {error ? <p role="alert" className="mt-1.5 text-sm text-bad">{error}</p> : null}
      {!error && hint ? <p className="mt-1.5 text-sm text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function Input({ label, hint, error, optional, className = "", ...props }) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className}>
      {(id) => <input id={id} className="field-control" {...props} />}
    </Field>
  );
}

export function PasswordInput({ label, hint, error, className = "", ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(id) => (
        <div className="relative">
          <input id={id} type={visible ? "text" : "password"} className="field-control pr-11" {...props} />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-faint hover:bg-sand hover:text-ink"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      )}
    </Field>
  );
}

export function Select({ label, hint, error, optional, className = "", children, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className}>
      {(id) => <select id={id} className="field-control cursor-pointer pr-8" {...props}>{children}</select>}
    </Field>
  );
}

export function Textarea({ label, hint, error, optional, className = "", ...props }) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className}>
      {(id) => <textarea id={id} className="field-control min-h-[96px] resize-y" {...props} />}
    </Field>
  );
}

export function Toggle({ label, hint, className = "", ...props }) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line bg-white p-3.5 transition hover:border-ink-faint/50", className)}>
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-sm text-ink-faint">{hint}</span> : null}
      </span>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full bg-line transition peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-marigold after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
    </label>
  );
}

export function RatingSlider({ label, hint, value, onChange, name }) {
  const percent = Math.round(Number(value) * 100);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="font-display text-lg font-bold text-brand">{percent}%</span>
      </div>
      <input
        type="range"
        name={name}
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-2 w-full cursor-pointer accent-brand"
      />
      {hint ? <p className="mt-1 text-sm text-ink-faint">{hint}</p> : null}
    </div>
  );
}
