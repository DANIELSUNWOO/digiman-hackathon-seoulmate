import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { AuthFlow, type FlowState } from "./authFlow";
import { syncDraftAccount } from "./features/onboarding/draftStore";
import { getMe, registerUser } from "./users";
import { supabase } from "./supabase";

type Context = FlowState & { flow: AuthFlow | null };
const SessionContext = createContext<Context | null>(null);
const empty: FlowState = {
  session: null,
  ready: true,
  load: { kind: "loading" },
  busy: false,
  notice: null,
  registrationError: null,
};
const serverSnapshot: FlowState = {
  session: null,
  ready: false,
  load: { kind: "loading" },
  busy: false,
  notice: null,
  registrationError: null,
};
const getServerSnapshot = () => serverSnapshot;
const subscribeEmpty = () => () => {};
const getEmpty = () => empty;
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const flow = useMemo(
    () =>
      supabase
        ? new AuthFlow({
            auth: supabase.auth,
            getMe,
            registerUser,
            configured: !!process.env.EXPO_PUBLIC_API_BASE_URL,
          })
        : null,
    [],
  );
  const state = useSyncExternalStore(
    flow?.subscribe ?? subscribeEmpty,
    flow?.snapshot ?? getEmpty,
    getServerSnapshot,
  );
  useEffect(() => {
    syncDraftAccount(state.session?.user.id ?? null);
  }, [state.session?.user.id]);
  useEffect(() => {
    if (!supabase || !flow) return;
    flow.activate();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(flow.event);
    return () => {
      subscription.unsubscribe();
      flow.dispose();
    };
  }, [flow]);
  return (
    <SessionContext.Provider value={{ ...state, flow }}>
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("SessionProvider missing");
  return value;
}
