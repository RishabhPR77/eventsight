import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-brand text-white hover:bg-brand-strong shadow-sm",
  accent: "bg-marigold text-ink hover:bg-[#E5960F] shadow-sm",
  secondary: "border border-line bg-white text-ink hover:bg-sand",
  ghost: "text-ink-soft hover:bg-sand hover:text-ink",
  danger: "bg-bad text-white hover:bg-[#A33024] shadow-sm",
  "danger-soft": "bg-bad-soft text-bad hover:bg-[#F7D8D3]",
};

const SIZES = {
  sm: "h-9 gap-1.5 px-3 text-sm",
  md: "h-11 gap-2 px-4 text-[15px]",
  lg: "h-12 gap-2 px-6 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  to,
  href,
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}) {
  const classes = cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className
  );

  if (to) return <Link to={to} className={classes} {...props}>{children}</Link>;
  if (href) return <a href={href} className={classes} {...props}>{children}</a>;

  return (
    <button type={type} disabled={disabled || loading} className={classes} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
