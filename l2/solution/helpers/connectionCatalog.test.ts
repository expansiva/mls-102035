/// <mls fileReference="_102035_/l2/solution/helpers/connectionCatalog.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ns5ConnectionCatalogs,
  ns5ConnectionArrivals,
  ns5ConnectionExists,
  ns5ConnectionOperation,
  ns5ServeOperationIds,
  ns5ConnectionTerms,
} from '/_102035_/l2/solution/helpers/connectionCatalog.js';

test('ns5ConnectionCatalogs lists the example cm catalog', () => {
  const catalogs = ns5ConnectionCatalogs();
  assert.equal(catalogs.length, 2);
  assert.equal(catalogs[0].schemaVersion, 'connection-catalog-v1');
  assert.equal(catalogs[0].connectionId, 'cm');
  assert.equal(catalogs[0].operations.length, 19);
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

test('ns5ConnectionExists', () => {
  assert.equal(ns5ConnectionExists('cm'), true);
  assert.equal(ns5ConnectionExists('invented'), false);
});

test('cm operation ids are unique', () => {
  const ops = ns5ConnectionCatalogs()[0].operations;
  const ids = ops.map(item => item.operationId);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ns5ConnectionTerms(), ['cm', 'platform']);
  assert.equal(ns5ConnectionOperation('platform', 'releaseCatalogChanged')?.direction, 'serve');
});

import fixtureCm from '/_102035_/l2/solution/fixtures/connections/cm.defs.js';

test('the test copy of cm has the same operations as the real catalog (drift guard)', () => {
  const real = ns5ConnectionCatalogs().find(item => item.connectionId === 'cm');
  assert.ok(real);
  const pairs = (operations: readonly { operationId: string; direction: string; reply: string }[]) =>
    operations.map(item => `${item.operationId}:${item.direction}:${item.reply}`).sort();
  assert.deepEqual(pairs(fixtureCm.operations), pairs(real.operations));
});

test('platform releaseCatalogChanged is a serve command hidden from agents', () => {
  const operation = ns5ConnectionOperation('platform', 'releaseCatalogChanged');
  assert.ok(operation);
  assert.equal(operation.direction, 'serve');
  assert.equal(operation.kind, 'command');
  assert.equal(operation.hiddenFromAgents, true);
});

test('an operation served by the platform is not offered to a module (cm.ensureAgentMember)', () => {
  assert.equal(ns5ConnectionOperation('cm', 'ensureAgentMember'), undefined);
  assert.equal(ns5ConnectionCatalogs().find(item => item.connectionId === 'cm')?.operations.some(item => item.operationId === 'ensureAgentMember'), false);
});

const declared = [{
  id: 'githubRepo',
  title: 'GitHub repository',
  description: 'Where the module reads pull requests.',
  settings: [],
  operations: [
    { operationId: 'listPullRequests', direction: 'call' as const, description: 'The open pull requests.' },
    { operationId: 'pullRequestOpened', direction: 'serve' as const, description: 'A pull request was opened.' },
  ],
}];

test('a declared system answers beside the platform catalogs', () => {
  assert.equal(ns5ConnectionOperation('cm', 'readAgent', declared)?.direction, 'call');
  assert.equal(ns5ConnectionOperation('githubRepo', 'listPullRequests', declared)?.direction, 'call');
  assert.equal(ns5ConnectionOperation('githubRepo', 'pullRequestOpened', declared)?.direction, 'serve');
  assert.equal(ns5ConnectionOperation('githubRepo', 'invented', declared), undefined);
  assert.equal(ns5ConnectionOperation('githubRepo', 'listPullRequests'), undefined);
  assert.equal(ns5ConnectionExists('githubRepo', declared), true);
  assert.equal(ns5ConnectionExists('githubRepo'), false);
  assert.deepEqual(ns5ServeOperationIds('githubRepo', declared), ['pullRequestOpened']);
  assert.deepEqual(ns5ServeOperationIds('githubRepo'), []);
  assert.ok(ns5ConnectionArrivals(declared).some(item => item.ref === 'githubRepo.pullRequestOpened'));
  assert.ok(ns5ConnectionArrivals(declared).some(item => item.ref.startsWith('cm.')));
  assert.ok(!ns5ConnectionArrivals().some(item => item.ref.startsWith('githubRepo.')));
});
