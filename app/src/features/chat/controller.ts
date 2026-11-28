import type { ChatApi, ChatRole } from "./api";
import type { MatchDetail } from "./model";
import type { ChatMessageView } from "./viewTypes";
import {
  chatSendUncertain,
  clearChatDraft,
  getChatDraft,
  setChatDraft,
  setChatSendUncertain,
  syncChatDraftAccount,
} from "./draft";

export type RoomState = {
  accountId: string | null;
  matchId: number | null;
  detail: MatchDetail | null;
  messages: ChatMessageView[];
  draft: string;
  loading: boolean;
  loadingMore: boolean;
  backlog: boolean;
  sending: boolean;
  opening: boolean;
  sendUncertain: boolean;
  openUncertain: boolean;
  error: unknown | null;
};
const uncertain = (e: unknown) => {
  if (!e || typeof e !== "object") return true;
  const value = e as { code?: unknown; status?: unknown };
  if (
    value.code === "HTTP" &&
    typeof value.status === "number" &&
    value.status >= 400 &&
    value.status < 500
  )
    return false;
  if (["SESSION_EXPIRED", "CONFIG_MISSING"].includes(String(value.code)))
    return false;
  return true;
};
/** Account, token, focus and foreground are supplied explicitly by the integration. */
export class ChatRoomController {
  private state: RoomState = {
    accountId: null,
    matchId: null,
    detail: null,
    messages: [],
    draft: "",
    loading: false,
    loadingMore: false,
    backlog: false,
    sending: false,
    opening: false,
    sendUncertain: false,
    openUncertain: false,
    error: null,
  };
  private generation = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private abort: AbortController | null = null;
  private active = false;
  private account = "";
  private token = "";
  private role: ChatRole = "traveler";
  private matchId = 0;
  private pendingWrite = false;
  private disposed = false;
  private forwardCursor: number | undefined;
  private auditCursor: number | undefined;
  private refreshAgain = false;
  private writeError: unknown | null = null;
  constructor(
    private api: ChatApi,
    private notify: (state: RoomState) => void,
    private intervalMs = 8000,
  ) {}
  private emit() {
    if (this.disposed) return;
    this.notify({ ...this.state, messages: [...this.state.messages] });
  }
  configure(
    account: string | null,
    token: string | null,
    role: ChatRole,
    matchId: number,
    focused: boolean,
    foreground: boolean,
  ) {
    if (this.disposed) return;
    const identityChanged =
      this.account !== (account ?? "") ||
      this.matchId !== matchId ||
      this.role !== role;
    const tokenChanged = this.token !== (token ?? "");
    if (identityChanged || tokenChanged) {
      this.writeError = null;
      this.state.error = null;
    }
    const nextActive = !!account && !!token && focused && foreground;
    if (identityChanged || tokenChanged || this.active !== nextActive)
      this.stop();
    if (identityChanged) {
      syncChatDraftAccount(account);
      this.state = {
        accountId: account,
        matchId: account ? matchId : null,
        detail: null,
        messages: [],
        draft: account ? getChatDraft(account, matchId) : "",
        loading: false,
        loadingMore: false,
        backlog: false,
        sending: false,
        opening: false,
        sendUncertain: account ? chatSendUncertain(account, matchId) : false,
        openUncertain: false,
        error: null,
      };
      this.forwardCursor = undefined;
      this.auditCursor = undefined;
    }
    this.account = account ?? "";
    this.token = token ?? "";
    this.role = role;
    this.matchId = matchId;
    this.active = nextActive;
    this.emit();
    if (nextActive && !this.timer && !this.inFlight) void this.refresh();
  }
  stop() {
    if (this.state.sending) {
      this.state.sendUncertain = true;
      setChatSendUncertain(this.account, this.matchId, true);
    }
    if (this.state.opening) this.state.openUncertain = true;
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.abort?.abort();
    this.abort = null;
    this.inFlight = false;
    this.refreshAgain = false;
    this.active = false;
    this.state.loading = false;
    this.state.loadingMore = false;
    this.state.sending = false;
    this.state.opening = false;
  }
  dispose() {
    this.stop();
    this.disposed = true;
  }
  changeDraft(text: string) {
    if (this.disposed) return;
    this.state.draft = text;
    setChatDraft(this.account, this.matchId, text);
    this.emit();
  }
  /** Only call after the user has reviewed the room and explicitly chooses to retry. */
  acknowledgeUncertainSend() {
    if (!this.disposed && !this.pendingWrite) {
      this.state.sendUncertain = false;
      setChatSendUncertain(this.account, this.matchId, false);
      this.emit();
    }
  }
  private merge(rows: ChatMessageView[]) {
    const byId = new Map(this.state.messages.map((m) => [m.messageId, m]));
    for (const m of rows) byId.set(m.messageId, m);
    this.state.messages = [...byId.values()].sort(
      (a, b) => a.messageId - b.messageId,
    );
  }
  private schedule(g: number, delay = this.intervalMs) {
    if (this.active && this.generation === g && !this.timer)
      this.timer = setTimeout(() => {
        this.timer = null;
        void this.refresh(true);
      }, delay);
  }
  private validatePage(rows: ChatMessageView[], cursor: number | undefined) {
    let previous = cursor ?? 0;
    if (rows.length > 50) throw new Error("Invalid message page");
    for (const row of rows) {
      if (!Number.isSafeInteger(row.messageId) || row.messageId <= previous)
        throw new Error("Invalid message cursor");
      const sender = row.senderId.toLowerCase();
      const actor = this.account.toLowerCase();
      const partner = this.state.detail?.partner.userId.toLowerCase();
      if (
        (sender !== actor && sender !== partner) ||
        row.mine !== (sender === actor)
      )
        throw new Error("Invalid message sender");
      previous = row.messageId;
    }
  }
  async refresh(silent = false) {
    if (!this.active || this.disposed) return;
    if (this.inFlight) {
      this.refreshAgain = true;
      return;
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const g = this.generation,
      abort = new AbortController();
    this.abort = abort;
    this.inFlight = true;
    this.state.loading = !silent || !this.state.detail;
    this.emit();
    try {
      const detail = await this.api.detail(
        this.token,
        this.role,
        this.matchId,
        abort.signal,
      );
      if (g !== this.generation) return;
      this.state.detail = detail;
      if (!this.pendingWrite) this.state.openUncertain = false;
      const allowed =
        detail.chatStatus === "OPEN" &&
        (detail.status === "ON_COURSE" || detail.status === "COMPLETED");
      if (allowed) {
        let cursor = this.forwardCursor;
        this.state.loadingMore = cursor !== undefined;
        let backlog = false;
        for (let pages = 0; pages < 10; pages++) {
          const rows = await this.api.messages(
            this.token,
            this.matchId,
            cursor,
            abort.signal,
          );
          if (g !== this.generation) return;
          this.validatePage(rows, cursor);
          this.merge(rows);
          if (rows.length) cursor = rows[rows.length - 1].messageId;
          this.forwardCursor = cursor;
          backlog = rows.length === 50;
          if (!backlog) break;
        }
        this.state.backlog = backlog;
        // One historical page per normal cycle, cycling from the beginning.
        if (!backlog && this.state.messages.length) {
          const audit = await this.api.messages(
            this.token,
            this.matchId,
            this.auditCursor,
            abort.signal,
          );
          if (g !== this.generation) return;
          this.validatePage(audit, this.auditCursor);
          this.merge(audit);
          this.auditCursor =
            audit.length === 50 ? audit[audit.length - 1].messageId : undefined;
        }
      } else {
        this.state.messages = [];
        this.forwardCursor = undefined;
        this.auditCursor = undefined;
        this.state.backlog = false;
      }
      this.state.error = this.writeError;
    } catch (e) {
      if (g === this.generation) {
        this.state.error = e;
        this.state.detail = null;
        const status =
          e && typeof e === "object"
            ? (e as { status?: unknown }).status
            : undefined;
        const serverCode =
          e && typeof e === "object"
            ? (e as { serverError?: { code?: unknown } }).serverError?.code
            : undefined;
        if (
          status === 403 ||
          status === 404 ||
          serverCode === "CHAT_NOT_OPEN"
        ) {
          this.state.messages = [];
          this.forwardCursor = undefined;
          this.auditCursor = undefined;
          this.state.backlog = false;
        }
      }
    } finally {
      if (g === this.generation) {
        this.inFlight = false;
        this.abort = null;
        this.state.loading = false;
        this.state.loadingMore = false;
        this.emit();
        if (this.refreshAgain) {
          this.refreshAgain = false;
          void this.refresh();
        } else
          this.schedule(
            g,
            this.state.backlog && !this.state.error ? 100 : this.intervalMs,
          );
      }
    }
  }
  async send() {
    const text = this.state.draft.trim();
    if (
      !this.active ||
      this.pendingWrite ||
      this.state.sendUncertain ||
      this.state.detail?.chatStatus !== "OPEN" ||
      this.state.detail.status !== "ON_COURSE" ||
      !text ||
      text.length > 500
    )
      return;
    // A focused send takes precedence over an in-flight poll. Invalidate the
    // read generation before aborting so even a non-cooperative response is ignored.
    if (this.inFlight) {
      this.generation++;
      this.abort?.abort();
      this.abort = null;
      this.inFlight = false;
      this.refreshAgain = false;
      this.state.loading = false;
      this.state.loadingMore = false;
    }
    const g = this.generation,
      account = this.account,
      matchId = this.matchId;
    this.pendingWrite = true;
    this.writeError = null;
    this.state.error = null;
    this.state.sending = true;
    this.state.sendUncertain = false;
    this.emit();
    let confirmed = false;
    try {
      const row = await this.api.send(this.token, matchId, text);
      if (g !== this.generation) return;
      if (
        !row.mine ||
        row.senderId.toLowerCase() !== account.toLowerCase() ||
        row.content.original !== text
      ) {
        const error = new Error("Invalid send response");
        error.name = "InvalidChatResponse";
        throw error;
      }
      this.merge([row]);
      confirmed = true;
      if (this.state.draft.trim() === text) {
        this.state.draft = "";
        clearChatDraft(account, matchId);
      }
    } catch (e) {
      if (g === this.generation) {
        this.state.error = e;
        this.writeError = e;
        this.state.sendUncertain = uncertain(e);
        setChatSendUncertain(account, matchId, this.state.sendUncertain);
      }
    } finally {
      this.pendingWrite = false;
      if (g === this.generation) {
        this.state.sending = false;
        if (!confirmed) this.state.detail = null;
        this.emit();
        void this.refresh();
      }
    }
  }
  async open() {
    if (
      !this.active ||
      this.pendingWrite ||
      this.state.openUncertain ||
      this.state.detail?.status !== "ON_COURSE" ||
      !this.state.detail.chat.canOpen
    )
      return;
    const g = this.generation,
      account = this.account,
      matchId = this.matchId;
    this.pendingWrite = true;
    this.writeError = null;
    this.state.error = null;
    this.state.opening = true;
    this.state.openUncertain = false;
    this.emit();
    try {
      await this.api.open(this.token, this.matchId);
    } catch (e) {
      if (g === this.generation) {
        this.state.error = e;
        this.writeError = e;
        this.state.openUncertain = uncertain(e);
      }
    } finally {
      this.pendingWrite = false;
      if (g === this.generation) {
        this.state.opening = false;
        this.emit();
      }
      if (this.active && this.account === account && this.matchId === matchId) {
        this.state.detail = null;
        void this.refresh();
      }
    }
  }
}
