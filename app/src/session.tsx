import { Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
type AuthState = { session: Session | null; ready: boolean };
const SessionContext = createContext<AuthState>({
  session: null,
  ready: false,
});
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    ready: false,
  });
  useEffect(() => {
    if (!supabase) {
      setState({ session: null, ready: true });
      return;
    }
    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setState({ session, ready: true });
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  return (
    <SessionContext.Provider value={state}>{children}</SessionContext.Provider>
  );
}
export function useSession() {
  return useContext(SessionContext);
}
