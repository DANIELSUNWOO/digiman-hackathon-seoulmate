import type { VisitsApi } from "./api";
import type { ReactionType, VisitRecord } from "./types";

export interface VisitActions {
  /** null이면 해제. 화면에 먼저 반영하고 실패하면 되돌린다. */
  react: (visit: VisitRecord, next: ReactionType | null) => Promise<void>;
  comment: (visitId: number, content: string) => Promise<void>;
}

export function useVisitActions(
  api: VisitsApi,
  write: (request: () => Promise<void>) => Promise<void>,
  updateVisit: (visitId: number, changes: Partial<VisitRecord>) => void,
): VisitActions {
  const react: VisitActions["react"] = async (visit, next) => {
    const { visitId, reaction: previous } = visit;
    updateVisit(visitId, { reaction: next });
    try {
      await write(() =>
        next === null
          ? api.clearReaction(visitId)
          : api.setReaction(visitId, next),
      );
    } catch (error: unknown) {
      updateVisit(visitId, { reaction: previous });
      throw error;
    }
  };

  const comment: VisitActions["comment"] = (visitId, content) =>
    write(() => api.addComment(visitId, content));

  return { react, comment };
}
