import { ApiError, apiRequest } from "../../api";

export const GENERAL = [
  "CAFE",
  "FOOD",
  "BEAUTY",
  "SHOP",
  "WALK",
  "CULTURE",
] as const;
export const OSHI = [
  "OSHI_KPOP",
  "OSHI_ANIME",
  "OSHI_DRAMA",
  "OSHI_BASEBALL",
] as const;
export type TagDetail = { tagId: number; name: string };
export type TagItem = TagDetail & { children: TagDetail[] };
export type TagRoot = TagDetail & { category: string; children: TagItem[] };
export type TagView = TagDetail & {
  category: string;
  parentId: number;
  depth: 2 | 3;
};
const validId = (n: unknown): n is number =>
  Number.isSafeInteger(n) && (n as number) > 0;
const fail = (): never => {
  throw new ApiError("INVALID_RESPONSE", "Invalid tag response");
};
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : fail();
const name = (v: unknown): string =>
  typeof v === "string" && v.trim() ? v : fail();
const id = (v: unknown): number => (validId(v) ? v : fail());
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : fail());
export function parseTree(raw: unknown): TagRoot[] {
  const ids = new Set<number>();
  const categories = new Set<string>();
  function read(v: unknown) {
    const x = object(v);
    const tagId = id(x.tagId);
    if (ids.has(tagId)) fail();
    ids.add(tagId);
    return { tagId, name: name(x.name) };
  }
  return array(raw).map((v) => {
    const x = object(v);
    const root = read(v);
    const category = name(x.category);
    if (categories.has(category)) fail();
    categories.add(category);
    const children = array(x.children).map((c) => {
      const y = object(c);
      return {
        ...read(c),
        children: array(y.children).map((d) => {
          const o = object(d);
          if (o.children !== undefined) fail();
          return read(d);
        }),
      };
    });
    return { ...root, category, children };
  });
}
export function parseViews(raw: unknown): TagView[] {
  const ids = new Set<number>();
  return array(raw).map((v) => {
    const x = object(v);
    const tagId = id(x.tagId);
    if (ids.has(tagId)) fail();
    ids.add(tagId);
    if (x.depth !== 2 && x.depth !== 3) fail();
    return {
      tagId,
      category: name(x.category),
      name: name(x.name),
      parentId: id(x.parentId),
      depth: x.depth as 2 | 3,
    };
  });
}
export function validateSelections(
  tree: TagRoot[],
  views: TagView[],
): number[] {
  const index = new Map<
    number,
    { category: string; parentId: number; depth: number }
  >();
  tree.forEach((r) =>
    r.children.forEach((i) => {
      index.set(i.tagId, { category: r.category, parentId: r.tagId, depth: 2 });
      i.children.forEach((d) =>
        index.set(d.tagId, {
          category: r.category,
          parentId: i.tagId,
          depth: 3,
        }),
      );
    }),
  );
  return views.map((v) => {
    const expected = index.get(v.tagId);
    if (
      !expected ||
      expected.category !== v.category ||
      expected.parentId !== v.parentId ||
      expected.depth !== v.depth
    )
      fail();
    return v.tagId;
  });
}
export async function getTagTree(token: string, signal?: AbortSignal) {
  return parseTree(await apiRequest<unknown>("/tags", { signal }, token));
}
export async function putTags(
  token: string,
  ids: number[],
  signal?: AbortSignal,
) {
  const raw = object(
    await apiRequest<unknown>(
      "/users/me/tags",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: ids }),
        signal,
      },
      token,
    ),
  );
  return parseViews(raw.tags);
}
export function sameIds(a: number[], b: number[]) {
  return (
    a.length === b.length &&
    new Set(a).size === a.length &&
    a.every((x) => b.includes(x))
  );
}

// Sort by stable ID so display order changes do not invalidate an in-memory draft.
export function catalogSignature(tree: TagRoot[]): string {
  const rows: [number, number | null, string, number, string][] = [];
  tree.forEach((root) => {
    rows.push([root.tagId, null, root.category, 1, root.name]);
    root.children.forEach((item) => {
      rows.push([item.tagId, root.tagId, root.category, 2, item.name]);
      item.children.forEach((detail) =>
        rows.push([detail.tagId, item.tagId, root.category, 3, detail.name]),
      );
    });
  });
  rows.sort((a, b) => a[0] - b[0]);
  return JSON.stringify(rows);
}
