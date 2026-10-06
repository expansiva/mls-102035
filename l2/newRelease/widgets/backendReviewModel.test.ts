/// <mls fileReference="_102035_/l2/newRelease/widgets/backendReviewModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { reviewArtifactFile, type ReviewArtifactRead } from '../helpers/backendReader.js';
import {
  POOL_BACKEND_SCHEMA_VERSION,
  POOL_EFFORT_SCHEMA_VERSION,
  type PoolBackendFile,
  type PoolEffortFile,
  type PoolTestSupportItem,
} from '/_102035_/l2/solution/poolPlan.js';
import { backendTone, buildBackendReview, parseEffortSummary } from './backendReviewModel.js';
import { buildReviewView } from './reviewModel.js';

function read(value: unknown): ReviewArtifactRead {
  return { status: 'ok', path: 'l4/agendaClinica/pool/l2/web/backend.json', value };
}

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
}

function fixture() {
  return {
    schemaVersion: POOL_BACKEND_SCHEMA_VERSION, moduleName: 'agendaClinica', device: 'web',
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
    testSupport: [] as PoolTestSupportItem[],
    meta: { unmappedChanges: [{ changeId: 'unknown:source', kind: 'unknown', source: 'extra.defs.ts' }] },
  };
}

function supportItem(patch: Partial<PoolTestSupportItem> = {}): PoolTestSupportItem {
  return {
    id: 'data:Consulta', actorRefs: ['recepcao'], entityRefs: ['Consulta'], sourceRefs: ['grant:agendar'],
    status: 'toCreate', owner: 'L1', executorRef: '', cleanupRef: '', gap: '',
    ...patch,
  };
}

test('reader resolves the selected project and module, not Studio globals', () => {
  assert.deepEqual(reviewArtifactFile(102047, 'agendaClinica', 'backend'), {
    project: 102047, level: 4, folder: 'agendaClinica/pool/l2/web', shortName: 'backend', extension: '.json',
  });
});

test('ui_06 fixture v1.2 completa is consumed without inventing changes', () => {
  const real = loadFixture('mensalidadesAcademia-backend-v1_2.json') as PoolBackendFile;
  const view = buildBackendReview(read(real));
  assert.equal(view.kind, 'ready');
  assert.equal(view.schemaVersion, POOL_BACKEND_SCHEMA_VERSION);
  assert.ok(view.groups.length > 0);
  assert.equal(view.itemCount, real.tables.length + real.usecases.length + real.ports.length + real.endpoints.length + real.removed.length + real.changes.length + real.meta.unmappedChanges.length);
  assert.ok(view.unassociated.some(item => item.noTable === 'mdm'));
  assert.deepEqual(view.testSupport.map(group => group.owner), ['L1', 'runtime']);
  const shown = view.testSupport.flatMap(group => group.groups.flatMap(status => status.items));
  assert.equal(shown.length, real.testSupport.length);
  assert.ok(shown.some(item => item.gap.length > 0));
  assert.deepEqual(shown.find(item => item.id === real.testSupport[0].id), real.testSupport[0]);
});

test('ui_06 v1.1 recusada gives invalid without reading a bench file', () => {
  const v11 = { ...fixture(), schemaVersion: '2026-09-21-p1-backend-v1.1' };
  const view = buildBackendReview(read(v11));
  assert.equal(view.kind, 'invalid');
  assert.equal(view.errorCode, 'review.backend.schema');
  assert.equal(view.itemCount, 0);
});

