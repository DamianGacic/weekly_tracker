"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { migrateLocalDataToRemote } from "@/lib/store/migrate";
import { localStore } from "@/lib/store/local";
import { remoteStore } from "@/lib/store/remote";
import type { DataStore } from "@/lib/store/types";

export type AuthStatus = "loading" | "anon" | "authed";

type AuthContextValue = { status: AuthStatus; email: string | null };

const AuthContext = createContext<AuthContextValue>({ status: "loading", email: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [email, setEmail] = useState<string | null>(null);
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

  return <AuthContext.Provider value={{ status, email }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function storeFor(status: AuthStatus): DataStore {
  return status === "authed" ? remoteStore : localStore;
}
