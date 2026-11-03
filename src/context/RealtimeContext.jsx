import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useCelebrate } from "@/components/ui/Celebration";
import { useAuth } from "@/context/AuthContext";
import { getNotifications, markAllNotificationsRead, markNotificationRead, refreshToken, SOCKET_URL } from "@/lib/api";

const RealtimeContext = createContext(null);

const upsert = (list, item) => [item, ...list.filter((entry) => entry._id !== item._id)];

// One socket per signed-in user: the bell and every chat share it
export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const userId = user?._id;
  // The socket handler is set up once, so it reads the latest celebrate through a ref
  const celebrateRef = useRef(useCelebrate());
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const openConversation = useRef(null);

  const load = useCallback(() => {
    getNotifications()
      .then((res) => setNotifications(res.data.notifications))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return undefined;

    const connection = io(SOCKET_URL, { withCredentials: true });
    let renewedSession = false;

    connection.on("connect", () => {
      renewedSession = false;
      setSocket(connection);
      load();
    });

    connection.on("notification", (notification) => {
      const viewing = notification.conversation && notification.conversation === openConversation.current;
      if (viewing) return;
      setNotifications((prev) => upsert(prev, notification));
      if (notification.type === "accepted") {
        celebrateRef.current({ big: true, title: "Deal agreed!", message: `${notification.title} · ${notification.body}` });
      } else {
        toast(notification.title);
      }
    });

    // Access tokens are short-lived, and sockets don't pass through the API's refresh
    connection.on("connect_error", async () => {
      if (renewedSession) return;
      renewedSession = true;
      try {
        await refreshToken();
        connection.connect();
      } catch {
        // Signed out: the API's session handling takes it from here
      }
    });

    return () => {
      connection.disconnect();
      setSocket(null);
      setNotifications([]);
    };
  }, [userId, load]);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, read: true } : item)));
    await markNotificationRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    await markAllNotificationsRead().catch(() => {});
  }, []);

  const setOpenConversation = useCallback((id) => {
    openConversation.current = id;
    if (id) {
      setNotifications((prev) => prev.map((item) => (item.conversation === id ? { ...item, read: true } : item)));
    }
  }, []);

  const value = useMemo(() => ({
    socket,
    notifications,
    unread: notifications.filter((item) => !item.read).length,
    unreadMessages: notifications.filter((item) => !item.read && item.type === "message").length,
    markRead,
    markAllRead,
    setOpenConversation,
  }), [socket, notifications, markRead, markAllRead, setOpenConversation]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
