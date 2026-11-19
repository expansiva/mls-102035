/// <mls fileReference="_102035_/l2/newRelease/widgets/integration/integrationModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ns5IntegrationArtifact } from '../../../solution/types.js';
import { loadNewReleaseMessages } from '../../helpers/i18n.js';
import { comprasIntegration } from '../fixtures/compras-integration.defs.js';
import {
  INTEGRATION_ITEM_LABELS,
  integrationArtifactFromView,
  integrationOracleIssues,
  normalizeIntegration,
  patchIntegrationItem,
  patchExternalSystem,
  patchExternalSetting,
  patchExternalOperation,
  requestDirection,
  requestExportName,
} from './integrationModel.js';

test('normalizes v1 integration plugin entity refs without presenting them as v2 usedBy', () => {
  const view = normalizeIntegration({
    schemaVersion: '2026-09-10-ns5-integration-v1', moduleName: 'legacy', inbound: [], outbound: [],
    plugins: [{ pluginId: 'stripe', description: 'Pay', entityRefs: ['Receipt'] }],
  });
  assert.equal(view.schema, 'v1');
  assert.deepEqual(view.plugins[0].usedBy, []);
  assert.deepEqual(view.plugins[0].legacyEntityRefs, ['Receipt']);
});

test('classifies sent and received sibling requests', () => {
  const base = { schemaVersion: '2026-09-12-ns5-integration-request-v1' as const, eventId: 'paid', entityRefs: [], description: 'D', status: 'requested' as const };
  assert.equal(requestDirection({ targetModule: 'billing', path: 'a', value: { ...base, requestedBy: 'orders' } }, 'orders'), 'sent');
  assert.equal(requestDirection({ targetModule: 'billing', path: 'a', value: { ...base, requestedBy: 'orders' } }, 'billing'), 'received');
  assert.equal(requestDirection({ targetModule: 'organization', path: 'a', value: { ...base, requestedBy: 'orders', to: 'future' } }, 'future'), 'received');
  assert.equal(requestExportName('orders', 'paymentDone'), 'ordersPaymentDoneRequest');
});

test('selects integration, I11 and I12 issues only', () => {
  const issues = integrationOracleIssues([
    { artifact: 'integration.defs.ts', path: '$', severity: 'error', code: 'X', message: 'x', source: 'gate' },
    { artifact: 'module', path: '$', severity: 'warning', code: 'NS5_FINALIZE_I11_INBOUND_PENDING_IN_SIBLING', message: 'i11', source: 'oracle' },
    { artifact: 'module', path: '$', severity: 'error', code: 'NS5_FINALIZE_I12', message: 'i12', source: 'oracle' },
    { artifact: 'rules.defs.ts', path: '$', severity: 'error', code: 'I4', message: 'i4', source: 'oracle' },
  ]);
  assert.equal(issues.length, 3);
});

test('reads integration-v3 as the current v2 shape', () => {
  const view = normalizeIntegration({
    schemaVersion: '2026-11-17-ns5-integration-v3', moduleName: 'orders', inbound: [], outbound: [], plugins: [],
  });
  assert.equal(view.schema, 'v2');
});

test('reads v4 as current while preserving legacy lists and the complete artifact', () => {
  const artifact = {
    schemaVersion: '2026-11-19-ns5-integration-v4', moduleName: 'orders',
    inbound: [{ id: 'received', kind: 'event', from: 'billing', description: 'Received', entityRefs: ['Order'] }],
    outbound: [{ id: 'sent', kind: 'event', to: 'billing', description: 'Sent', entityRefs: ['Order'] }],
    plugins: [{ pluginId: 'stripe', description: 'Payment', usedBy: ['checkout.pay'] }],
    connections: [{ connectionId: 'stripe', operationId: 'charge', direction: 'call', usedBy: ['checkout.pay'], description: 'Charge' }],
    externalSystems: [{ id: 'stripe', title: 'Stripe', description: 'Payments', settings: [], operations: [] }],
  } satisfies Ns5IntegrationArtifact;
  const view = normalizeIntegration(artifact);
  assert.equal(view.schema, 'v2');
  assert.equal(view.inbound[0].id, 'received');
  assert.equal(view.outbound[0].id, 'sent');
  assert.equal(view.plugins[0].pluginId, 'stripe');
  assert.deepEqual(view.connections, artifact.connections);
  assert.deepEqual(view.externalSystems, artifact.externalSystems);
  assert.strictEqual(view.raw, artifact);
  assert.strictEqual(integrationArtifactFromView(view), artifact);
});

