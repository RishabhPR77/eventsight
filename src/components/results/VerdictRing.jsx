import { BAND_STYLES } from "@/lib/labels";

export default function VerdictRing({ percent, band = "UNKNOWN", size = 136 }) {
  const stroke = Math.round(size / 11);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, percent ?? 0));
  const style = BAND_STYLES[band] || BAND_STYLES.UNKNOWN;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${value}% chance of a deal`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F3EEE5" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={style.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold leading-none" style={{ fontSize: size * 0.26, color: style.color }}>{value}%</span>
      </div>
    </div>
  );
}
