import type { FlowState } from "../../authFlow";
import type { ChatRole } from "./api";
import type { ChatLanguage } from "./viewTypes";

/** Never use URL parameters as an account or role source. */
export function chatIdentityFromFlow(flow: FlowState): {
  accountId: string;
  token: string;
  role: ChatRole;
  language: ChatLanguage;
} | null {
  if (!flow.ready || flow.busy || !flow.session || flow.load.kind !== "ready")
    return null;
  const { session } = flow;
  const me = flow.load.me;
  if (!session.access_token || me.userId !== session.user.id) return null;
  return {
    accountId: session.user.id,
    token: session.access_token,
    role: me.role === "MATE" ? "mate" : "traveler",
    language: me.language,
  };
}
