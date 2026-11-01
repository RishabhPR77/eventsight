import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl" };

// Native <dialog> gives focus trapping, Escape to close and a backdrop for free.
// On phones it docks to the bottom of the screen; `side` docks it to the right.
export default function Modal({ open, onClose, title, description, size = "md", side = false, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none flex-col overflow-hidden rounded-t-2xl bg-white p-0 text-ink shadow-lift open:flex open:animate-rise",
        side
          ? "sm:ml-auto sm:mr-0 sm:mt-0 sm:h-dvh sm:max-h-dvh sm:max-w-md sm:rounded-none sm:rounded-l-2xl"
          : cn("sm:m-auto sm:rounded-2xl", SIZES[size])
      )}
    >
      {open ? (
        <>
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold">{title}</h2>
              {description ? <p className="mt-1 text-sm text-ink-soft">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-faint transition hover:bg-sand hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </>
      ) : null}
    </dialog>
  );
}

export function ModalBody({ className = "", children }) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto p-5", className)}>{children}</div>;
}

export function ModalFooter({ children }) {
  return <div className="pb-safe flex justify-end gap-2 border-t border-line bg-paper p-4">{children}</div>;
}
