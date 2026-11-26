// 읽음 요청이 끝나면 배지가 다시 조회하도록 알린다.
// 알림을 누르면 요청이 끝나기 전에 홈으로 가서, 화면 진입 조회만으로는 이전 숫자를 받을 수 있다.
type Listener = () => void;

let listeners: readonly Listener[] = [];

export function subscribeUnreadChange(listener: Listener): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((value) => value !== listener);
  };
}

export function notifyUnreadChange(): void {
  listeners.forEach((listener) => listener());
}
