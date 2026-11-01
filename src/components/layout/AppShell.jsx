import { Link, NavLink, useNavigate } from "react-router-dom";
import { Compass, Handshake, History, LayoutDashboard, LogOut, MessagesSquare, Settings, Sparkles, Store } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRealtime } from "@/context/RealtimeContext";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Primitives";
import Logo from "@/components/ui/Logo";
import NotificationBell from "./NotificationBell";

const MESSAGES = { to: "/messages", label: "Messages", icon: MessagesSquare, badge: true };
const SETTINGS = { to: "/settings", label: "Settings", icon: Settings, desktopOnly: true };

const NAV = {
  organizer: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    MESSAGES,
    { to: "/history", label: "History", icon: History },
    SETTINGS,
  ],
  sponsor: [
    { to: "/", label: "Discover", icon: Compass, end: true },
    { to: "/sponsorships", label: "Sponsorships", icon: Handshake },
    MESSAGES,
    { to: "/sponsor-wise", label: "Predictor", icon: Sparkles },
    { to: "/brand", label: "Brand", icon: Store },
    SETTINGS,
  ],
};

function UnreadDot({ count, className = "" }) {
  if (!count) return null;
  return (
    <span className={cn("flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-marigold px-1 text-[11px] font-bold text-ink", className)}>
      {count > 9 ? "9+" : count}
    </span>
  );
}

function SidebarLink({ item, unread }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => cn(
        "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition",
        isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
      )}
    >
      {({ isActive }) => (
        <>
          <Icon className={cn("h-5 w-5", isActive && "text-marigold")} aria-hidden="true" />
          <span className="flex-1">{item.label}</span>
          {item.badge ? <UnreadDot count={unread} /> : null}
        </>
      )}
    </NavLink>
  );
}

function TabLink({ item, unread }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => cn(
        "relative flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition",
        isActive ? "text-brand" : "text-ink-faint"
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="max-w-full truncate px-0.5">{item.label}</span>
      {item.badge ? <UnreadDot count={unread} className="absolute left-1/2 top-0.5 ml-1" /> : null}
    </NavLink>
  );
}

export default function AppShell({ children }) {
  const { user, signOut } = useAuth();
  const { unreadMessages } = useRealtime();
  const navigate = useNavigate();
  const items = NAV[user?.role] || NAV.organizer;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-brand-strong p-4 lg:flex">
        <Link to="/" className="mb-8 px-2 pt-1"><Logo onDark /></Link>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {items.map((item) => <SidebarLink key={item.to} item={item} unread={unreadMessages} />)}
        </nav>
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
          <Avatar name={user?.username} className="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{user?.username}</div>
            <div className="text-xs capitalize text-white/60">{user?.role}</div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur lg:justify-end lg:px-10">
        <Link to="/" className="lg:hidden"><Logo markClassName="h-8 w-8" /></Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Link
            to="/settings"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition hover:bg-sand hover:text-ink lg:hidden"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition hover:bg-sand hover:text-ink lg:hidden"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl animate-rise px-4 pb-24 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-4">
        {children}
      </main>

      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white lg:hidden">
        {items.filter((item) => !item.desktopOnly).map((item) => <TabLink key={item.to} item={item} unread={unreadMessages} />)}
      </nav>
    </div>
  );
}