test('two real menu authorities do not filter the module-wide backend', () => {
  const menu = loadFixture('mensalidadesAcademia-menu-v2_2.json') as { authorities: Record<string, unknown> };
  const backend = loadFixture('mensalidadesAcademia-backend-v1_2.json');
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

test('v1.2 explicit associations make one shared item and keep all no-table items visible', () => {
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

test('ui_06 testSupport vazio is a ready view with an empty group', () => {
  const view = buildBackendReview(read(fixture()));
  assert.equal(view.kind, 'ready');
  assert.deepEqual(view.testSupport, []);
});

test('ui_06 item com gap stays on the item and groups by owner then status', () => {
  const body = fixture();
  body.testSupport = [
    supportItem({ id: 'data:runtime', owner: 'runtime', status: 'done', gap: 'cleanup missing' }),
    supportItem({ id: 'data:l1', owner: 'L1', status: 'toCreate', gap: 'executor missing' }),
    supportItem({ id: 'data:l1-done', owner: 'L1', status: 'done', gap: '' }),
  ];
  const view = buildBackendReview(read(body));
  assert.equal(view.kind, 'ready');
  assert.deepEqual(view.testSupport.map(group => group.owner), ['L1', 'runtime']);
  assert.deepEqual(view.testSupport[0].groups.map(group => group.status), ['toCreate', 'done']);
  const l1 = view.testSupport[0].groups[0].items[0];
  assert.equal(l1.id, 'data:l1');
  assert.equal(l1.gap, 'executor missing');
  assert.deepEqual(l1.actorRefs, ['recepcao']);
  assert.equal(view.testSupport[1].groups[0].items[0].gap, 'cleanup missing');
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
  assert.deepEqual(stale.testSupport, []);
  assert.equal(buildBackendReview(read(fixture()), false, 'financeiro').errorCode, 'review.backend.context');
});

test('ui_06 effort v1.2 shows totals without a calculated cost and v1.1 is refused', () => {
  const effort = loadFixture('mensalidadesAcademia-effort-v1_2.json') as PoolEffortFile;
  const summary = parseEffortSummary(read(effort));
  assert.equal(effort.schemaVersion, POOL_EFFORT_SCHEMA_VERSION);
  assert.equal(summary.kind, 'counts');
  assert.deepEqual(summary.counts.map(count => count.category), ['screens', 'endpoints', 'usecases', 'tables']);
  assert.equal(summary.counts.find(count => count.category === 'tables')?.statuses.find(value => value.status === 'toCreate')?.count, effort.totals.tables.toCreate);
  assert.deepEqual(summary.totals, effort.totals);
  assert.equal(JSON.stringify(summary).includes('hour'), false);
  assert.equal(parseEffortSummary(read({ ...effort, schemaVersion: '2026-09-21-p2-effort-v1.1' })).kind, 'invalid');
  assert.equal(parseEffortSummary(read({ ...effort, schemaVersion: '2026-09-21-p2-effort-v1' })).kind, 'invalid');
  assert.equal(parseEffortSummary({ status: 'missing', path: '' }).kind, 'missing');
  assert.equal(parseEffortSummary(read(effort), 'outroModulo').kind, 'invalid');
  assert.equal(parseEffortSummary(read({ ...effort, schemaVersion: '2026-09-21-p2-effort-v2' })).kind, 'invalid');
  assert.equal(parseEffortSummary(read({ ...effort, device: 'mobile' })).kind, 'invalid');
  assert.equal(parseEffortSummary(read({ ...effort, totals: { ...effort.totals, extra: {} } })).kind, 'invalid');
  assert.equal(parseEffortSummary(read({ ...effort, totals: { ...effort.totals, tables: { ...effort.totals.tables, toCreate: -1 } } })).kind, 'invalid');
  assert.equal(parseEffortSummary(read({ ...effort, totals: { ...effort.totals, tables: { ...effort.totals.tables, surprise: 1 } } })).kind, 'invalid');
});

test('ui_06 campo de identidade', () => {
  const pairs = [
    ['tables', 'tableId'],
    ['usecases', 'usecaseId'],
    ['ports', 'portId'],
    ['endpoints', 'route'],
    ['removed', 'id'],
    ['changes', 'changeId'],
    ['testSupport', 'id'],
  ] as const;
  const real = loadFixture('mensalidadesAcademia-backend-v1_2.json') as Record<string, unknown>;
  for (const [list, field] of pairs) {
    const copy = structuredClone(real) as Record<string, Array<Record<string, unknown>>>;
    const rows = copy[list];
    if (rows.length === 0) {
      const tableId = String(copy.tables[0].tableId);
      rows.push(list === 'removed'
        ? { kind: 'usecase', id: 'legacy', status: 'toRemove', reason: 'r', tableRefs: [], noTable: 'none' }
        : { changeId: 'c1', kind: 'field', op: 'changed', entity: 'E', tableRefs: [tableId], noTable: 'ok', usecaseRefs: [], reason: 'r', source: 's' });
    }
    rows[0][field] = 42;
    assert.equal(buildBackendReview(read(copy)).kind, 'invalid', `${list}.${field}`);
  }
  const effort = structuredClone(loadFixture('mensalidadesAcademia-effort-v1_2.json')) as {
    totals: { screens: { toCreate: unknown } };
  };
  effort.totals.screens.toCreate = '1';
  assert.equal(parseEffortSummary(read(effort)).kind, 'invalid');
});
