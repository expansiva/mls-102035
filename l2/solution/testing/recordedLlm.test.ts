/// <mls fileReference="_102035_/l2/solution/testing/recordedLlm.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRecordedLlm, fileRecordedLlmStore, recordedLlmKey, type RecordedLlmRequest, type RecordedLlmStore } from '/_102035_/l2/solution/testing/recordedLlm.js';

const request: RecordedLlmRequest = { systemPrompt: 'sys', humanPrompt: 'human', tools: [{ name: 'submit', schema: { a: 1, b: 2 } }] };

function memory(): RecordedLlmStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, read: key => map.get(key) ?? null, write: (key, raw) => { map.set(key, raw); } };
}

void test('record lets the real call through and keeps its raw answer; replay returns it without calling', async () => {
  const store = memory();
  let calls = 0;
  const raw = '{"tool_calls":[{"function":{"arguments":"{\\"l3Notice\\":\\"\\"}"}}]}';
  const recorder = createRecordedLlm({ mode: 'record', store, call: async () => { calls += 1; return raw; } });
  assert.equal(await recorder.respond('agentX', 'triage20', request), raw);
  assert.equal(calls, 1);
  const replayer = createRecordedLlm({ mode: 'replay', store, call: async () => { throw new Error('the model must not be called'); } });
  assert.equal(await replayer.respond('agentX', 'triage20', request), raw, 'the raw answer comes back byte for byte');
  assert.equal(calls, 1);
});

void test('a request with no recording fails with the key that is missing and does not call the model', async () => {
  let calls = 0;
  const replayer = createRecordedLlm({ mode: 'replay', store: memory(), call: async () => { calls += 1; return 'x'; } });
  const key = recordedLlmKey('agentX', 'edit30', request);
  await assert.rejects(replayer.respond('agentX', 'edit30', request), new Error(`recordedLlm.missing:${key}`));
  assert.equal(calls, 0);
  assert.match(key, /^agentX\/edit30\/[0-9a-f]{16}$/u);
});

void test('the key follows the request, not the key order, and the agent and step are part of it', () => {
  const same = { tools: [{ schema: { b: 2, a: 1 }, name: 'submit' }], humanPrompt: 'human', systemPrompt: 'sys' };
  assert.equal(recordedLlmKey('a', 's', request), recordedLlmKey('a', 's', same));
  assert.notEqual(recordedLlmKey('a', 's', request), recordedLlmKey('a', 's', { ...request, humanPrompt: 'other' }));
  assert.notEqual(recordedLlmKey('a', 's', request), recordedLlmKey('b', 's', request));
  assert.notEqual(recordedLlmKey('a', 's', request), recordedLlmKey('a', 't', request));
});

void test('record mode needs the real call', async () => {
  await assert.rejects(createRecordedLlm({ mode: 'record', store: memory() }).respond('a', 's', request), /call_required_in_record_mode/u);
});

void test('the file store writes agent/step/hash.json and reads it back; a missing file is null', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'recorded-llm-'));
  try {
    const store = fileRecordedLlmStore(dir);
    const key = recordedLlmKey('agentX', 'triage20', request);
    assert.equal(store.read(key), null);
    await createRecordedLlm({ mode: 'record', store, call: async () => 'raw answer' }).respond('agentX', 'triage20', request);
    assert.equal(store.read(key), 'raw answer');
    assert.deepEqual(JSON.parse(readFileSync(path.join(dir, `${key}.json`), 'utf8')), { raw: 'raw answer' });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
