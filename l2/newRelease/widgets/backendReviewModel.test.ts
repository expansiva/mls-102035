/// <mls fileReference="_102035_/l2/newRelease/widgets/backendReviewModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { reviewArtifactFile, type ReviewArtifactRead } from '../helpers/backendReader.js';
import { BACKEND_SCHEMA_V1, BACKEND_SCHEMA_V11, EFFORT_SCHEMA_V1, EFFORT_SCHEMA_V11, backendTone, buildBackendReview, parseEffortSummary } from './backendReviewModel.js';
import { buildReviewView } from './reviewModel.js';

function read(value: unknown): ReviewArtifactRead {
  return { status: 'ok', path: 'l4/agendaClinica/pool/l2/web/backend.json', value };
}

function fixture() {
  return {
    schemaVersion: BACKEND_SCHEMA_V11, moduleName: 'agendaClinica', device: 'web',
    tables: [
      { tableId: 'consulta', entity: 'Consulta', status: 'toCreate', tableRefs: ['consulta'], noTable: 'ok' },
      { tableId: 'paciente', entity: 'Paciente', status: 'done', tableRefs: ['paciente'], noTable: 'ok' },
    ],
    usecases: [
      { usecaseId: 'agendarConsulta', entity: 'Consulta', operation: 'create', status: 'toUpdate', tableRefs: ['consulta'], noTable: 'ok', reason: 'New rule' },
      { usecaseId: 'consultarRegistro', entity: 'Registro', operation: 'get', status: 'done', tableRefs: [], noTable: 'mdm' },
    ],
    ports: [{ portId: 'ConsultaRepository', entity: 'Consulta', status: 'done', tableRefs: ['consulta'], noTable: 'ok' }],
    endpoints: [{ route: '/consultas', usecaseRef: 'agendarConsulta', status: 'toUpdate', tableRefs: ['consulta'], noTable: 'ok' }],
    removed: [{ kind: 'usecase', id: 'legacy', status: 'toRemove', reason: 'Removed from base', tableRefs: [] as string[], noTable: 'none' }],
    changes: [
      { changeId: 'field:Consulta.status', kind: 'field', op: 'changed', entity: 'Consulta', tableRefs: ['consulta'], noTable: 'ok', usecaseRefs: ['agendarConsulta'], reason: 'Status rule', source: 'ontology/Consulta.defs.ts' },
      { changeId: 'grant:shared', kind: 'grant', op: 'added', entity: '', tableRefs: ['consulta', 'paciente'], noTable: 'ok', usecaseRefs: [], reason: 'Shared grant', source: 'access.defs.ts' },
      { changeId: 'rule:global', kind: 'rule', op: 'removed', entity: '', tableRefs: [], noTable: 'none', usecaseRefs: [], reason: 'Global rule removed', source: 'rules.defs.ts' },
    ],
    meta: { unmappedChanges: [{ changeId: 'unknown:source', kind: 'unknown', source: 'extra.defs.ts' }] },
  };
}

test('reader resolves the selected project and module, not Studio globals', () => {
  assert.deepEqual(reviewArtifactFile(102047, 'agendaClinica', 'backend'), {
    project: 102047, level: 4, folder: 'agendaClinica/pool/l2/web', shortName: 'backend', extension: '.json',
  });
});

test('real v1.1 backend artifact is consumed without inventing changes', () => {
  const real = JSON.parse(readFileSync(new URL('../../../../mls-102047/l4/mensalidadesAcademia/pool/l2/web/backend.json', import.meta.url), 'utf8'));
  const view = buildBackendReview(read(real));
  assert.equal(view.kind, 'ready');
  assert.equal(view.schemaVersion, BACKEND_SCHEMA_V11);
  assert.ok(view.groups.length > 0);
  assert.equal(view.itemCount, real.tables.length + real.usecases.length + real.ports.length + real.endpoints.length + real.removed.length + real.changes.length + (real.meta?.unmappedChanges?.length ?? 0));
  assert.ok(view.unassociated.some(item => item.noTable === 'mdm'));
});

