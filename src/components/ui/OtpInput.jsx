import { useRef } from "react";

const LENGTH = 6;

// Six boxes that behave like one field: typing advances, Backspace goes back,
// and pasting a whole code fills them all.
export default function OtpInput({ value, onChange }) {
  const refs = useRef([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] || "");

  const focus = (index) => refs.current[Math.min(index, LENGTH - 1)]?.focus();

  const write = (index, text) => {
    const next = [...digits];
    text.split("").slice(0, LENGTH - index).forEach((digit, offset) => {
      next[index + offset] = digit;
    });
    onChange(next.join(""));
    focus(index + text.length);
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="6-digit code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={digit}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1}`}
          className="field-control h-14 min-w-0 px-0 text-center font-display text-2xl font-bold"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const text = e.target.value.replace(/\D/g, "");
            if (text) write(index, text.slice(-1 * Math.max(1, text.length - (digit ? 1 : 0))));
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text").replace(/\D/g, "");
            if (text) write(index, text);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Backspace") return;
            e.preventDefault();
            const next = [...digits];
            const target = digit ? index : Math.max(0, index - 1);
            next[target] = "";
            onChange(next.join(""));
            focus(target);
          }}
        />
      ))}
    </div>
  );
}
