import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Check, CheckCheck, FileText, Handshake, Paperclip, Send, X } from "lucide-react";
import OfferModal from "@/components/events/OfferModal";
import Button from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { Avatar, Badge, ErrorState, PageSpinner, StatusBadge } from "@/components/ui/Primitives";
import { useRealtime } from "@/context/RealtimeContext";
import { useResource } from "@/hooks/useResource";
import {
  acceptOfferAsSponsor,
  counterAsOrganizer,
  counterAsSponsor,
  getAttachmentLink,
  getConversation,
  getConversationMessages,
  markConversationRead,
  sendAttachment,
  updateApplicationStatus,
} from "@/lib/api";
import { cn, fmtDayLabel, fmtTime, getErrorMessage, rupees } from "@/lib/utils";

const MAX_LENGTH = 2000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const TYPING_SEND_MS = 1500;
const TYPING_SHOW_MS = 2500;
const GROUP_GAP_MS = 5 * 60 * 1000;

function DealBar({ conversation, onChanged }) {
  const confirm = useConfirm();
  const [countering, setCountering] = useState(false);
  const [busy, setBusy] = useState(false);
  const { deal, event, role } = conversation;

  if (!deal) return null;

  const eventId = event?._id;
  const latest = deal.negotiations?.at(-1);
  const open = ["pending", "negotiating"].includes(deal.status) && event?.status === "upcoming";
  const myTurn = open && latest?.from !== role;

  const counter = async (offer) => {
    try {
      await (role === "sponsor" ? counterAsSponsor(eventId, offer) : counterAsOrganizer(eventId, deal._id, offer));
      setCountering(false);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const accept = async () => {
    const yes = await confirm({
      title: `Accept ${rupees(latest.amount)}?`,
      message: "This agrees the deal at this amount, and locks the event's date and city.",
      confirmLabel: "Accept offer",
    });
    if (!yes) return;
    setBusy(true);
    try {
      await (role === "sponsor" ? acceptOfferAsSponsor(eventId) : updateApplicationStatus(eventId, deal._id, "accepted"));
      toast.success("Deal agreed");
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-brand-soft/60 px-4 py-2.5">
      <Handshake className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
      <div className="min-w-0 flex-1 basis-40">
        <p className="font-display text-lg font-bold leading-tight text-brand">
          {rupees(deal.status === "accepted" ? deal.finalAmount : latest?.amount)}
        </p>
        <p className="text-xs text-ink-soft">
          {deal.status === "accepted" ? "Agreed deal" : open ? (myTurn ? "Waiting for your reply" : "Waiting for their reply") : "Latest offer"}
        </p>
      </div>
      {open ? null : <StatusBadge status={deal.status} />}
      {myTurn ? (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCountering(true)}>Counter</Button>
          <Button size="sm" loading={busy} onClick={accept}>Accept</Button>
        </div>
      ) : null}
      <OfferModal open={countering} currentAmount={latest?.amount} onClose={() => setCountering(false)} onSubmit={counter} />
    </div>
  );
}

function Attachment({ file, messageId, mine }) {
  // PDFs open through a short-lived signed link, fetched when they're clicked.
  // The tab opens first, because browsers block pop-ups opened after a wait.
  const openPdf = async () => {
    const tab = window.open("", "_blank");
    try {
      tab.location = await getAttachmentLink(messageId);
    } catch (err) {
      tab?.close();
      toast.error(getErrorMessage(err));
    }
  };

  if (file.type?.startsWith("image/")) {
    return (
      <a href={file.url} target="_blank" rel="noreferrer" className="block">
        <img src={file.url} alt={file.name} className="max-h-64 w-full rounded-xl object-cover" />
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={openPdf}
      className={cn("flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition", mine ? "bg-white/15 hover:bg-white/25" : "bg-paper hover:bg-sand")}
    >
      <FileText className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{file.name}</span>
        <span className={cn("block text-xs", mine ? "text-white/70" : "text-ink-faint")}>{Math.max(1, Math.round((file.size || 0) / 1024))} KB</span>
      </span>
    </button>
  );
}

function Bubble({ message, mine, compact }) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start", compact ? "mt-0.5" : "mt-3")}>
      <div className={cn(
        "max-w-[85%] rounded-2xl px-3 py-2 sm:max-w-[70%]",
        mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md border border-line bg-white text-ink"
      )}>
        {message.attachment?.url ? <Attachment file={message.attachment} messageId={message._id} mine={mine} /> : null}
        {message.text ? <p className={cn("whitespace-pre-wrap break-words text-[15px] leading-snug", message.attachment?.url && "mt-1.5")}>{message.text}</p> : null}
        <p className={cn("mt-0.5 flex items-center justify-end gap-1 text-[11px]", mine ? "text-white/70" : "text-ink-faint")}>
          {fmtTime(message.createdAt)}
          {mine ? (message.isRead ? <CheckCheck className="h-3.5 w-3.5 text-marigold" aria-label="Read" /> : <Check className="h-3.5 w-3.5" aria-label="Sent" />) : null}
        </p>
      </div>
    </div>
  );
}

function DealNote({ text }) {
  return (
    <p className="mx-auto mt-3 w-fit max-w-[90%] rounded-full bg-marigold-soft px-3 py-1 text-center text-xs font-semibold text-warn">
      {text}
    </p>
  );
}

function Timeline({ messages, role }) {
  return messages.map((message, index) => {
    const previous = messages[index - 1];
    const newDay = !previous || fmtDayLabel(previous.createdAt) !== fmtDayLabel(message.createdAt);
    const compact = !newDay && previous?.kind !== "deal" && previous?.senderRole === message.senderRole
      && new Date(message.createdAt) - new Date(previous.createdAt) < GROUP_GAP_MS;

    return (
      <div key={message._id}>
        {newDay ? (
          <p className="my-4 text-center text-xs font-semibold text-ink-faint">{fmtDayLabel(message.createdAt)}</p>
        ) : null}
        {message.kind === "deal"
          ? <DealNote text={message.text} />
          : <Bubble message={message} mine={message.senderRole === role} compact={compact} />}
      </div>
    );
  });
}

function Composer({ conversationId, socket, onSent }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const lastTyping = useRef(0);
  const box = useRef(null);
  const picker = useRef(null);

  const resize = () => {
    box.current.style.height = "auto";
    // scrollHeight leaves out the 1px borders, which would show a scrollbar
    box.current.style.height = `${box.current.scrollHeight + 2}px`;
  };

  const pick = (e) => {
    const chosen = e.target.files[0];
    e.target.value = "";
    if (!chosen) return;
    if (!FILE_TYPES.includes(chosen.type) || chosen.size > MAX_FILE_BYTES) {
      toast.error("You can attach images and PDFs up to 5 MB");
      return;
    }
    setFile(chosen);
  };

  const send = async () => {
    const body = text.trim();
    if (sending || (!body && !file)) return;

    if (file) {
      setSending(true);
      try {
        await sendAttachment(conversationId, file, body);
        setFile(null);
        setText("");
        onSent();
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
      setSending(false);
    } else {
      socket?.emit("send_message", { conversationId, text: body });
      setText("");
      onSent();
    }
    requestAnimationFrame(resize);
  };

  const handleChange = (e) => {
    setText(e.target.value);
    resize();
    if (Date.now() - lastTyping.current > TYPING_SEND_MS) {
      lastTyping.current = Date.now();
      socket?.emit("typing", conversationId);
    }
  };

  const canSend = Boolean(socket) && (text.trim() || file) && !sending;

  return (
    <div className="pb-safe border-t border-line bg-white p-3">
      {file ? (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-paper p-2">
          <FileText className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
          <button type="button" onClick={() => setFile(null)} aria-label="Remove file" className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint hover:bg-sand">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <input ref={picker} type="file" accept={FILE_TYPES.join(",")} onChange={pick} className="sr-only" aria-label="Attach a file" tabIndex={-1} />
        <button
          type="button"
          onClick={() => picker.current.click()}
          aria-label="Attach an image or PDF"
          title="Attach an image or PDF"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-soft transition hover:bg-sand hover:text-ink"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <textarea
          ref={box}
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={MAX_LENGTH}
          aria-label="Message"
          placeholder="Write a message"
          className="field-control max-h-32 resize-none"
        />
        <button
          type="button"
          onClick={send}
          aria-label="Send message"
          disabled={!canSend}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition hover:bg-brand-strong disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ChatThread({ conversationId, onChanged }) {
  const { socket, setOpenConversation } = useRealtime();
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  const typingTimer = useRef(null);

  const { data: conversation, loading, error, reload } = useResource(() => getConversation(conversationId), [conversationId]);
  const history = useResource(() => getConversationMessages(conversationId), [conversationId]);

  const markRead = useCallback(() => {
    markConversationRead(conversationId).then(onChanged).catch(() => {});
  }, [conversationId, onChanged]);

  useEffect(() => {
    if (!history.data) return undefined;
    const frame = requestAnimationFrame(() => setMessages(history.data));
    return () => cancelAnimationFrame(frame);
  }, [history.data]);

  useEffect(() => {
    setOpenConversation(conversationId);
    markRead();
    return () => setOpenConversation(null);
  }, [conversationId, markRead, setOpenConversation]);

  useEffect(() => {
    if (!socket) return undefined;

    const join = () => socket.emit("join_room", conversationId);
    const onMessage = (message) => {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => (prev.some((item) => item._id === message._id) ? prev : [...prev, message]));
      setTyping(false);
      if (message.kind === "deal") reload();
      else markRead();
    };
    const onRead = ({ conversationId: id }) => {
      if (id === conversationId) setMessages((prev) => prev.map((item) => ({ ...item, isRead: true })));
    };
    const onTyping = ({ conversationId: id }) => {
      if (id !== conversationId) return;
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), TYPING_SHOW_MS);
    };

    join();
    socket.on("connect", join);
    socket.on("receive_message", onMessage);
    socket.on("messages_read", onRead);
    socket.on("typing", onTyping);

    return () => {
      socket.emit("leave_room", conversationId);
      socket.off("connect", join);
      socket.off("receive_message", onMessage);
      socket.off("messages_read", onRead);
      socket.off("typing", onTyping);
      clearTimeout(typingTimer.current);
    };
  }, [socket, conversationId, reload, markRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, typing]);

  if (loading) return <PageSpinner label="Opening conversation…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { other, event, role } = conversation;
  const eventLink = role === "sponsor" ? `/sponsor/event/${event?._id}` : `/organizer/event/${event?._id}`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-white px-3 py-2.5">
        <Link to="/messages" aria-label="Back to conversations" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-sand md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Avatar name={other.name} src={other.logo} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{other.name}</h2>
          {event ? <Link to={eventLink} className="block truncate text-sm text-ink-soft hover:text-brand hover:underline">{event.eventName}</Link> : null}
        </div>
        {event?.status === "completed" ? <Badge>Event finished</Badge> : null}
      </header>

      <DealBar conversation={conversation} onChanged={reload} />

      <div className="min-h-0 flex-1 overflow-y-auto bg-paper px-3 py-2 sm:px-4">
        {messages.length === 0 ? <p className="py-10 text-center text-sm text-ink-faint">No messages yet. Say hello.</p> : <Timeline messages={messages} role={role} />}
        {typing ? <p className="mt-2 text-sm italic text-ink-faint">{other.name} is typing…</p> : null}
        <div ref={endRef} />
      </div>

      <Composer conversationId={conversationId} socket={socket} onSent={onChanged} />
    </div>
  );
}
