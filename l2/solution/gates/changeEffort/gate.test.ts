import assert from 'node:assert/strict';
import test from 'node:test';
import { CHANGE_EFFORT_SCHEMA_VERSION, type ChangeEffortFile, type EffortAnswer, type EffortMaster } from '/_102035_/l2/solution/poolPlan.js';
import { mergeChangeEffort, validateChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';

const l2: EffortMaster = { project: '102020', kind: 'l2', device: 'web' };
const l1: EffortMaster = { project: '102021', kind: 'l1', device: 'web' };

const page = { kind: 'page' as const, id: 'agenda_diaria', path: 'pages/agenda_diaria' };
const usecase = { kind: 'usecase' as const, id: 'registrarAtendimento', path: 'usecases/registrarAtendimento' };

function answer(master: EffortMaster, partial: Partial<EffortAnswer> & Pick<EffortAnswer, 'status'>): EffortAnswer {
  return {
    master,
    item: 'rule:anotacao',
    regenerateDefs: [],
    materialize: [],
    runAgents: [],
    ...partial,
  };
}

function file(overrides: Partial<ChangeEffortFile> = {}): ChangeEffortFile {
  const perItem = overrides.perItem ?? [{
    item: 'rule:anotacao',
    answers: [
      answer(l2, { status: 'computed', materialize: [page] }),
      answer(l1, { status: 'computed', regenerateDefs: [page], materialize: [usecase] }),
    ],
  }];
  const merged = overrides.merged ?? mergeChangeEffort(perItem);
  return {
    schemaVersion: CHANGE_EFFORT_SCHEMA_VERSION,
    module: 'agendaClinica',
    base: { baseId: 'base-1', revisionId: 'rev-1', candidateRoot: 'tobe/plan' },
    request: {
      text: 'anotação obrigatória',
      items: [{
        changeId: 'rule:anotacao',
        kind: 'rule',
        op: 'changed',
        entity: 'Consulta',
        source: 'rules/anotacao',
      }],
    },
    masters: [l2, l1],
    perItem,
    merged,
    untouched: { count: 4, sealHash: 'sha256:abc' },
    status: merged.abend.length > 0 ? 'blocked' : 'simple',
    ...overrides,
  };
}

test('aceita um changeEffort cujo merged é a união das respostas', () => {
  const result = validateChangeEffort(file());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.file.merged.regenerateDefs, [page]);
  assert.deepEqual(result.file.merged.materialize, [usecase]);
  assert.deepEqual(result.file.merged.abend, []);
  assert.equal(result.file.status, 'simple');
});

test('rejeita merged divergente do recalculado', () => {
  const value = file();
  value.merged = { ...value.merged, materialize: [page, usecase] };
  const result = validateChangeEffort(value);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(result.issues, [{ code: 'merged-mismatch', path: 'merged' }]);
});

test('rejeita status incoerente com merged.abend', () => {
  const perItem = [{
    item: 'rule:anotacao',
    answers: [
      answer(l2, { status: 'abend', abend: { reason: 'nada a manter' } }),
    ],
  }];
  const value = file({
    perItem,
    merged: mergeChangeEffort(perItem),
    status: 'simple',
  });
  const result = validateChangeEffort(value);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(result.issues, [{ code: 'status', path: 'status' }]);
});
