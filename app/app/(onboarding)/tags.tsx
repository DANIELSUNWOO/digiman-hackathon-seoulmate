import { LoadingSkeleton } from "../../src/loading";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeft, MagnifyingGlass, X } from "phosphor-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ApiError } from "../../src/api";
import {
  nextRouteAfterTagsSave,
  parseOnboardingOrigin,
  previousOnboardingRoute,
  useOnboardingBackHandler,
  useOnboardingDismiss,
} from "../../src/features/onboarding/navigation";
import {
  clearTagDraft,
  beginTagReselection,
  isTagReselection,
  getTagDraft,
  getTagDraftSignature,
  setTagDraft,
  syncTagDraftAccount,
} from "../../src/features/tags/draft";
import {
  GENERAL,
  catalogSignature,
  OSHI,
  getTagTree,
  putTags,
  validateSelections,
  type TagItem,
  type TagRoot,
} from "../../src/features/tags/model";
import { confirmTagSave } from "../../src/features/tags/saveFlow";
import { TagCategoryIcon } from "../../src/features/tags/tagAssets";
import { useSession } from "../../src/session";
import { theme } from "../../src/theme";
import {
  AppBar,
  BottomSheet,
  Button,
  Chip,
  ErrorNotice,
  Input,
  Label,
  Notice,
  ProgressTracker,
  Screen,
  ScreenFooter,
  TextLink,
  useFontFamily,
} from "../../src/ui";
import { getMe, onboardingRouteFor, nextStep } from "../../src/users";

const MATE_STEPS = ["프로필", "취향", "지도"];
const TRAVELER_STEPS = ["本人確認", "基本情報", "好み", "条件", "日程"];

function oshiSearchPlaceholder(category: string, ko: boolean): string {
  if (category === "OSHI_KPOP") return ko ? "그룹 검색" : "グループを検索";
  if (category === "OSHI_DRAMA")
    return ko ? "작품이나 배우 검색" : "作品・俳優を検索";
  if (category === "OSHI_ANIME")
    return ko ? "작품이나 아티스트 검색" : "作品・アーティストを検索";
  if (category === "OSHI_BASEBALL")
    return ko ? "응원팀 검색" : "応援チームを検索";
  return ko ? "검색" : "検索";
}

function summarizeOshiCategory(
  root: TagRoot,
  selectedIds: number[],
  ko: boolean,
): string {
  const parts: string[] = [];
  for (const item of root.children) {
    if (item.children.length > 0) {
      const selectedMembers = item.children.filter((d) =>
        selectedIds.includes(d.tagId),
      );
      const groupSelected = selectedIds.includes(item.tagId);
      if (groupSelected || selectedMembers.length > 0) {
        const labels = selectedMembers.map((d) => d.name);
        if (groupSelected) labels.unshift(ko ? "올팬" : "箱推し");
        parts.push(
          ko
            ? `${item.name}(${labels.join(", ")})`
            : `${item.name}（${labels.join("・")}）`,
        );
      }
    } else if (selectedIds.includes(item.tagId)) {
      parts.push(item.name);
    }
  }
  return parts.join(ko ? ", " : "、");
}

