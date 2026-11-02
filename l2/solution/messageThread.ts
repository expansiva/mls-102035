/// <mls fileReference="_102035_/l2/solution/messageThread.ts" enhancement="_blank" />

/** Token shape of a message thread id stored on the module pipeline (`messageThreadId`). */
export const MESSAGE_THREAD_ID_RE = /^[A-Za-z0-9_.-]{1,100}$/;

export function messageThreadIdOk(id: string): boolean {
  return MESSAGE_THREAD_ID_RE.test(id);
}
