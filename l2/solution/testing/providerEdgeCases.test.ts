/// <mls fileReference="_102035_/l2/solution/testing/providerEdgeCases.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { providerEdgeCases } from '/_102035_/l2/solution/testing/providerEdgeCases.js';

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 5 },
    note: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
    code: { type: 'string', pattern: '^[A-Z]{2}$' },
    when: { type: 'string', format: 'date-time' },
    tags: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'string', minLength: 1 } },
    rows: { type: 'array', items: { $ref: '#/$defs/row' } },
  },
  $defs: { row: { type: 'object', properties: { id: { type: 'string', minLength: 1 } } } },
};
const example = { name: 'ab', note: 'x', code: 'AB', when: '2026-11-04T10:00:00Z', tags: ['a'], rows: [{ id: 'r1' }] };

const at = (path: string, rule: string) => providerEdgeCases(schema, example).filter(item => item.path === path && item.rule === rule);

void test('minLength: empty text and only spaces, in a field, in an anyOf branch and in a list item', () => {
  assert.deepEqual(at('name', 'minLength').map(item => (item.value as { name: string }).name), ['', '   ']);
  assert.deepEqual(at('note', 'minLength').map(item => (item.value as { note: string }).note), ['', '   ']);
  assert.deepEqual(at('tags[0]', 'minLength').map(item => (item.value as { tags: string[] }).tags[0]), ['', '   ']);
});

void test('maxLength: one over the limit', () => {
  const [case1] = at('name', 'maxLength');
  assert.equal((case1.value as { name: string }).name, 'xxxxxx');
});

void test('pattern and format: a value outside them', () => {
  const [pattern] = at('code', 'pattern');
  assert.equal(/^[A-Z]{2}$/u.test((pattern.value as { code: string }).code), false);
  const [format] = at('when', 'format');
  assert.equal((format.value as { when: string }).when, 'not a date');
});

void test('minItems and maxItems: an empty list and one over the limit', () => {
  assert.deepEqual((at('tags', 'minItems')[0].value as { tags: string[] }).tags, []);
  assert.equal((at('tags', 'maxItems')[0].value as { tags: string[] }).tags.length, 3);
});

void test('a $ref is followed, the example is not changed, and each case changes only its own field', () => {
  assert.deepEqual(at('rows[0].id', 'minLength').map(item => (item.value as { rows: Array<{ id: string }> }).rows[0].id), ['', '   ']);
  assert.deepEqual(example, { name: 'ab', note: 'x', code: 'AB', when: '2026-11-04T10:00:00Z', tags: ['a'], rows: [{ id: 'r1' }] });
  const [only] = at('name', 'minLength');
  assert.deepEqual({ ...(only.value as object), name: 'ab' }, example);
});

void test('a schema without those keywords gives no case, and a field absent from the example is skipped', () => {
  assert.deepEqual(providerEdgeCases({ type: 'object', properties: { a: { type: 'string' } } }, { a: 'x' }), []);
  assert.deepEqual(providerEdgeCases(schema, {}), []);
});
