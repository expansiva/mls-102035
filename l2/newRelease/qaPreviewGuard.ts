/// <mls fileReference="_102035_/l2/newRelease/qaPreviewGuard.ts" enhancement="_blank" />

import { isQaProtectedRequest } from '/_102035_/l2/newRelease/qaPreviewModel.js';

export const QA_PROTECTED_BUTTONS = [
  '.nr-index__request-actions button', '.nr-index__stale button', '.nr-index__diff button',
  '.nr-review__primary-action button', 'new-release--widgets--general-102035 button',
].join(',');

interface QaGuardRoot {
  querySelectorAll<T extends { disabled: boolean; title: string; dataset: DOMStringMap }>(selectors: string): {
    forEach(callback: (item: T) => void): void;
  };
  addEventListener(type: string, listener: EventListener, capture?: boolean): void;
  removeEventListener(type: string, listener: EventListener, capture?: boolean): void;
}

interface QaGuardObserver {
  observe(target: QaGuardRoot, options: MutationObserverInit): void;
  disconnect(): void;
}

export interface QaMutationGuardDependencies {
  fetch: typeof fetch;
  setFetch(value: typeof fetch): void;
  observe(callback: () => void): QaGuardObserver;
  origin: string;
}

export interface QaProtectedButton {
  disabled: boolean;
  dataset: { qaProtected?: string };
}

export function waitForQaCondition(
  check: () => boolean,
  errorCode: string,
  timeoutMs = 20000,
): Promise<void> {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (check()) {
        resolve();
        return;
      }
      if (performance.now() - started >= timeoutMs) {
        reject(new Error(errorCode));
        return;
      }
      setTimeout(tick, 25);
    };
    tick();
  });
}

export async function waitForQaProtectedButtons<T extends QaProtectedButton>(
  read: () => T[],
  expectedCount: number,
  timeoutMs = 20000,
): Promise<T[]> {
  await waitForQaCondition(() => {
    const buttons = read();
    return buttons.length === expectedCount
      && buttons.every(button => button.disabled && button.dataset.qaProtected === 'true');
  }, 'qa.protectedButtonsTimeout', timeoutMs);
  return read();
}

export function installQaMutationGuard(
  root: QaGuardRoot,
  blocked: string[],
  dependencies: QaMutationGuardDependencies,
): () => void {
  const originalFetch = dependencies.fetch;
  dependencies.setFetch((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (isQaProtectedRequest(url, dependencies.origin)) {
      blocked.push(new URL(url, dependencies.origin).pathname);
      throw new Error('qa.mutationBlocked');
    }
    return originalFetch(input, init);
  }) as typeof fetch);
  const disable = () => root.querySelectorAll(QA_PROTECTED_BUTTONS).forEach(button => {
    button.disabled = true;
    button.title = 'Read-only QA preview';
    button.dataset.qaProtected = 'true';
  });
  const observer = dependencies.observe(disable);
  observer.observe(root, { subtree: true, childList: true });
  disable();
  const stop = (event: Event) => {
    if (!(event.target instanceof Element) || !event.target.closest(QA_PROTECTED_BUTTONS)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  root.addEventListener('click', stop, true);
  root.addEventListener('submit', stop, true);
  return () => {
    observer.disconnect();
    root.removeEventListener('click', stop, true);
    root.removeEventListener('submit', stop, true);
    dependencies.setFetch(originalFetch);
  };
}

export function guardQaMutations(root: HTMLElement, blocked: string[]): () => void {
  return installQaMutationGuard(root, blocked, {
    fetch: window.fetch.bind(window),
    setFetch: value => { window.fetch = value; },
    observe: callback => {
      const active = new MutationObserver(callback);
      return {
        observe: (_target, options) => active.observe(root, options),
        disconnect: () => active.disconnect(),
      };
    },
    origin: window.location.origin,
  });
}