test('normalizes nested v4 systems and connections while retaining raw input', () => {
  const raw = {schemaVersion: '2026-11-19-ns5-integration-v4',
    connections: [{connectionId: 'mail', operationId: 'send', direction: 'call', usedBy: ['flow.send'], description: 'Send'}],
    externalSystems: [{id: 'mail', title: 'Mail', description: 'Email',
      settings: [{id: 'key', title: 'API key', description: 'Credential', secret: true}],
      operations: [{operationId: 'send', direction: 'call', description: 'Send mail'}]}]};
  const view = normalizeIntegration(raw);
  assert.deepEqual(view.connections, raw.connections);
  assert.deepEqual(view.externalSystems, raw.externalSystems);
  assert.strictEqual(view.raw, raw);
  for (const version of ['integration-v1', 'integration-v2', 'integration-v3']) {
    const legacy = normalizeIntegration({schemaVersion: version});
    assert.deepEqual(legacy.connections, []);
    assert.deepEqual(legacy.externalSystems, []);
  }
});

test('system, setting and operation patches preserve identities, sibling lists and source', () => {
  const original: Ns5IntegrationArtifact = {
    schemaVersion: '2026-11-19-ns5-integration-v4', moduleName: 'orders', inbound: [], outbound: [], plugins: [],
    connections: [
      {connectionId: 'mail', operationId: 'send', direction: 'call', usedBy: [], description: 'Send'},
      {connectionId: 'mail', operationId: 'receive', direction: 'serve', usedBy: ['flow.receive'], description: 'Receive'},
      {connectionId: 'other', operationId: 'send', direction: 'call', usedBy: [], description: 'Other send'},
    ],
    externalSystems: [
      {id: 'mail', title: 'Mail', description: 'Email',
        settings: [{id: 'key', title: 'Key', description: 'Old', secret: true}, {id: 'url', title: 'URL', description: 'Host', secret: false}],
        operations: [{operationId: 'send', direction: 'call', description: 'Old'}, {operationId: 'receive', direction: 'serve', description: 'Arrival'}]},
      {id: 'other', title: 'Other', description: 'Other system', settings: [], operations: []},
    ],
  };
  const snapshot = structuredClone(original);
  const system = patchExternalSystem(original, 'mail', {title: 'Mailer', ...{id: 'renamed', settings: []}});
  const setting = patchExternalSetting(system, 'mail', 'key', {secret: false, description: 'New', ...{id: 'renamed'}});
  assert.deepEqual(system.connections, snapshot.connections);
  assert.deepEqual(setting.connections, snapshot.connections);
  const operation = patchExternalOperation(setting, 'mail', 'send', {direction: 'serve', description: 'New', ...{operationId: 'renamed'}});
  assert.deepEqual(operation.externalSystems?.[0], {
    ...snapshot.externalSystems?.[0], title: 'Mailer',
    settings: [{id: 'key', title: 'Key', description: 'New', secret: false}, snapshot.externalSystems?.[0].settings[1]],
    operations: [{operationId: 'send', direction: 'serve', description: 'New'}, snapshot.externalSystems?.[0].operations[1]],
  });
  assert.deepEqual(operation.externalSystems?.[1], snapshot.externalSystems?.[1]);
  assert.deepEqual(operation.connections, [
    {...snapshot.connections?.[0], direction: 'serve'},
    snapshot.connections?.[1], snapshot.connections?.[2],
  ]);
  assert.deepEqual(original, snapshot);
});

