/** 제한 시간이 없는 SDK 호출에 시간을 건다. 시간이 지나도 호출 자체는 취소되지 않는다. */
export function withTimeout<T>(
  task: Promise<T>,
  ms: number,
  error: Error,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(error), ms);
    task.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}
