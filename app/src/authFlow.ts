import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from "@supabase/supabase-js";
import { ApiError } from "./api";
import { validateCredentials } from "./authValidation";
import { getMe, registerUser, type Me } from "./users";

type Load =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; me: Me }
  | { kind: "error"; error: unknown };
export type FlowState = {
  session: Session | null;
  ready: boolean;
  load: Load;
  busy: boolean;
  notice: "partial" | "unconfirmed" | null;
  registrationError: unknown | null;
};
type Dependencies = {
  auth: SupabaseClient["auth"];
  getMe: typeof getMe;
  registerUser: typeof registerUser;
  configured: boolean;
};
type Credentials = {
  email: string;
  password: string;
  signup: boolean;
  country: "JP" | "KR";
  confirmPassword?: string;
  agreeTerms: boolean;
};
type Result = "memberReady" | "registrationRequired" | "confirm" | "duplicate";
const changed = () => new Error("Session changed");
export class AuthFlow {
  state: FlowState = {
    session: null,
    ready: false,
    load: { kind: "loading" },
    busy: false,
    notice: null,
    registrationError: null,
  };
  private listeners = new Set<() => void>();
  private accountRevision = 0;
  private tokenRevision = 0;
  private owner = false;
  private active = true;
  private settled: { tokenRevision: number; error?: unknown } | null = null;
  private request: {
    id: string;
    token: string;
    controller: AbortController;
    promise: Promise<void>;
  } | null = null;
  constructor(private deps: Dependencies) {}
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  snapshot = () => this.state;
  private set(p: Partial<FlowState>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((fn) => fn());
  }
  dismissNotice = () => this.set({ notice: null });
  private cancelRequest() {
    const req = this.request;
    this.request = null;
    req?.controller.abort();
  }
  event = (_event: AuthChangeEvent, session: Session | null) => {
    const old = this.state.session;
    const accountChanged = old?.user.id !== session?.user.id;
    const tokenChanged = old?.access_token !== session?.access_token;
    const wasReady = !accountChanged && this.state.load.kind === "ready";
    const hadRequest = !!this.request;
    if (accountChanged) this.accountRevision++;
    if (accountChanged || tokenChanged) {
      this.tokenRevision++;
      this.settled = null;
      this.cancelRequest();
    }
    this.set({
      session,
      ready: true,
      ...(accountChanged || _event === "SIGNED_OUT"
        ? { registrationError: null }
        : {}),
      ...(accountChanged ? { load: { kind: "loading" } as Load } : {}),
    });
    if (
      !session ||
      this.owner ||
      (wasReady && !hadRequest) ||
      (!accountChanged &&
        !tokenChanged &&
        !this.request &&
        this.settled?.tokenRevision === this.tokenRevision)
    )
      return;
    if (accountChanged || tokenChanged || !this.request)
      queueMicrotask(() => {
        if (
          !this.owner &&
          this.state.session &&
          (this.request ||
            this.settled?.tokenRevision !== this.tokenRevision) &&
          (this.state.load.kind !== "ready" || hadRequest)
        )
          void this.refreshMember().catch(() => {});
      });
  };
  activate() {
    this.active = true;
  }
  dispose() {
    this.active = false;
    this.cancelRequest();
    this.tokenRevision++;
  }
  async refreshMember(): Promise<void> {
    for (;;) {
      if (!this.active) throw changed();
      const session = this.state.session;
      if (!session) throw changed();
      const account = this.accountRevision,
        token = this.tokenRevision;
      let request = this.request;
      if (
        !request ||
        request.id !== session.user.id ||
        request.token !== session.access_token
      ) {
        this.cancelRequest();
        const controller = new AbortController();
        const keep = this.state.load.kind === "ready";
        if (!keep) this.set({ load: { kind: "loading" } });
        const current = {
          id: session.user.id,
          token: session.access_token,
          controller,
          promise: Promise.resolve(),
        };
        current.promise = (async () => {
          try {
            const me = await this.deps.getMe(
              current.token,
              current.id,
              controller.signal,
            );
            if (
              account === this.accountRevision &&
              token === this.tokenRevision
            ) {
              this.settled = { tokenRevision: token };
              this.set({
                load: { kind: "ready", me },
                registrationError: null,
              });
            }
          } catch (error) {
            if (
              account !== this.accountRevision ||
              token !== this.tokenRevision ||
              controller.signal.aborted
            )
              return;
            if (
              error instanceof ApiError &&
              error.status === 404 &&
              error.serverError?.code === "USER_NOT_REGISTERED"
            ) {
              this.settled = { tokenRevision: token };
              this.set({ load: { kind: "missing" } });
            } else {
              this.settled = { tokenRevision: token, error };
              this.set({ load: { kind: "error", error } });
              throw error;
            }
          } finally {
            if (this.request === current) this.request = null;
          }
        })();
        this.request = request = current;
      }
      await request.promise;
      if (
        account !== this.accountRevision ||
        this.state.session?.user.id !== session.user.id
      )
        throw changed();
      if (token !== this.tokenRevision) {
        const settled = this.settled;
        if (!this.request && settled?.tokenRevision === this.tokenRevision) {
          if ("error" in settled) throw settled.error;
          return;
        }
        continue;
      }
      return;
    }
  }
  private async registerOwned(
    country: "JP" | "KR",
    agreeTerms: boolean,
  ): Promise<void> {
    if (!agreeTerms) throw new Error("Terms agreement required");
    if (this.state.load.kind !== "missing")
      throw new Error("Member registration is not required");
    const session = this.state.session;
    if (!session) throw changed();
    const account = this.accountRevision,
      id = session.user.id;
    this.set({ registrationError: null });
    let postError: unknown;
    try {
      try {
        await this.deps.registerUser(session.access_token, country);
      } catch (error) {
        if (!(
          error instanceof ApiError &&
          ((error.status === 409 &&
            error.serverError?.code === "USER_ALREADY_REGISTERED") ||
            error.code === "NETWORK" ||
            error.code === "TIMEOUT")
        ))
          throw error;
        postError = error;
      }
      if (
        account !== this.accountRevision ||
        this.state.session?.user.id !== id
      )
        throw changed();
      await this.refreshMember();
      if (
        account !== this.accountRevision ||
        this.state.session?.user.id !== id
      )
        throw changed();
      if (this.snapshot().load.kind !== "ready")
        throw postError ?? new Error("Member registration not confirmed");
    } catch (error) {
      if (
        account === this.accountRevision &&
        this.state.session?.user.id === id &&
        this.snapshot().load.kind === "missing"
      )
        this.set({ registrationError: error });
      throw error;
    }
  }
  async register(country: "JP" | "KR", agreeTerms: boolean): Promise<void> {
    if (this.owner) throw new Error("Authentication operation in progress");
    this.owner = true;
    this.set({ busy: true });
    try {
      await this.registerOwned(country, agreeTerms);
    } finally {
      this.owner = false;
      this.set({ busy: false });
      this.resume();
    }
  }
  private resume() {
    if (
      this.active &&
      this.state.session &&
      this.state.load.kind === "loading" &&
      !this.request
    )
      queueMicrotask(() => {
        if (!this.owner) void this.refreshMember().catch(() => {});
      });
  }
  async authenticate(input: Credentials): Promise<Result> {
    if (this.owner) throw new Error("Authentication operation in progress");
    if (this.state.session) throw new Error("Active session exists");
    if (
      validateCredentials(
        input.email,
        input.password,
        input.signup,
        input.confirmPassword ?? "",
        input.agreeTerms,
      )
    )
      throw new Error("Invalid credentials");
    if (input.signup && !this.deps.configured)
      throw new ApiError("CONFIG_MISSING", "API is not configured");
    this.owner = true;
    this.set({ busy: true });
    try {
      const credentials = {
        email: input.email.trim(),
        password: input.password,
      };
      const result = input.signup
        ? await this.deps.auth.signUp(credentials)
        : await this.deps.auth.signInWithPassword(credentials);
      if (result.error) {
        if (
          result.error.code === "user_already_exists" ||
          result.error.code === "email_exists"
        )
          return "duplicate";
        throw result.error;
      }
      const session = result.data.session;
      if (!session) return "confirm";
      if (
        !result.data.user ||
        result.data.user.id !== session.user.id ||
        this.snapshot().session?.user.id !== session.user.id
      )
        throw changed();
      const account = this.accountRevision;
      await this.refreshMember();
      if (account !== this.accountRevision) throw changed();
      if (this.state.load.kind === "missing") {
        if (!input.signup) return "registrationRequired";
        await this.registerOwned(input.country, input.agreeTerms);
      }
      if (this.state.load.kind !== "ready")
        throw new Error("Member state unavailable");
      return "memberReady";
    } finally {
      this.owner = false;
      this.set({ busy: false });
      this.resume();
    }
  }
  async logout(): Promise<void> {
    if (this.owner) throw new Error("Authentication operation in progress");
    this.owner = true;
    this.set({ busy: true, notice: null, registrationError: null });
    const id = this.state.session?.user.id,
      hadToken = !!this.state.session?.access_token;
    const account = this.accountRevision;
    let error: unknown;
    try {
      const result = await this.deps.auth.signOut({ scope: "local" });
      error = result.error;
    } catch (e) {
      error = e;
    }
    try {
      const result = await this.deps.auth.getSession();
      const current = this.state.session;
      if (
        (current &&
          (current.user.id !== id || this.accountRevision !== account)) ||
        this.accountRevision > account + (id ? 1 : 0)
      )
        return;
      if (result.error || result.data.session)
        this.set({ notice: "unconfirmed" });
      else if (error || !hadToken) this.set({ notice: "partial" });
    } catch {
      if (
        this.accountRevision <= account + (id ? 1 : 0) &&
        (!this.state.session ||
          (this.state.session.user.id === id &&
            this.accountRevision === account))
      )
        this.set({ notice: "unconfirmed" });
    } finally {
      this.owner = false;
      this.set({ busy: false });
      this.resume();
    }
  }
}
