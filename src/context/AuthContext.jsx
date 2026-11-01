import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser, logout, setSessionExpiredHandler } from "@/lib/api";
import { rememberSignedIn } from "@/lib/session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    getCurrentUser()
      .then((res) => setUser(res?.data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) rememberSignedIn(Boolean(user));
  }, [ready, user]);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, ready, setUser, signOut }), [user, ready, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