export default function TagsScreen() {
  const router = useRouter();
  const dismiss = useOnboardingDismiss();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const origin = parseOnboardingOrigin(from);
  const { session, load, flow } = useSession();
  const me = load.kind === "ready" ? load.me : null;
  const canLoad = !!me?.onboarding.profile && !!me?.onboarding.verified;
  const userId = session?.user.id;
  const ko = me?.language === "ko";
  const language = ko ? "ko" : "ja";
  const subTitleFont = useFontFamily("bold", language);
  const subDescFont = useFontFamily("regular", language);
  const sheetSubLabelFont = useFontFamily("semibold", language);

  const [tree, setTree] = useState<TagRoot[] | null>(null);
  const [ids, setIds] = useState<number[]>([]);
  const [noOshi, setNoOshi] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const discardOld = useRef(false);
  const [loadIssue, setLoadIssue] = useState<
    "selection" | "empty" | "invalid" | "network" | null
  >(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<TagItem | null>(null);
  const [detailDraft, setDetailDraft] = useState<number[]>([]);
  const [detailWasSelected, setDetailWasSelected] = useState(false);
  const detailOpenRef = useRef(false);

  const [oshiOpen, setOshiOpen] = useState(false);
  const [activeOshi, setActiveOshi] = useState<TagRoot | null>(null);
  const [oshiDraft, setOshiDraft] = useState<number[]>([]);
  const [oshiExpandedGroups, setOshiExpandedGroups] = useState<number[]>([]);
  const [oshiWasSelected, setOshiWasSelected] = useState(false);
  const [search, setSearch] = useState("");
  const oshiOpenRef = useRef(false);

  const abortRef = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const savingRef = useRef(false);
  const alive = () =>
    mounted.current && flow?.snapshot().session?.user.id === userId;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      detailOpenRef.current = false;
      oshiOpenRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    detailOpenRef.current = false;
    oshiOpenRef.current = false;
    setDetailOpen(false);
    setDetail(null);
    setDetailDraft([]);
    setDetailWasSelected(false);
    setOshiOpen(false);
    setActiveOshi(null);
    setOshiDraft([]);
    setOshiExpandedGroups([]);
    setOshiWasSelected(false);
    setSearch("");
  }, [userId]);

  useEffect(() => {
    if (
      !userId ||
      !session ||
      !me ||
      !me.onboarding.profile ||
      !me.onboarding.verified
    )
      return;
    syncTagDraftAccount(userId);
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setError("");
    setLoadIssue(null);
    void Promise.all([
      getTagTree(session.access_token, controller.signal),
      getMe(session.access_token, userId, controller.signal),
    ])
      .then(([nextTree, fresh]) => {
        if (!current || !alive()) return;
        if (
          !nextTree.length ||
          nextTree.every((root) => root.children.length === 0)
        )
          throw new ApiError("INVALID_RESPONSE", "Empty tag tree");
        const categories = new Set(nextTree.map((root) => root.category));
        if (
          [...GENERAL, ...OSHI, "AREA"].some(
            (category) => !categories.has(category),
          )
        )
          throw new ApiError("INVALID_RESPONSE", "Missing tag categories");
        if (!fresh.tags)
          throw new ApiError("INVALID_RESPONSE", "Missing selected tags");
        let restored: number[] = [];
        if (!discardOld.current && !isTagReselection(userId)) {
          try {
            restored = validateSelections(nextTree, fresh.tags);
          } catch {
            throw new ApiError("INVALID_RESPONSE", "Invalid saved selection");
          }
        }
        const draft = discardOld.current ? null : getTagDraft(userId);
        const signature = catalogSignature(nextTree);
        if (draft && getTagDraftSignature(userId) !== signature)
          throw new ApiError("INVALID_RESPONSE", "Old draft tags");
        if (draft) {
          const valid = new Set(
            nextTree.flatMap((r) =>
              r.children.flatMap((i) => [
                i.tagId,
                ...i.children.map((d) => d.tagId),
              ]),
            ),
          );
          if (draft.some((id) => !valid.has(id)))
            throw new ApiError("INVALID_RESPONSE", "Old draft tags");
        }
        if (discardOld.current) {
          beginTagReselection(userId, signature);
          discardOld.current = false;
        }
        const selected = draft ?? restored;
        setTree(nextTree);
        setIds(selected);
        setNoOshi(false);
        setLoading(false);
      })
      .catch((failure: unknown) => {
        if (current && alive()) {
          setTree(null);
          setLoading(false);
          const reason =
            failure instanceof ApiError &&
            ["Invalid saved selection", "Old draft tags"].includes(
              failure.message,
            )
              ? "selection"
              : failure instanceof ApiError &&
                  failure.message === "Empty tag tree"
                ? "empty"
                : failure instanceof ApiError &&
                    failure.code === "INVALID_RESPONSE"
                  ? "invalid"
                  : "network";
          setLoadIssue(reason);
          setError(
            reason === "selection"
              ? ko
                ? "이전 선택에 현재 없는 취향이 있습니다. 다시 불러오거나 선택을 지우고 다시 골라 주세요."
                : "以前の選択に現在ない項目があります。再読込するか選び直してください。"
              : reason === "empty"
                ? ko
                  ? "선택할 취향 목록이 비어 있습니다. 나중에 다시 불러와 주세요."
                  : "選べる好みがありません。後でもう一度お試しください。"
                : reason === "invalid"
                  ? ko
                    ? "취향 정보 형식이 올바르지 않습니다. 다시 불러와 주세요."
                    : "好みのデータを確認できません。再読込してください。"
                  : ko
                    ? "취향 정보를 불러오지 못했습니다. 다시 시도해 주세요."
                    : "好みを読み込めません。もう一度お試しください。",
          );
        }
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [userId, reload, canLoad]);

  const general = useMemo(
    () =>
      tree?.filter((r) =>
        (GENERAL as readonly string[]).includes(r.category),
      ) ?? [],
    [tree],
  );
  const oshis = useMemo(
    () =>
      tree?.filter((r) => (OSHI as readonly string[]).includes(r.category)) ??
      [],
    [tree],
  );
  const area = tree?.find((r) => r.category === "AREA");
  const hasGeneral = general.some((r) =>
    r.children.some(
      (i) =>
        ids.includes(i.tagId) || i.children.some((d) => ids.includes(d.tagId)),
    ),
  );
  const hasAnyOshiSelection = oshis.some((r) =>
    r.children.some(
      (i) =>
        ids.includes(i.tagId) || i.children.some((d) => ids.includes(d.tagId)),
    ),
  );

  function closeDetailSheet() {
    detailOpenRef.current = false;
    setDetailOpen(false);
  }

  function handleDetailDismissed() {
    if (!mounted.current || detailOpenRef.current) return;
    setDetail(null);
    setDetailDraft([]);
    setDetailWasSelected(false);
  }

  function closeOshiSheet() {
    oshiOpenRef.current = false;
    setOshiOpen(false);
  }

  function handleOshiDismissed() {
    if (!mounted.current || oshiOpenRef.current) return;
    setActiveOshi(null);
    setOshiDraft([]);
    setOshiExpandedGroups([]);
    setOshiWasSelected(false);
    setSearch("");
  }

  function handleBack() {
    if (detailOpen) {
      closeDetailSheet();
      return;
    }
    if (oshiOpen) {
      closeOshiSheet();
      return;
    }
    abortRef.current?.abort();
    const role = me?.role ?? "TRAVELER";
    dismiss(previousOnboardingRoute(role, "tags", origin));
  }

  useOnboardingBackHandler(() => {
    handleBack();
    return true;
  });

  function update(next: number[]) {
    if (!userId || savingRef.current) return;
    setIds(next);
    if (tree) setTagDraft(userId, next, catalogSignature(tree));
  }

  function toggle(id: number) {
    update(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }

  function openDetailSheet(item: TagItem) {
    if (!oshiOpenRef.current && activeOshi) {
      setActiveOshi(null);
      setOshiDraft([]);
      setOshiExpandedGroups([]);
      setOshiWasSelected(false);
      setSearch("");
    }
    const itemIds = [item.tagId, ...item.children.map((d) => d.tagId)];
    const current = itemIds.filter((id) => ids.includes(id));
    detailOpenRef.current = true;
    setDetail(item);
    setDetailDraft(current);
    setDetailWasSelected(current.length > 0);
    setDetailOpen(true);
  }

  function toggleItem(item: TagItem) {
    if (item.children.length) openDetailSheet(item);
    else toggle(item.tagId);
  }

  function commitDetailSheet() {
    if (!detail || detailDraft.length === 0) return;
    const itemSet = new Set([
      detail.tagId,
      ...detail.children.map((d) => d.tagId),
    ]);
    const rest = ids.filter((id) => !itemSet.has(id));
    update([...rest, ...detailDraft]);
    closeDetailSheet();
  }

  function removeDetailSelection() {
    if (!detail) return;
    const removed = new Set([
      detail.tagId,
      ...detail.children.map((d) => d.tagId),
    ]);
    update(ids.filter((id) => !removed.has(id)));
    closeDetailSheet();
  }

  function openOshiSheet(root: TagRoot) {
    if (!detailOpenRef.current && detail) {
      setDetail(null);
      setDetailDraft([]);
      setDetailWasSelected(false);
    }
    const rootSet = new Set(
      root.children.flatMap((i) => [
        i.tagId,
        ...i.children.map((d) => d.tagId),
      ]),
    );
    const current = ids.filter((id) => rootSet.has(id));
    const expandedGroups = root.children
      .filter(
        (i) =>
          i.children.length > 0 &&
          (current.includes(i.tagId) ||
            i.children.some((d) => current.includes(d.tagId))),
      )
      .map((i) => i.tagId);
    setNoOshi(false);
    oshiOpenRef.current = true;
    setActiveOshi(root);
    setOshiDraft(current);
    setOshiExpandedGroups(expandedGroups);
    setOshiWasSelected(current.length > 0);
    setSearch("");
    setOshiOpen(true);
  }

  function toggleOshiItem(item: TagItem) {
    if (item.children.length === 0) {
      setOshiDraft((prev) =>
        prev.includes(item.tagId)
          ? prev.filter((id) => id !== item.tagId)
          : [...prev, item.tagId],
      );
      return;
    }

    const memberIds = new Set(item.children.map((d) => d.tagId));
    const isExpandedOrSelected =
      oshiExpandedGroups.includes(item.tagId) ||
      oshiDraft.includes(item.tagId) ||
      item.children.some((d) => oshiDraft.includes(d.tagId));

    if (isExpandedOrSelected) {
      setOshiExpandedGroups((prev) => prev.filter((id) => id !== item.tagId));
      setOshiDraft((prev) =>
        prev.filter((id) => id !== item.tagId && !memberIds.has(id)),
      );
      return;
    }

    setOshiExpandedGroups((prev) => [...prev, item.tagId]);
    setOshiDraft((prev) =>
      prev.includes(item.tagId) ? prev : [...prev, item.tagId],
    );
  }

  function toggleOshiMember(groupId: number, memberId: number) {
    setOshiExpandedGroups((prev) =>
      prev.includes(groupId) ? prev : [...prev, groupId],
    );
    setOshiDraft((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  }

  function commitOshiSheet() {
    if (!activeOshi || oshiDraft.length === 0) return;
    const rootSet = new Set(
      activeOshi.children.flatMap((i) => [
        i.tagId,
        ...i.children.map((d) => d.tagId),
      ]),
    );
    const rest = ids.filter((id) => !rootSet.has(id));
    update([...rest, ...oshiDraft]);
    setNoOshi(false);
    closeOshiSheet();
  }

  function removeOshiCategory() {
    if (!activeOshi) return;
    const rootSet = new Set(
      activeOshi.children.flatMap((i) => [
        i.tagId,
        ...i.children.map((d) => d.tagId),
      ]),
    );
    update(ids.filter((id) => !rootSet.has(id)));
    closeOshiSheet();
  }

  function clearAllOshi() {
    if (savingRef.current) return;
    if (noOshi && !hasAnyOshiSelection) {
      setNoOshi(false);
      return;
    }
    const excluded = new Set(
      oshis.flatMap((r) =>
        r.children.flatMap((i) => [i.tagId, ...i.children.map((d) => d.tagId)]),
      ),
    );
    update(ids.filter((id) => !excluded.has(id)));
    setNoOshi(true);
  }

  async function save() {
    if (!session || !userId || !tree || !hasGeneral || savingRef.current)
      return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    const wanted = [...ids];
    const controller = new AbortController();
    abortRef.current = controller;
    const isCurrentSave = () =>
      alive() && abortRef.current === controller && !controller.signal.aborted;
    try {
      const latestTree = await getTagTree(
        session.access_token,
        controller.signal,
      );
      if (!isCurrentSave()) return;
      if (catalogSignature(latestTree) !== catalogSignature(tree)) {
        setTagDraft(userId, wanted, catalogSignature(tree));
        setReload((value) => value + 1);
        return;
      }
      const hadTagsBefore = !!me?.onboarding.tags;
      const fresh = await confirmTagSave({
        wanted,
        tree,
        put: () => putTags(session.access_token, wanted, controller.signal),
        get: () => getMe(session.access_token, userId, controller.signal),
        isCurrent: isCurrentSave,
      });
      if (!isCurrentSave()) return;
      await flow?.refreshMember();
      if (!isCurrentSave()) return;
      const snap = flow?.snapshot();
      if (snap?.load.kind !== "ready")
        throw new ApiError("NETWORK", "Member refresh failed");
      clearTagDraft(userId);
      const target = nextRouteAfterTagsSave(fresh, { origin, hadTagsBefore });
      if (target === "/account") dismiss(target);
      else router.replace(target);
    } catch {
      if (isCurrentSave())
        setError(
          ko
            ? "저장 상태를 확인하지 못했습니다. 선택을 유지했으니 다시 시도해 주세요."
            : "保存状態を確認できません。選択は保持されています。もう一度お試しください。",
        );
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        savingRef.current = false;
        if (alive()) setSaving(false);
      }
    }
  }

  if (!session || !me) return null;
  if (!me.onboarding.verified || !me.onboarding.profile)
    return <Redirect href={onboardingRouteFor(nextStep(me))} />;

  const steps = ko ? MATE_STEPS : TRAVELER_STEPS;
  const chip = (item: TagItem) => {
    const selectedDetails = item.children.filter((d) => ids.includes(d.tagId));
    const isSelected = ids.includes(item.tagId) || selectedDetails.length > 0;
    const sublabel =
      isSelected && selectedDetails.length > 0
        ? ko
          ? ` (${selectedDetails.map((d) => d.name).join(", ")})`
          : ` · ${selectedDetails.map((d) => d.name).join("・")}`
        : undefined;
    return (
      <Chip
        key={item.tagId}
        label={item.name}
        sublabel={sublabel}
        showChevron={item.children.length > 0 && !isSelected}
        language={language}
        selected={isSelected}
        disabled={saving}
        onPress={() => toggleItem(item)}
      />
    );
  };

  const trimmedSearch = search.trim().toLocaleLowerCase();
  const filteredOshiItems = activeOshi
    ? activeOshi.children.filter(
        (i) =>
          !trimmedSearch ||
          i.name.toLocaleLowerCase().includes(trimmedSearch) ||
          i.children.some((d) =>
            d.name.toLocaleLowerCase().includes(trimmedSearch),
          ),
      )
    : [];

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.body}>
        {origin === "account" ? (
          <AppBar
            title={ko ? "취향 수정" : "好みを編集"}
            language={language}
            backLabel={ko ? "뒤로" : "戻る"}
            backDisabled={saving}
            onBack={handleBack}
          />
        ) : (
          <View style={styles.onboardingTop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ko ? "뒤로" : "戻る"}
              disabled={saving}
              onPress={handleBack}
              style={styles.backButton}
            >
              <CaretLeft
                size={theme.size.icon}
                color={theme.color.labelNormal}
              />
            </Pressable>
            <ProgressTracker
              steps={steps}
              currentIndex={ko ? 1 : 2}
              language={language}
            />
          </View>
        )}

        {loading ? (
          <LoadingSkeleton
            shape="chips"
            label={ko ? "취향을 불러오는 중입니다" : "好みを読み込んでいます"}
          />
        ) : null}

        {!!error && (
          <View style={styles.errorBlock}>
            <ErrorNotice language={language}>{error}</ErrorNotice>
            {!tree && (
              <>
                <Button
                  secondary
                  language={language}
                  label={ko ? "다시 불러오기" : "再読込"}
                  onPress={() => setReload((x) => x + 1)}
                />
                {loadIssue === "selection" && (
                  <Button
                    secondary
                    language={language}
                    label={
                      ko
                        ? "이전 선택 지우고 다시 선택"
                        : "以前の選択を消して選び直す"
                    }
                    onPress={() => {
                      clearTagDraft(userId!);
                      discardOld.current = true;
                      setReload((x) => x + 1);
                    }}
                  />
                )}
              </>
            )}
          </View>
        )}

        {!loading && tree && (
          <>
            <View style={styles.headingBlock}>
              <Label variant="titleBig" language={language}>
                {ko
                  ? "어떤 서울을 소개할 수 있나요?"
                  : "どんな旅が好きですか？"}
              </Label>
              <Label variant="desc" tone="desc" language={language}>
                {ko
                  ? "취향이 비슷한 여행자에게 추천돼요."
                  : "好みが近いメイトをおすすめします。"}
              </Label>
            </View>

            <View style={styles.generalIntro}>
              <Text style={[styles.sectionTitle, { fontFamily: subTitleFont }]}>
                {ko ? "추천할 수 있는 것" : "旅の好み"}
              </Text>
              <Text style={[styles.sectionDesc, { fontFamily: subDescFont }]}>
                {ko ? "잘 아는 것을 모두 골라 주세요." : "いくつでも選べます。"}
              </Text>
            </View>

            {general.map((root, index) => (
              <View
                key={root.tagId}
                style={
                  index === 0 ? styles.firstCategoryGroup : styles.categoryGroup
                }
              >
                <View style={styles.categoryHeader}>
                  <TagCategoryIcon category={root.category} size={22} />
                  <Label variant="label" tone="neutral" language={language}>
                    {root.name}
                  </Label>
                </View>
                <View style={styles.chips}>{root.children.map(chip)}</View>
              </View>
            ))}

            <View style={styles.categoryGroup}>
              <View style={styles.sectionHeaderRow}>
                <TagCategoryIcon category="OSHI" size={22} />
                <Text
                  style={[styles.sectionTitle, { fontFamily: subTitleFont }]}
                >
                  {ko ? "최애" : "推し"}
                </Text>
              </View>
              <Text style={[styles.sectionDesc, { fontFamily: subDescFont }]}>
                {ko
                  ? "없으면 「최애 없음」을 골라 주세요."
                  : "いなければ「推しはいない」を選んでください。"}
              </Text>
              <View style={styles.sectionChips}>
                {oshis.map((root) => {
                  const summary = summarizeOshiCategory(root, ids, ko);
                  const selected = summary.length > 0;
                  return (
                    <Chip
                      key={root.tagId}
                      label={root.name}
                      sublabel={
                        selected
                          ? ko
                            ? ` (${summary})`
                            : ` · ${summary}`
                          : undefined
                      }
                      showChevron={!selected}
                      muted={noOshi && !selected}
                      selected={selected}
                      disabled={saving}
                      language={language}
                      onPress={() => openOshiSheet(root)}
                    />
                  );
                })}
                <Chip
                  label={ko ? "최애 없음" : "推しはいない"}
                  selected={noOshi && !hasAnyOshiSelection}
                  disabled={saving}
                  language={language}
                  onPress={clearAllOshi}
                />
              </View>
            </View>

            {area && (
              <View style={styles.areaGroup}>
                <Text
                  style={[
                    styles.sectionTitleSmall,
                    { fontFamily: subTitleFont },
                  ]}
                >
                  {ko ? "잘 아는 동네" : "行ってみたい街"}
                </Text>
                <Text style={[styles.sectionDesc, { fontFamily: subDescFont }]}>
                  {ko
                    ? "매칭 점수에는 들어가지 않아요. 비슷한 여행자 중 누구를 먼저 보여 줄지 정할 때 써요."
                    : "マッチングの点数には入りません。好みが近いメイトの中で、誰を先に見せるか決めるときに使います。"}
                </Text>
                <View style={styles.sectionChips}>
                  {area.children.map(chip)}
                </View>
              </View>
            )}

            <ScreenFooter>
              {saving && (
                <View style={styles.cancelRow}>
                  <TextLink
                    variant="quiet"
                    language={language}
                    label={ko ? "취소" : "キャンセル"}
                    onPress={() => abortRef.current?.abort()}
                  />
                </View>
              )}
              <Button
                language={language}
                label={
                  origin === "account"
                    ? ko
                      ? "저장"
                      : "保存"
                    : ko
                      ? "다음"
                      : "次へ"
                }
                loading={saving}
                disabled={!hasGeneral}
                onPress={() => void save()}
              />
            </ScreenFooter>
          </>
        )}
      </View>

      <BottomSheet
        visible={detailOpen}
        onClose={closeDetailSheet}
        onDismissed={handleDetailDismissed}
      >
        {detail && (
          <View style={styles.sheetContent}>
            <Label variant="sheetTitle" center language={language}>
              {ko
                ? `${detail.name}, 어떤 스타일을 좋아하세요?`
                : `${detail.name}、どんなところが好き？`}
            </Label>
            <Label variant="desc" tone="desc" center language={language}>
              {ko ? "여러 개 고를 수 있어요." : "いくつでも選べます。"}
            </Label>
            <View style={styles.sheetChipsWrap}>
              <Chip
                label={ko ? "전체" : "全体"}
                language={language}
                selected={detailDraft.includes(detail.tagId)}
                onPress={() =>
                  setDetailDraft((prev) =>
                    prev.includes(detail.tagId)
                      ? prev.filter((id) => id !== detail.tagId)
                      : [...prev, detail.tagId],
                  )
                }
              />
              {detail.children.map((d) => (
                <Chip
                  key={d.tagId}
                  label={d.name}
                  language={language}
                  selected={detailDraft.includes(d.tagId)}
                  onPress={() =>
                    setDetailDraft((prev) =>
                      prev.includes(d.tagId)
                        ? prev.filter((id) => id !== d.tagId)
                        : [...prev, d.tagId],
                    )
                  }
                />
              ))}
            </View>
            <View style={styles.sheetActions}>
              <Button
                language={language}
                label={ko ? "완료" : "決定"}
                disabled={detailDraft.length === 0}
                onPress={commitDetailSheet}
              />
              {detailWasSelected ? (
                <TextLink
                  variant="quiet"
                  language={language}
                  label={ko ? "선택 해제" : "選択を外す"}
                  onPress={removeDetailSelection}
                />
              ) : (
                <Button
                  secondary
                  language={language}
                  label={ko ? "닫기" : "やめる"}
                  onPress={closeDetailSheet}
                />
              )}
            </View>
          </View>
        )}
      </BottomSheet>

      <BottomSheet
        visible={oshiOpen}
        onClose={closeOshiSheet}
        onDismissed={handleOshiDismissed}
      >
        {activeOshi && (
          <View style={styles.sheetContent}>
            <Label variant="sheetTitle" center language={language}>
              {ko
                ? `${activeOshi.name}, 최애는 누구예요?`
                : `${activeOshi.name}、誰が推し？`}
            </Label>
            <Label variant="desc" tone="desc" center language={language}>
              {ko ? "여러 개 고를 수 있어요." : "いくつでも選べます。"}
            </Label>

            <View style={styles.searchWrap}>
              <View style={styles.searchIcon}>
                <MagnifyingGlass size={18} color={theme.color.labelDesc} />
              </View>
              <Input
                language={language}
                placeholder={oshiSearchPlaceholder(activeOshi.category, ko)}
                accessibilityLabel={ko ? "검색" : "検索"}
                value={search}
                onChangeText={setSearch}
                style={styles.searchInputInner}
              />
              {search.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={ko ? "검색어 지우기" : "検索をクリア"}
                  onPress={() => setSearch("")}
                  style={styles.searchClearButton}
                >
                  <X size={16} color={theme.color.labelDesc} />
                </Pressable>
              )}
            </View>

            <Text
              style={[styles.sheetSubLabel, { fontFamily: sheetSubLabelFont }]}
            >
              {ko ? "인기" : "人気"}
            </Text>
            <View style={styles.chips}>
              {filteredOshiItems.map((item) => {
                const selected =
                  item.children.length > 0
                    ? oshiExpandedGroups.includes(item.tagId) ||
                      oshiDraft.includes(item.tagId) ||
                      item.children.some((d) => oshiDraft.includes(d.tagId))
                    : oshiDraft.includes(item.tagId);
                return (
                  <Chip
                    key={item.tagId}
                    label={item.name}
                    language={language}
                    selected={selected}
                    onPress={() => toggleOshiItem(item)}
                  />
                );
              })}
            </View>

            {filteredOshiItems
              .filter(
                (item) =>
                  item.children.length > 0 &&
                  (oshiExpandedGroups.includes(item.tagId) ||
                    oshiDraft.includes(item.tagId) ||
                    item.children.some((d) => oshiDraft.includes(d.tagId)) ||
                    (!!trimmedSearch &&
                      item.children.some((d) =>
                        d.name.toLocaleLowerCase().includes(trimmedSearch),
                      ))),
              )
              .map((item) => {
                const visibleMembers = item.children.filter(
                  (d) =>
                    !trimmedSearch ||
                    item.name.toLocaleLowerCase().includes(trimmedSearch) ||
                    d.name.toLocaleLowerCase().includes(trimmedSearch) ||
                    oshiDraft.includes(d.tagId),
                );
                return (
                  <View key={item.tagId}>
                    <Text
                      style={[
                        styles.sheetSubLabel,
                        { fontFamily: sheetSubLabelFont },
                      ]}
                    >
                      {ko ? `${item.name} 멤버` : `${item.name} のメンバー`}
                    </Text>
                    <View style={styles.chips}>
                      <Chip
                        label={ko ? "올팬" : "箱推し"}
                        language={language}
                        selected={oshiDraft.includes(item.tagId)}
                        onPress={() => toggleOshiMember(item.tagId, item.tagId)}
                      />
                      {visibleMembers.map((member) => (
                        <Chip
                          key={member.tagId}
                          label={member.name}
                          language={language}
                          selected={oshiDraft.includes(member.tagId)}
                          onPress={() =>
                            toggleOshiMember(item.tagId, member.tagId)
                          }
                        />
                      ))}
                    </View>
                  </View>
                );
              })}

            <View style={styles.sheetActions}>
              <Button
                language={language}
                label={ko ? "완료" : "決定"}
                disabled={oshiDraft.length === 0}
                onPress={commitOshiSheet}
              />
              {oshiWasSelected ? (
                <TextLink
                  variant="quiet"
                  language={language}
                  label={ko ? "선택 해제" : "選択を外す"}
                  onPress={removeOshiCategory}
                />
              ) : (
                <Button
                  secondary
                  language={language}
                  label={ko ? "닫기" : "やめる"}
                  onPress={closeOshiSheet}
                />
              )}
            </View>
          </View>
        )}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 0,
  },
  body: {
    flexGrow: 1,
  },
  onboardingTop: {
    gap: theme.space.xs,
  },
  backButton: {
    width: theme.size.touchMin,
    height: theme.size.touchMin,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  statusWrap: {
    marginTop: theme.space.lg,
  },
  errorBlock: {
    marginTop: theme.space.lg,
    gap: theme.space.sm,
  },
  headingBlock: {
    marginTop: theme.space.screen,
    gap: theme.space.sm,
  },
  generalIntro: {
    marginTop: theme.space.group,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 24,
    color: theme.color.labelNormal,
  },
  sectionTitleSmall: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.color.labelNormal,
  },
  sectionDesc: {
    marginTop: 6,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: 19,
    color: theme.color.labelDesc,
  },
  firstCategoryGroup: {
    marginTop: theme.space.screen,
  },
  categoryGroup: {
    marginTop: theme.space.xxl,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: theme.space.md,
  },
  sectionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.sm,
    marginTop: theme.space.md,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.sm,
  },
  areaGroup: {
    marginTop: theme.space.xxl,
    paddingTop: theme.space.xl,
    borderTopWidth: 1,
    borderTopColor: theme.color.lineAlt,
  },
  cancelRow: {
    alignItems: "center",
  },
  sheetContent: {
    gap: theme.space.xs,
  },
  sheetChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.sm,
    marginTop: theme.space.lg,
  },
  sheetSubLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: 18,
    color: theme.color.labelAlt,
    marginTop: theme.space.screen,
    marginBottom: theme.space.sm,
  },
  sheetActions: {
    marginTop: theme.space.xl,
    gap: theme.space.sm,
  },
  searchWrap: {
    marginTop: theme.space.md,
    position: "relative",
    justifyContent: "center",
  },
  searchIcon: {
    position: "absolute",
    left: 14,
    zIndex: 2,
    pointerEvents: "none",
  },
  searchInputInner: {
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 15,
  },
  searchClearButton: {
    position: "absolute",
    right: 6,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
});
