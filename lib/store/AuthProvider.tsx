"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { migrateLocalDataToRemote } from "@/lib/store/migrate";
import { localStore } from "@/lib/store/local";
import { remoteStore } from "@/lib/store/remote";
import type { DataStore } from "@/lib/store/types";

export type AuthStatus = "loading" | "anon" | "authed";

type AuthContextValue = { status: AuthStatus; email: string | null; syncVersion: number };

const AuthContext = createContext<AuthContextValue>({
  status: "loading",
  email: null,
  syncVersion: 0,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [email, setEmail] = useState<string | null>(null);
  // Bumped once a post-sign-in local -> remote migration settles, so
  // components fetching from the store know to re-fetch: the very first
  // remote fetch right after sign-in can race ahead of that migration and
  // land before it's done, and nothing else would tell them data changed.
  const [syncVersion, setSyncVersion] = useState(0);
  const migratingRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    function apply(user: { email?: string | null } | null) {
      if (!active) return;
      setStatus(user ? "authed" : "anon");
      setEmail(user?.email ?? null);
      if (user && !migratingRef.current) {
        migratingRef.current = true;
        migrateLocalDataToRemote().finally(() => {
          migratingRef.current = false;
          if (active) setSyncVersion((v) => v + 1);
        });
      }
    }

    supabase.auth.getUser().then(({ data }) => apply(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => apply(session?.user ?? null));

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ status, email, syncVersion }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function storeFor(status: AuthStatus): DataStore {
  return status === "authed" ? remoteStore : localStore;
}
