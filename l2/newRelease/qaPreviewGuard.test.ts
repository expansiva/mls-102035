/// <mls fileReference="_102035_/l2/newRelease/qaPreviewGuard.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { installQaMutationGuard, QA_PROTECTED_BUTTONS } from './qaPreviewGuard.js';

test('mutation guard mounts on a DOM host, disables protected buttons and blocks protected transports', async () => {
  const buttons: Array<{ disabled: boolean; title: string; dataset: DOMStringMap }> = [];
  const listeners = new Map<string, EventListener>();
  let observerCallback = () => undefined;
  let disconnected = false;
  let activeFetch: typeof fetch = async () => new Response('allowed');
  let allowedCalls = 0;
  const allowedFetch: typeof fetch = async () => { allowedCalls += 1; return new Response('allowed'); };
  activeFetch = allowedFetch;
  const root = {
    querySelectorAll: (selector: string) => {
      assert.equal(selector, QA_PROTECTED_BUTTONS);
      return buttons;
    },
    addEventListener: (type: string, listener: EventListener) => { listeners.set(type, listener); },
    removeEventListener: (type: string) => { listeners.delete(type); },
  };
  const blocked: string[] = [];
  const stop = installQaMutationGuard(root, blocked, {
    fetch: activeFetch,
    setFetch: value => { activeFetch = value; },
    observe: callback => {
      observerCallback = callback;
      return { observe: () => undefined, disconnect: () => { disconnected = true; } };
    },
    origin: 'http://localhost:2047',
  });

  const mountedButton = { disabled: false, title: '', dataset: {} as DOMStringMap };
  buttons.push(mountedButton);
  observerCallback();
  assert.deepEqual(mountedButton, {
    disabled: true,
    title: 'Read-only QA preview',
    dataset: { qaProtected: 'true' },
  });
  assert.equal(listeners.has('click'), true);
  assert.equal(listeners.has('submit'), true);

  for (const path of ['/msg', '/exec/candidate', '/exec/agent', '/agents/agentReviewSolution']) {
    await assert.rejects(activeFetch(path), /qa\.mutationBlocked/u);
  }
  await activeFetch('/_102035_/l2/newRelease/i18n/en-US.json');
  assert.equal(allowedCalls, 1);
  assert.deepEqual(blocked, ['/msg', '/exec/candidate', '/exec/agent', '/agents/agentReviewSolution']);

  stop();
  assert.equal(disconnected, true);
  assert.equal(activeFetch, allowedFetch);
  assert.equal(listeners.size, 0);
});
