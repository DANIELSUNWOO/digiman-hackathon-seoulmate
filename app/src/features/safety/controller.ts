import type { SafetyApi } from "./api";
import { validateReason, validateTarget, type ReportTarget } from "./model";

export type SafetyResult =
  "success" | "uncertain" | "already" | "failure" | "busy" | "stale";
const uncertainReports = new Set<string>();
const uncertainBlocks = new Set<string>();
const blockPayloads = new Map<
  string,
  { reason: string; detail: string; partnerId: string }
>();
const confirmedBlocks = new Set<string>();
const pendingOperations = new Map<string, object>();
function key(account: string, match: number) {
  return `${account.toLowerCase()}:${match}`;
}
function definite(error: unknown) {
  const e = error as { code?: string; status?: number };
  return (
    (e?.code === "HTTP" &&
      typeof e.status === "number" &&
      e.status >= 400 &&
      e.status < 500 &&
      ![408, 425, 429].includes(e.status)) ||
    e?.code === "SESSION_EXPIRED" ||
    e?.code === "CONFIG_MISSING"
  );
}
export class SafetyController {
  private revision = 0;
  private busy = false;
  private active = false;
  private scope = "";
  private binding: {
    account: string;
    token: string;
    matchId: number;
    partnerId: string;
  } | null = null;
  constructor(private api: SafetyApi) {}
  configure(
    account: string,
    token: string,
    matchId: number,
    partnerId: string,
    active: boolean,
  ) {
    const scope = JSON.stringify([account, token, matchId, partnerId, active]);
    if (scope !== this.scope) {
      this.scope = scope;
      this.revision++;
    }
    this.active =
      active &&
      !!account &&
      !!token &&
      !!partnerId &&
      Number.isSafeInteger(matchId) &&
      matchId > 0;
    this.binding = this.active ? { account, token, matchId, partnerId } : null;
  }
  invalidate() {
    this.active = false;
    this.revision++;
  }
  isReportUncertain(account: string, matchId: number) {
    return uncertainReports.has(key(account, matchId));
  }
  isBlockUnresolved(account: string, matchId: number) {
    const k = key(account, matchId);
    return uncertainBlocks.has(k) || pendingOperations.has(`block:${k}`);
  }
  isBlockConfirmed(account: string, matchId: number) {
    return confirmedBlocks.has(key(account, matchId));
  }
  getUncertainBlockPayload(
    account: string,
    matchId: number,
    partnerId: string,
  ) {
    const k = key(account, matchId);
    const saved = blockPayloads.get(k);
    return uncertainBlocks.has(k) &&
      saved?.partnerId.toLowerCase() === partnerId.toLowerCase()
      ? saved
      : null;
  }
  noteBlockConfirmed(account: string, matchId: number) {
    confirmedBlocks.add(key(account, matchId));
  }
  async report(
    account: string,
    token: string,
    matchId: number,
    target: ReportTarget,
    reason: string,
    detail: string,
    retryUncertain = false,
  ): Promise<SafetyResult> {
    validateTarget(target);
    validateReason(reason, detail);
    if (
      !this.active ||
      this.binding?.account !== account ||
      this.binding.token !== token ||
      this.binding.matchId !== matchId
    )
      return "stale";
    const k = key(account, matchId);
    const operationKey = `report:${k}`;
    if (
      this.busy ||
      pendingOperations.has(operationKey) ||
      (this.isReportUncertain(account, matchId) && !retryUncertain)
    )
      return "busy";
    const owner = {};
    pendingOperations.set(operationKey, owner);
    if (retryUncertain) uncertainReports.delete(k);
    this.busy = true;
    const revision = this.revision;
    try {
      await this.api.report(token, matchId, target, reason, detail);
      if (revision !== this.revision) uncertainReports.add(k);
      return revision === this.revision ? "success" : "stale";
    } catch (error) {
      const serverCode = (error as { serverError?: { code?: string } })
        ?.serverError?.code;
      if (serverCode === "ALREADY_REPORTED") {
        uncertainReports.add(k);
        return revision === this.revision ? "already" : "stale";
      }
      if (!definite(error)) uncertainReports.add(k);
      return revision !== this.revision
        ? "stale"
        : definite(error)
          ? "failure"
          : "uncertain";
    } finally {
      this.busy = false;
      if (pendingOperations.get(operationKey) === owner)
        pendingOperations.delete(operationKey);
    }
  }
  async block(
    account: string,
    token: string,
    matchId: number,
    partnerId: string,
    reason: string,
    detail: string,
    retryUncertain = false,
  ): Promise<SafetyResult> {
    validateReason(reason, detail);
    if (
      !this.active ||
      this.binding?.account !== account ||
      this.binding.token !== token ||
      this.binding.matchId !== matchId ||
      this.binding.partnerId !== partnerId
    )
      return "stale";
    const k = key(account, matchId);
    const operationKey = `block:${k}`;
    if (this.busy || pendingOperations.has(operationKey)) return "busy";
    const owner = {};
    pendingOperations.set(operationKey, owner);
    this.busy = true;
    const revision = this.revision;
    try {
      const retrying = uncertainBlocks.has(k) && retryUncertain;
      if (uncertainBlocks.has(k) && retryUncertain) {
        const saved = blockPayloads.get(k);
        if (
          !saved ||
          saved.partnerId.toLowerCase() !== partnerId.toLowerCase() ||
          saved.reason !== reason ||
          saved.detail !== detail
        )
          return "failure";
        try {
          if (await this.api.blocked(token, partnerId)) {
            confirmedBlocks.add(k);
            uncertainBlocks.delete(k);
            blockPayloads.delete(k);
            return revision === this.revision ? "success" : "stale";
          }
        } catch {
          return revision === this.revision ? "uncertain" : "stale";
        }
        if (revision !== this.revision || !this.active) return "stale";
        // A false read permits only the explicit, same-payload retry below.
        uncertainBlocks.delete(k);
      }
      if (!uncertainBlocks.has(k)) {
        blockPayloads.set(k, { reason, detail, partnerId });
        try {
          await this.api.block(token, matchId, reason, detail);
        } catch (error) {
          const code = (error as { serverError?: { code?: string } })
            ?.serverError?.code;
          if (definite(error) && code !== "ALREADY_BLOCKED") {
            if (retrying) uncertainBlocks.add(k);
            else blockPayloads.delete(k);
            return revision === this.revision ? "failure" : "stale";
          }
        }
        uncertainBlocks.add(k);
      }
      if (revision !== this.revision) return "stale";
      try {
        if (await this.api.blocked(token, partnerId)) {
          confirmedBlocks.add(k);
          if (revision !== this.revision) return "stale";
          uncertainBlocks.delete(k);
          blockPayloads.delete(k);
          return "success";
        }
      } catch {
        /* A failed read cannot establish the outcome. */
      }
      return revision === this.revision ? "uncertain" : "stale";
    } finally {
      this.busy = false;
      if (pendingOperations.get(operationKey) === owner)
        pendingOperations.delete(operationKey);
    }
  }
}
