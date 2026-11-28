import { captureFilters, type Filters, type MapBrowseApi } from "./api";
import type { BrowsePage } from "./model";
export type BrowseState = {
  accountId: string | null;
  filters: Filters;
  result: BrowsePage | null;
  loading: boolean;
  error: unknown;
};
export function createBrowseController(api: MapBrowseApi) {
  const browse = api.browse.bind(api);
  let state: BrowseState = {
    accountId: null,
    filters: {},
    result: null,
    loading: false,
    error: null,
  };
  let generation = 0;
  let active: AbortController | null = null;
  let token = "";
  let disposed = false;
  const snapshot = (): BrowseState => ({
    ...state,
    filters: { ...state.filters },
    result: state.result
      ? (JSON.parse(JSON.stringify(state.result)) as BrowsePage)
      : null,
  });
  const cancel = () => {
    generation++;
    active?.abort();
    active = null;
    state = { ...state, loading: false };
  };
  async function load(page: number, append: boolean): Promise<void> {
    if (disposed || !state.accountId || !token)
      throw new Error("Account required");
    if (active) return;
    const current = ++generation;
    const controller = new AbortController();
    active = controller;
    const account = state.accountId;
    const requestToken = token;
    const filters = captureFilters(state.filters);
    state = { ...state, loading: true, error: null };
    try {
      const response = await browse(
        requestToken,
        filters,
        page,
        controller.signal,
      );
      if (current !== generation || disposed || account !== state.accountId)
        return;
      const previous = append ? (state.result?.items ?? []) : [];
      const seen = new Set(previous.map((x) => x.mapId));
      const items = [...previous];
      for (const item of response.items)
        if (!seen.has(item.mapId)) {
          seen.add(item.mapId);
          items.push(item);
        }
      state = {
        ...state,
        result: { ...response, items },
        loading: false,
        error: null,
      };
    } catch (error) {
      if (current === generation && !disposed)
        state = { ...state, loading: false, error };
    } finally {
      if (current === generation) active = null;
    }
  }
  return {
    getState: snapshot,
    setAccount(accountId: string | null, accessToken: string | null) {
      if (disposed) throw new Error("Disposed");
      if (accountId !== null && (!accountId.trim() || !accessToken?.trim()))
        throw new Error("Account and token required");
      const nextToken = accountId === null ? "" : accessToken!;
      if (accountId !== null && accountId === state.accountId) {
        if (nextToken === token) return;
        cancel();
        token = nextToken;
        return;
      }
      cancel();
      token = nextToken;
      state = {
        accountId,
        filters: {},
        result: null,
        loading: false,
        error: null,
      };
    },
    async setFilters(filters: Filters) {
      const captured = captureFilters(filters);
      cancel();
      state = { ...state, filters: captured, result: null, error: null };
      await load(0, false);
    },
    async refresh() {
      cancel();
      state = { ...state, result: null, error: null };
      await load(0, false);
    },
    async nextPage() {
      if (active || !state.result?.hasNext) return;
      await load(state.result.page + 1, true);
    },
    cancel,
    dispose() {
      cancel();
      disposed = true;
      token = "";
      state = {
        accountId: null,
        filters: {},
        result: null,
        loading: false,
        error: null,
      };
    },
  };
}
