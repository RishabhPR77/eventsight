import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { MessagesSquare, Search } from "lucide-react";
import ChatThread from "@/components/chat/ChatThread";
import { Avatar, Card, EmptyState, ErrorState } from "@/components/ui/Primitives";
import { useRealtime } from "@/context/RealtimeContext";
import { useResource } from "@/hooks/useResource";
import { getConversations } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";

function ConversationRow({ conversation }) {
  return (
    <NavLink
      to={`/messages/${conversation._id}`}
      className={({ isActive }) => cn("flex items-center gap-3 px-3 py-3 transition", isActive ? "bg-brand-soft" : "hover:bg-paper")}
    >
      <Avatar name={conversation.other.name} src={conversation.other.logo} className="h-11 w-11" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold">{conversation.other.name}</span>
          <span className="shrink-0 text-xs text-ink-faint">{timeAgo(conversation.updatedAt)}</span>
        </span>
        <span className="block truncate text-xs text-ink-faint">{conversation.event?.eventName}</span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm", conversation.unread ? "font-semibold text-ink" : "text-ink-soft")}>{conversation.lastMessage}</span>
          {conversation.unread ? (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marigold px-1.5 text-xs font-bold text-ink">{conversation.unread}</span>
          ) : null}
        </span>
      </span>
    </NavLink>
  );
}

export default function MessagesPage() {
  const { id } = useParams();
  const { socket } = useRealtime();
  const [search, setSearch] = useState("");
  const { data, loading, error, reload } = useResource(getConversations);

  // Keeps the list's order and previews current while a chat is open
  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => reload();
    socket.on("notification", refresh);
    socket.on("receive_message", refresh);
    return () => {
      socket.off("notification", refresh);
      socket.off("receive_message", refresh);
    };
  }, [socket, reload]);

  const handleChanged = useCallback(() => reload(), [reload]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data || []).filter((item) => (
      !term || item.other.name.toLowerCase().includes(term) || item.event?.eventName?.toLowerCase().includes(term)
    ));
  }, [data, search]);

  return (
    <Card className="grid h-[calc(100dvh-10.75rem)] grid-cols-1 overflow-hidden md:grid-cols-[320px_minmax(0,1fr)] lg:h-[calc(100dvh-7.5rem)]">
      <section aria-label="Conversations" className={cn("flex min-h-0 flex-col border-r border-line", id && "max-md:hidden")}>
        <div className="border-b border-line p-3">
          <h1 className="mb-2 text-xl font-bold">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search conversations" placeholder="Search" className="field-control h-10 py-2 pl-9" />
          </div>
        </div>
        <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {error ? <ErrorState error={error} onRetry={reload} /> : null}
          {!loading && !error && shown.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title={data?.length ? "No matches" : "No conversations yet"}
              description={data?.length ? null : "Offers and messages about events will appear here."}
            />
          ) : null}
          {shown.map((conversation) => <ConversationRow key={conversation._id} conversation={conversation} />)}
        </div>
      </section>

      <section aria-label="Conversation" className={cn("min-h-0 min-w-0", !id && "max-md:hidden")}>
        {id ? <ChatThread key={id} conversationId={id} onChanged={handleChanged} /> : (
          <div className="flex h-full items-center justify-center bg-paper">
            <EmptyState icon={MessagesSquare} title="Pick a conversation" description="Choose one from the list to read and reply." />
          </div>
        )}
      </section>
    </Card>
  );
}
