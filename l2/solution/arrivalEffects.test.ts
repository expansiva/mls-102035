/// <mls fileReference="_102035_/l2/solution/arrivalEffects.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { ns5ArrivalEffects, ns5ArrivalEntityIds, ns5ArrivalWriteEffects } from '/_102035_/l2/solution/arrivalEffects.js';

const source = readFileSync(new URL('./arrivalEffects.ts', import.meta.url), 'utf8');

void test('arrivalEffects.ts stays a pure file', () => {
  assert.equal(/node:|\/solution\/fs\.js|\/gates\/|agentNewSolution5/.test(source), false);
});

void test('the old pair and entityEffects name the same entries', () => {
  const inboundOld = ns5ArrivalEffects({ writes: ['Item', 'Local'], effect: 'create' }, 'inbound');
  const inboundNew = ns5ArrivalEffects({
    entityEffects: [
      { entityId: 'Item', effects: ['create'] },
      { entityId: 'Local', effects: ['create'] },
    ],
    writes: ['Ignored'],
    effect: 'update',
  }, 'inbound');
  assert.deepEqual(inboundOld, inboundNew);

  const serveOld = ns5ArrivalEffects({ entityRefs: ['Item', 'Local'], effect: 'list' }, 'serve');
  const serveNew = ns5ArrivalEffects({
    entityEffects: [
      { entityId: 'Item', effects: ['list'] },
      { entityId: 'Local', effects: ['list'] },
    ],
  }, 'serve');
  assert.deepEqual(serveOld, serveNew);
  assert.deepEqual(ns5ArrivalEntityIds({ writes: ['Item'], effect: 'update' }, 'inbound'), ['Item']);
});

void test('a missing effect on the old pair yields an empty effect list', () => {
  assert.deepEqual(ns5ArrivalEffects({ writes: ['Item'] }, 'inbound'), [{ entityId: 'Item', effects: [] }]);
  assert.deepEqual(ns5ArrivalEffects({ entityRefs: ['Item'] }, 'serve'), [{ entityId: 'Item', effects: [] }]);
  assert.deepEqual(ns5ArrivalEffects({ entityEffects: [] }, 'inbound'), []);
});

void test('write effects keep create, update, remove and transition', () => {
  assert.deepEqual(
    ns5ArrivalWriteEffects({ entityId: 'Item', effects: ['list', 'create', 'read', 'update', 'remove', 'transition'] }),
    ['create', 'update', 'remove', 'transition'],
  );
});
