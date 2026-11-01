import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarClock, CheckCheck, CircleCheck, CircleX, Handshake, MessageCircle, Repeat2, Star, Undo2 } from "lucide-react";
import { useRealtime } from "@/context/RealtimeContext";
import { cn, timeAgo } from "@/lib/utils";

const ICONS = {
  message: MessageCircle,
  offer: Handshake,
  counter: Repeat2,
  accepted: CircleCheck,
  rejected: CircleX,
  withdrawn: Undo2,
  confirm: CheckCheck,
  feedback: Star,
  event: CalendarClock,
};

export default function NotificationBell() {
  const { notifications, unread, markRead, markAllRead } = useRealtime();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    const closeOnEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const openItem = (item) => {
    setOpen(false);
    if (!item.read) markRead(item._id);
    if (item.link) navigate(item.link);
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition hover:bg-sand hover:text-ink"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread ? (
          <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-bad px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-x-3 top-16 z-40 animate-rise overflow-hidden rounded-2xl border border-line bg-white shadow-lift sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-semibold">Notifications</h2>
            {unread ? (
              <button type="button" onClick={markAllRead} className="text-sm font-semibold text-brand hover:underline">Mark all as read</button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-faint">You're all caught up.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {notifications.map((item) => {
                const Icon = ICONS[item.type] || Bell;
                return (
                  <li key={item._id}>
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className={cn("flex w-full gap-3 px-4 py-3 text-left transition hover:bg-paper", !item.read && "bg-brand-soft/50")}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sand text-brand">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm", item.read ? "text-ink-soft" : "font-semibold text-ink")}>{item.title}</span>
                        {item.body ? <span className="block truncate text-sm text-ink-faint">{item.body}</span> : null}
                        <span className="mt-0.5 block text-xs text-ink-faint">{timeAgo(item.updatedAt)}</span>
                      </span>
                      {!item.read ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-marigold" aria-label="Unread" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
