/// <mls fileReference="_102035_/l2/solution/helpers/connectionCatalog.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ns5ConnectionCatalogs,
  ns5ConnectionExists,
  ns5ConnectionOperation,
  ns5ConnectionSourcePath,
  ns5ConnectionTerms,
} from '/_102035_/l2/solution/helpers/connectionCatalog.js';

test('ns5ConnectionCatalogs lists the example cm catalog', () => {
  const catalogs = ns5ConnectionCatalogs();
  assert.equal(catalogs.length, 1);
  assert.equal(catalogs[0].schemaVersion, 'connection-catalog-v1');
  assert.equal(catalogs[0].connectionId, 'cm');
  assert.equal(catalogs[0].operations.length, 14);
});

test('ns5ConnectionOperation returns an existing operation', () => {
  const op = ns5ConnectionOperation('cm', 'readAgent');
  assert.ok(op);
  assert.equal(op.direction, 'call');
  assert.equal(op.kind, 'query');
  assert.equal(op.reply, 'now');
  const create = ns5ConnectionOperation('cm', 'createAgent');
  assert.ok(create);
  assert.equal(create.reply, 'later');
  assert.equal(create.resultOperation, 'agentDraftReady');
});

test('ns5ConnectionOperation returns undefined for unknown connection or operation', () => {
  assert.equal(ns5ConnectionOperation('cm', 'inventedOp'), undefined);
  assert.equal(ns5ConnectionOperation('invented', 'readAgent'), undefined);
});

test('serve operations of cm have direction serve', () => {
  const serveIds = ['agentDraftReady', 'describe', 'record'];
  for (const operationId of serveIds) {
    const op = ns5ConnectionOperation('cm', operationId);
    assert.ok(op, operationId);
    assert.equal(op.direction, 'serve');
  }
  const describe = ns5ConnectionOperation('cm', 'describe');
  assert.equal(describe?.hiddenFromAgents, true);
  assert.equal(describe?.noRowLimit, true);
});

test('ns5ConnectionSourcePath and ns5ConnectionExists', () => {
  assert.equal(ns5ConnectionSourcePath('cm'), '/_102034_/l4/ontology/connections/cm.defs.ts');
  assert.equal(ns5ConnectionExists('cm'), true);
  assert.equal(ns5ConnectionExists('invented'), false);
});

test('cm operation ids are unique', () => {
  const ops = ns5ConnectionCatalogs()[0].operations;
  const ids = ops.map(item => item.operationId);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ns5ConnectionTerms(), ['cm']);
});

import fixtureCm from '/_102035_/l2/solution/fixtures/connections/cm.defs.js';

test('the test copy of cm has the same operations as the real catalog (drift guard)', () => {
  const real = ns5ConnectionCatalogs().find(item => item.connectionId === 'cm');
  assert.ok(real);
  const pairs = (operations: readonly { operationId: string; direction: string; reply: string }[]) =>
    operations.map(item => `${item.operationId}:${item.direction}:${item.reply}`).sort();
  assert.deepEqual(pairs(fixtureCm.operations), pairs(real.operations));
});
