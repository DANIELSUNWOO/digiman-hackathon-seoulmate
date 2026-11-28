import { useEffect, useRef, useState } from "react";
import type { PlaceSearchApi } from "./api";
import type { PlaceResult } from "./types";

export const QUERY_MAX = 50;
// 하루 호출 한도가 있어 글자마다 부르지 않고 입력이 멈춘 뒤에 부른다 (PLACE-01).
const TYPING_PAUSE_MS = 500;

export type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; places: PlaceResult[] };

/** 어떤 검색어의 결과인지 함께 둬서, 검색어가 바뀌면 옛 결과를 보이지 않는다. */
type Outcome = { query: string } & (
  | { status: "error"; error: unknown }
  | { status: "ready"; places: PlaceResult[] }
);

export interface PlaceSearchModel {
  text: string;
  setText: (text: string) => void;
  state: SearchState;
  /** 기다리지 않고 지금 검색한다. 키보드 검색 키와 다시 시도에 쓴다. */
  submit: () => void;
}

function stateFor(query: string, outcome: Outcome | null): SearchState {
  if (!query) return { status: "idle" };
  if (outcome?.query !== query) return { status: "loading" };
  return outcome;
}

/** api는 참조가 고정돼 있어야 한다. */
export function usePlaceSearch(api: PlaceSearchApi): PlaceSearchModel {
  const [text, setText] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [submitted, setSubmitted] = useState(0);
  const immediate = useRef(false);
  const query = text.trim();

  useEffect(() => {
    const delay = immediate.current ? 0 : TYPING_PAUSE_MS;
    immediate.current = false;
    if (!query) return;
    const controller = new AbortController();
    const settle = (next: Outcome): void => {
      // 검색어가 바뀌었거나 화면을 벗어난 요청의 응답은 버린다.
      if (!controller.signal.aborted) setOutcome(next);
    };
    const timer = setTimeout(() => {
      api.search(query, controller.signal).then(
        (places) => settle({ query, status: "ready", places }),
        (error: unknown) => settle({ query, status: "error", error }),
      );
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [api, query, submitted]);

  const submit = (): void => {
    const done = outcome?.query === query && outcome.status === "ready";
    if (!query || done) return;
    immediate.current = true;
    setOutcome(null);
    setSubmitted((count) => count + 1);
  };

  return { text, setText, state: stateFor(query, outcome), submit };
}
