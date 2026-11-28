import { ApiError } from "../../api";
import type { Me } from "../../users";
import {
  sameIds,
  validateSelections,
  type TagRoot,
  type TagView,
} from "./model";

export async function confirmTagSave(options: {
  wanted: number[];
  tree: TagRoot[];
  put: () => Promise<TagView[]>;
  get: () => Promise<Me>;
  isCurrent: () => boolean;
}): Promise<Me> {
  if (!options.isCurrent()) throw new ApiError("ABORTED", "Account changed");
  let uncertain = false;
  try {
    const result = await options.put();
    if (!sameIds(options.wanted, validateSelections(options.tree, result)))
      throw new ApiError("INVALID_RESPONSE", "Saved selection mismatch");
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.code === "NETWORK" || error.code === "TIMEOUT")
    )
      uncertain = true;
    else throw error;
  }
  if (!options.isCurrent()) throw new ApiError("ABORTED", "Account changed");
  const fresh = await options.get();
  if (!options.isCurrent()) throw new ApiError("ABORTED", "Account changed");
  if (
    !fresh.tags ||
    !sameIds(options.wanted, validateSelections(options.tree, fresh.tags)) ||
    !fresh.onboarding.tags
  )
    throw new ApiError(
      "INVALID_RESPONSE",
      uncertain ? "Uncertain save" : "Saved selection not confirmed",
    );
  return fresh;
}
