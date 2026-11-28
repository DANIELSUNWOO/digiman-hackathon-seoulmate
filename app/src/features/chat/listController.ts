import type { ChatApi, ChatRole } from "./api";
import type { Match } from "./model";

export type ChatListState = {
  accountId: string | null;
  role: ChatRole;
  mapId: number | undefined;
  items: Match[];
  loading: boolean;
  error: unknown | null;
};

/** Configure on every session, filter, focus and foreground change. Dispose is final. */
export class ChatListController {
  private state: ChatListState = {
    accountId: null,
    role: "traveler",
    mapId: undefined,
    items: [],
    loading: false,
    error: null,
  };
  private generation = 0;
  private abort: AbortController | null = null;
  private disposed = false;
  private account = "";
  private token = "";
  private role: ChatRole = "traveler";
  private mapId: number | undefined;
  private active = false;
  constructor(
    private api: ChatApi,
    private notify: (state: ChatListState) => void,
  ) {}
  private emit() {
    if (!this.disposed)
      this.notify({ ...this.state, items: [...this.state.items] });
  }
  configure(
    account: string | null,
    token: string | null,
    role: ChatRole,
    mapId: number | undefined,
    focused: boolean,
    foreground: boolean,
  ) {
    if (this.disposed) return;
    const identity =
      this.account !== (account ?? "") ||
      this.role !== role ||
      this.mapId !== mapId;
    const nextActive = !!account && !!token && focused && foreground;
    const changed =
      identity || this.token !== (token ?? "") || this.active !== nextActive;
    if (!changed) return;
    this.cancel();
    if (identity)
      this.state = {
        accountId: account,
        role,
        mapId,
        items: [],
        loading: false,
        error: null,
      };
    this.account = account ?? "";
    this.token = token ?? "";
    this.role = role;
    this.mapId = mapId;
    this.active = nextActive;
    this.emit();
    if (nextActive) void this.refresh();
  }
  private cancel() {
    this.generation++;
    this.abort?.abort();
    this.abort = null;
    this.state.loading = false;
  }
  async refresh() {
    if (!this.active || this.disposed) return;
    this.cancel();
    const g = this.generation,
      controller = new AbortController();
    this.abort = controller;
    this.state.loading = true;
    this.emit();
    try {
      const rows = await this.api.list(
        this.token,
        this.role,
        this.mapId,
        controller.signal,
      );
      if (g !== this.generation || this.disposed) return;
      this.state.items = rows;
      this.state.error = null;
    } catch (e) {
      if (g === this.generation && !this.disposed) this.state.error = e;
    } finally {
      if (g === this.generation && !this.disposed) {
        this.abort = null;
        this.state.loading = false;
        this.emit();
      }
    }
  }
  dispose() {
    this.cancel();
    this.active = false;
    this.disposed = true;
  }
}
