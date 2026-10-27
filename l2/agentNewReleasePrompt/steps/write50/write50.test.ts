/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/write50/write50.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractNs4ClassicJsonObject } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import { changedNrpPaths, nrpReport, replaceDefsJsonLiteral } from '/_102035_/l2/agentNewReleasePrompt/steps/write50/write50.js';

const TAREFA = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../solution/fixtures/finalize80/tarefas/ontology/Tarefa.defs.ts',
);

void test('a field change rewrites one defs file and only that field line', () => {
  const source = readFileSync(TAREFA, 'utf8');
  const entity = JSON.parse(extractNs4ClassicJsonObject(source)) as {
    entityId: string;
    record: { fields: { prioridade: { required: boolean } } };
  };
  const before = { entities: [entity], ontologyIndex: { entities: [{ entityId: 'Tarefa' }] } } as unknown as NrpModuleArtifacts;
  const nextEntity = JSON.parse(JSON.stringify(entity)) as typeof entity;
  nextEntity.record.fields.prioridade.required = false;
  const after = { entities: [nextEntity], ontologyIndex: before.ontologyIndex } as unknown as NrpModuleArtifacts;
  assert.deepEqual(changedNrpPaths(before, after), ['ontology/Tarefa.defs.ts']);
  const patched = replaceDefsJsonLiteral(source, nextEntity);
  assert.match(patched, /fileReference="_102035_\/l2\/solution\/fixtures\/finalize80\/tarefas\/ontology\/Tarefa\.defs\.ts"/);
  assert.match(patched, /export const tarefasEntityTarefa/);
  const beforeLines = source.split('\n');
  const afterLines = patched.split('\n');
  const changed = afterLines.filter((line, index) => line !== beforeLines[index]);
  assert.deepEqual(changed, ['        "required": false,']);
  const report = nrpReport({
    moduleName: 'tarefas', project: 1, request: 'Make priority optional.',
    triage: { valid: true, reason: null, clarification: null, artifacts: ['ontology'], targets: ['Tarefa'], intent: 'Optional.', mechanical: [], mechanicalOnly: false },
    artifacts: after, applied: [], issues: [], allowWrite: true, modelCalls: 2,
  }, { written: true, reason: null, files: ['ontology/Tarefa.defs.ts'] });
  assert.equal(report.calls, 2);
  assert.equal(report.costUsd, null);
  const checks = report.checks as Array<{ kind: string; result: string }>;
  assert.equal(checks.some(row => row.kind === 'rules' && row.result === 'passed'), true);
});
