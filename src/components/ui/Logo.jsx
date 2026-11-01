import { cn } from "@/lib/utils";

export function LogoMark({ className = "h-9 w-9", onDark = false }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="13" fill={onDark ? "#FFFFFF" : "#0F4C4F"} />
      <path d="M33.5 14.5H20.75a6.75 6.75 0 0 0 0 13.5H24" stroke={onDark ? "#0F4C4F" : "#FFFFFF"} strokeWidth="5" strokeLinecap="round" />
      <path d="M14.5 33.5h12.75a6.75 6.75 0 0 0 0-13.5H24" stroke="#F2A31B" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ className = "", markClassName, onDark = false }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} onDark={onDark} />
      <span className={cn("font-display text-xl font-bold tracking-tight", onDark ? "text-white" : "text-ink")}>
        Sponsor<span className={onDark ? "text-marigold" : "text-brand"}>Wise</span>
      </span>
    </span>
  );
}
