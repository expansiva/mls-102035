/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewRunMessageTransport.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { postReviewMessage, resolveReviewMessageRoute, type ReviewMessageRuntime } from './reviewRunMessageTransport.js';

const localRuntime: ReviewMessageRuntime = {
  origin: 'http://localhost:2047',
  hostname: 'localhost',
  configuredUrl: 'https://msg.collab.codes/msg',
  configuredCredentials: 'include',
};

test('local Studio sends the review start through authenticated same-origin /msg', async () => {
  let configuredPosts = 0;
  let request: { url: string; init?: RequestInit } | null = null;
  const result = await postReviewMessage<{ statusCode: number }>({ action: 'startReviewRun' }, localRuntime, {
    configuredPost: async () => { configuredPosts += 1; return {}; },
    fetchImpl: async (input, init) => {
      request = { url: String(input), init };
      return new Response(JSON.stringify({ statusCode: 200 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    errorFromResponse: async () => new Error('unexpected response'),
  });

  assert.deepEqual(result, { statusCode: 200 });
  assert.equal(configuredPosts, 0);
  assert.equal(request?.url, 'http://localhost:2047/msg');
  assert.equal(request?.init?.credentials, 'same-origin');
  assert.equal(request?.init?.body, JSON.stringify({ action: 'startReviewRun' }));
});

test('production and explicit local message endpoints keep their configured transport', async () => {
  const production = resolveReviewMessageRoute({
    ...localRuntime,
    origin: 'https://on.collab.codes',
    hostname: 'on.collab.codes',
  });
  assert.deepEqual(production, {
    url: 'https://msg.collab.codes/msg',
    credentials: 'include',
    useConfiguredPost: true,
  });

  const explicitLocal = resolveReviewMessageRoute({
    ...localRuntime,
    configuredUrl: 'http://127.0.0.1:8180/msg',
  });
  assert.equal(explicitLocal.useConfiguredPost, true);
  assert.equal(explicitLocal.url, 'http://127.0.0.1:8180/msg');
});

test('local proxy authentication errors remain closed and preserve the response error', async () => {
  await assert.rejects(
    postReviewMessage({ action: 'startReviewRun' }, localRuntime, {
      configuredPost: async () => { throw new Error('must not call configured endpoint'); },
      fetchImpl: async () => new Response(JSON.stringify({ statusCode: 401, msg: 'invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
      errorFromResponse: async (response) => new Error(`review message rejected: ${response.status}`),
    }),
    /review message rejected: 401/u,
  );
});