test('current candidate keeps the measured backend roots and producer associations', () => {
  const real = JSON.parse(readFileSync(new URL('../../../../mls-102047/l4/mensalidadesAcademia/tobe/plan/pool/l2/web/backend.json', import.meta.url), 'utf8'));
  const view = buildBackendReview(read(real), false, 'mensalidadesAcademia');
  assert.equal(view.kind, 'ready');
  assert.equal(view.groups.length, 5);
  assert.equal(real.tables.length, 5);
  assert.equal(real.usecases.length, 12);
  assert.equal(real.ports.length, 5);
  assert.equal(real.endpoints.length, 15);
  assert.equal(real.changes.length, 2);
  assert.ok(view.groups.find(group => group.tableId === 'mensalidade')?.items.some(item => item.id === 'change:rule:situacaoMensalidadeDerivada'));
  assert.ok(view.unassociated.some(item => item.id === 'change:rule:alunoBloqueadoPorDuasMensalidadesVencidas'));
});

test('two real menu authorities do not filter the module-wide backend', () => {
  const base = new URL('../../../../mls-102047/l4/mensalidadesAcademia/pool/l2/web/', import.meta.url);
  const menu = JSON.parse(readFileSync(new URL('menu.json', base), 'utf8'));
  const backend = JSON.parse(readFileSync(new URL('backend.json', base), 'utf8'));
  const actors = Object.keys(menu.authorities);
  assert.ok(actors.length >= 2);
  const menuView = (selectedActor: string) => buildReviewView({ pendingCount: 0, readStatus: 'ok', raw: menu, selectedActor, selectedId: '', selectedScope: 'future' });
  const first = menuView(actors[0]);
  const second = menuView(actors[1]);
  assert.equal(first.kind, 'ready');
  assert.equal(second.kind, 'ready');
  assert.notDeepEqual(first.tree, second.tree);
  const moduleBackend = buildBackendReview(read(backend));
  assert.equal(moduleBackend.kind, 'ready');
  assert.ok(moduleBackend.itemCount > 0);
});

test('v1.1 explicit associations make one shared item and keep all no-table items visible', () => {
  const view = buildBackendReview(read(fixture()));
  assert.equal(view.kind, 'ready');
  assert.equal(view.itemCount, 11);
  assert.equal(view.shared.length, 1);
  assert.equal(view.shared[0].id, 'change:grant:shared');
  assert.deepEqual(view.shared[0].tableRefs, ['consulta', 'paciente']);
  assert.equal(view.groups.find(group => group.tableId === 'consulta')?.items.filter(item => item.id === 'change:grant:shared').length, 0);
  assert.ok(view.unassociated.some(item => item.id === 'change:rule:global' && item.reason === 'Global rule removed'));
  assert.ok(view.unassociated.some(item => item.id === 'removed:legacy' && item.tone === 'remove'));
  assert.ok(view.unassociated.some(item => item.kind === 'unmapped'));
  assert.equal(view.groups.find(group => group.tableId === 'consulta')?.items.find(item => item.id === 'change:field:Consulta.status')?.source, 'ontology/Consulta.defs.ts');
  const unknownRef = fixture();
  unknownRef.changes[0].tableRefs = ['unpublishedTable'];
  assert.ok(buildBackendReview(read(unknownRef)).unassociated.some(item => item.id === 'change:field:Consulta.status'));
  const removedTable = fixture();
  removedTable.removed.push({ kind: 'table', id: 'oldAudit', status: 'toRemove', reason: 'Removed from base', tableRefs: ['oldAudit'], noTable: 'ok' });
  assert.ok(buildBackendReview(read(removedTable)).groups.find(group => group.tableId === 'oldAudit')?.items.some(item => item.id === 'removed:oldAudit'));
});