test('only recognized current versions expose their raw artifact', () => {
  for (const version of ['2026-09-12-ns5-integration-v2', '2026-11-17-ns5-integration-v3']) {
    const artifact = { schemaVersion: version, moduleName: 'orders', inbound: [], outbound: [], plugins: [] };
    assert.strictEqual(integrationArtifactFromView(normalizeIntegration(artifact)), artifact);
  }
  for (const version of ['2026-09-10-ns5-integration-v1', 'unrecognized']) {
    const artifact = { schemaVersion: version, moduleName: 'orders', inbound: [], outbound: [], plugins: [] };
    assert.equal(integrationArtifactFromView(normalizeIntegration(artifact)), null);
  }
});

test('reads the frozen compras v2 outbound events', () => {
  const view = normalizeIntegration(comprasIntegration);
  assert.equal(view.schema, 'v2');
  assert.equal(view.outbound.length, 1);
  assert.equal(view.outbound[0].to, 'controleEstoque');
  assert.match(view.outbound[0].on || '', /^GoodsReceipt\./u);
});


test('editing an existing integration preserves identities, sibling items and artifact metadata', () => {
  const artifact = structuredClone(comprasIntegration);
  const original = structuredClone(artifact);
  const changed = patchIntegrationItem(artifact, 'outbound', 0, {description: 'New description', to: 'any'});
  assert.equal(changed.outbound[0].description, 'New description');
  assert.equal(changed.outbound[0].to, 'any');
  assert.deepEqual(changed.outbound[0], {...original.outbound[0], description: 'New description', to: 'any'});
  assert.deepEqual(changed.inbound, original.inbound);
  assert.deepEqual(changed.plugins, original.plugins);
  assert.equal(changed.schemaVersion, original.schemaVersion);
  assert.equal(changed.moduleName, original.moduleName);
  assert.deepEqual(artifact, original);
});

test('identity fields remain protected even from an untyped caller, including an absent event', () => {
  const artifact = structuredClone(comprasIntegration);
  delete artifact.outbound[0].event;
  const changed = patchIntegrationItem(artifact, 'outbound', 0, {description: 'Changed', ...{id: 'renamed', event: 'renamedEvent'}});
  assert.equal(changed.outbound[0].id, artifact.outbound[0].id);
  assert.equal(Object.hasOwn(changed.outbound[0], 'event'), false);
  assert.equal(changed.outbound.length, artifact.outbound.length);
});


test('every integration field label is translated in English and Portuguese', async () => {
  assert.equal(INTEGRATION_ITEM_LABELS.entityRefs, 'integration.entities');
  assert.equal(INTEGRATION_ITEM_LABELS.transitionRef, 'integration.transition');
  assert.equal(INTEGRATION_ITEM_LABELS.description, 'integration.itemDescription');
  for (const language of ['en', 'pt']) {
    const [messages] = await loadNewReleaseMessages(102035, language);
    for (const key of Object.values(INTEGRATION_ITEM_LABELS)) assert.ok(messages[key]?.trim(), `${language}: ${key}`);
  }
});

test('inbound entity selection preserves identities, writes and other integration values', () => {
  const artifact = structuredClone(comprasIntegration);
  artifact.inbound = [{id: 'received', event: 'receivedEvent', kind: 'event', from: 'orders',
    effect: 'create', writes: ['Receipt'], description: 'Arrival', entityRefs: ['LegacyEntity']}];
  const original = structuredClone(artifact);
  const changed = patchIntegrationItem(artifact, 'inbound', 0, {entityRefs: ['Receipt', 'LegacyEntity']});
  assert.deepEqual(changed.inbound[0], {...original.inbound[0], entityRefs: ['Receipt', 'LegacyEntity']});
  assert.deepEqual(changed.outbound, original.outbound);
  assert.deepEqual(changed.plugins, original.plugins);
  assert.deepEqual(artifact, original);
});
