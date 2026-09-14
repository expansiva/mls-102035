/// <mls fileReference="_102035_/l2/newRelease/widgets/integrationModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { comprasIntegration } from '../../../../mls-102047/l4/compras/integration.defs.js';
import {
  integrationOracleIssues,
  normalizeIntegration,
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

test('reads the real compras v2 outbound events', () => {
  const view = normalizeIntegration(comprasIntegration);
  assert.equal(view.schema, 'v2');
  assert.equal(view.outbound.length, 2);
  assert.equal(view.outbound[0].to, 'controleEstoque');
  assert.match(view.outbound[0].on || '', /^PedidoCompra\./u);
});