test('legacy v1 never infers table association from entity or endpoint usecaseRef', () => {
  const legacy = fixture() as any;
  legacy.schemaVersion = BACKEND_SCHEMA_V1;
  legacy.changes = undefined;
  legacy.meta = {};
  for (const list of [legacy.tables, legacy.usecases, legacy.ports, legacy.endpoints, legacy.removed]) {
    for (const item of list) { delete item.tableRefs; delete item.noTable; }
  }
  const view = buildBackendReview(read(legacy));
  assert.equal(view.kind, 'ready');
  assert.ok(view.groups.every(group => group.items.length === 0));
  assert.ok(view.unassociated.some(item => item.id === 'table:consulta' && item.noTable === 'legacy'));
  assert.ok(view.unassociated.some(item => item.id === 'usecase:agendarConsulta' && item.noTable === 'legacy'));
  assert.ok(view.unassociated.some(item => item.id === 'endpoint:/consultas' && item.noTable === 'legacy'));
  assert.ok(view.unassociated.some(item => item.id === 'removed:legacy' && item.noTable === 'legacy'));

  const explicit = fixture() as any;
  explicit.schemaVersion = BACKEND_SCHEMA_V1;
  explicit.changes = undefined;
  explicit.meta = {};
  const withProducerRefs = buildBackendReview(read(explicit));
  assert.equal(withProducerRefs.kind, 'ready');
  assert.ok(withProducerRefs.groups.find(group => group.tableId === 'consulta')?.items.some(item => item.id === 'usecase:agendarConsulta'));
  assert.ok(withProducerRefs.groups.find(group => group.tableId === 'consulta')?.items.some(item => item.id === 'endpoint:/consultas'));
});

test('unknown status stays explicit, duplicate change IDs fail, and stale revision hides all rows', () => {
  const unknown = fixture();
  unknown.usecases[0].status = 'surprise';
  const view = buildBackendReview(read(unknown));
  assert.equal(view.groups[0].items.find(item => item.id === 'usecase:agendarConsulta')?.tone, 'unknown');
  assert.equal(backendTone('surprise'), 'unknown');
  assert.deepEqual(['toCreate', 'toUpdate', 'done', 'toRemove'].map(status => backendTone(status)), ['new', 'change', 'keep', 'remove']);
  assert.deepEqual(['added', 'changed', 'removed'].map(status => backendTone(status, true)), ['new', 'change', 'remove']);
  const duplicate = fixture();
  duplicate.changes.push({ ...duplicate.changes[0] });
  assert.equal(buildBackendReview(read(duplicate)).kind, 'invalid');
  const stale = buildBackendReview(read(fixture()), true);
  assert.equal(stale.kind, 'stale');
  assert.equal(stale.itemCount, 0);
  assert.deepEqual(stale.groups, []);
  assert.equal(buildBackendReview(read(fixture()), false, 'financeiro').errorCode, 'review.backend.context');
});

test('effort v1 and v1.1 keep strict emitted counts and never derive hours', () => {
  const effort = JSON.parse(readFileSync(new URL('../../../../mls-102047/l4/mensalidadesAcademia/tobe/plan/pool/l2/web/effort.json', import.meta.url), 'utf8'));
  const summary = parseEffortSummary(read(effort));
  assert.equal(effort.schemaVersion, EFFORT_SCHEMA_V11);
  assert.equal(summary.kind, 'counts');
  assert.deepEqual(summary.counts.map(count => count.category), ['screens', 'endpoints', 'usecases', 'tables']);
  assert.equal(summary.counts.find(count => count.category === 'tables')?.statuses.find(value => value.status === 'toCreate')?.count, effort.totals.tables.toCreate);
  assert.equal(parseEffortSummary(read({ ...effort, schemaVersion: EFFORT_SCHEMA_V1 })).kind, 'counts');
  assert.equal(parseEffortSummary({ status: 'missing', path: '' }).kind, 'missing');
  assert.equal(parseEffortSummary(read(effort), 'outroModulo').kind, 'invalid');
  assert.equal(parseEffortSummary(read({ ...effort, schemaVersion: '2026-09-21-p2-effort-v2' })).kind, 'invalid');
  assert.equal(parseEffortSummary(read({ ...effort, device: 'mobile' })).kind, 'invalid');
  assert.equal(parseEffortSummary(read({ ...effort, totals: { ...effort.totals, extra: {} } })).kind, 'invalid');
  assert.equal(parseEffortSummary(read({ ...effort, totals: { ...effort.totals, tables: { ...effort.totals.tables, toCreate: -1 } } })).kind, 'invalid');
  assert.equal(parseEffortSummary(read({ ...effort, totals: { ...effort.totals, tables: { ...effort.totals.tables, surprise: 1 } } })).kind, 'invalid');
});
