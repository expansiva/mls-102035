/// <mls fileReference="_102035_/l2/solution/helpers/ns4WorkerTools.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrapNs4FlexibleWorkerPayload } from '/_102035_/l2/solution/helpers/ns4WorkerTools.js';

const wrap = (inner: string) => ({
  type: 'flexible',
  result: { toolName: 'submitNrpTriage', arguments: { type: 'flexible', result: inner } },
});

void test('tool arguments as JSON text become the object', () => {
  assert.deepEqual(unwrapNs4FlexibleWorkerPayload(wrap('{"valid":true,"note":"a } b"}')), { valid: true, note: 'a } b' });
});

void test('a provider that closes the object twice still yields the object (l4_p4_101)', () => {
  assert.deepEqual(unwrapNs4FlexibleWorkerPayload(wrap('{"valid":true,"list":["x"]}}')), { valid: true, list: ['x'] });
  assert.deepEqual(unwrapNs4FlexibleWorkerPayload(wrap('{"a":{"b":1}}}\n')), { a: { b: 1 } });
});

void test('text that is not JSON plus closers stays text, and trailing content other than closers is not dropped', () => {
  assert.equal(unwrapNs4FlexibleWorkerPayload(wrap('not json }')), 'not json }');
  assert.equal(unwrapNs4FlexibleWorkerPayload(wrap('{"a":1} extra')), '{"a":1} extra');
  assert.equal(unwrapNs4FlexibleWorkerPayload(wrap('{"a":1')), '{"a":1');
});
