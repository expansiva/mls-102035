/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/gate40/gate40.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import { applyNrpMechanical } from '/_102035_/l2/agentNewReleasePrompt/helpers/mechanical.js';
import {
  buildNrpRepairHumanPrompt,
  buildNrpRepairTool,
  checkNrpGates,
  classifyNrpGateIssues,
  nrpFreshIssues,
  nrpGateAction,
  nrpIssueOwner,
  nrpMayWrite,
  type NrpGateIssue,
} from '/_102035_/l2/agentNewReleasePrompt/helpers/releaseGate.js';
import { nrpFileScope } from '/_102035_/l2/agentNewReleasePrompt/steps/edit30/edit30.js';
import { planNrpPersistence } from '/_102035_/l2/agentNewReleasePrompt/steps/write50/write50.js';
import { NRP_ARTIFACT_KINDS } from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';
import { extractNs4ClassicJsonObject } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import { ns5OntologyEntityIds, type Ns5OntologyAnyIndex } from '/_102035_/l2/solution/ontologyView.js';
import type {
  Ns5AccessArtifact,
  Ns5IntegrationArtifact,
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleArtifact,
  Ns5OntologyAnyEntity,
  Ns5RulesAny,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';

const REQUEST = 'Priority becomes optional and, when omitted, defaults to medium.';

function failingRules(): NrpModuleArtifacts {
  return {
    module: { moduleName: 'sample', sourcePrompt: '' },
    journeyIndex: { journeys: [] },
    journeys: [],
    ontologyIndex: { entities: [] },
    entities: [],
    rules: {
      schemaVersion: '2026-09-16-ns5-rules-v2',
      moduleName: 'sample',
      rules: { BadId: '' },
    },
    workflows: { processes: [] },
    access: { actors: [], grants: [] },
    integration: { inbound: [], outbound: [], plugins: [] },
  } as unknown as NrpModuleArtifacts;
}

void test('a failing artifact is not written, and the repair sees the whole request', () => {
  const issues = checkNrpGates(failingRules(), ['rules']);
  assert.equal(issues.some(issue => issue.kind === 'rules' && issue.code === 'NS5_RULES_ID'), true);
  const repair = nrpGateAction(issues, ['rules'], []);
  assert.equal(repair.action, 'repair');
  assert.equal(repair.kind, 'rules');
  const human = buildNrpRepairHumanPrompt(REQUEST, 'rules', issues, failingRules().rules);
  assert.equal(human.includes(REQUEST), true);
  const tool = buildNrpRepairTool();
  assert.equal(tool.function.name, 'submitNrpEdit');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
  const second = nrpGateAction(issues, ['rules'], ['rules']);
  assert.equal(second.action, 'stop');
  assert.equal(nrpMayWrite(second.action), false);
  const plan = planNrpPersistence(false, ['rules.defs.ts', 'pipeline/newReleasePrompt.json']);
  assert.equal(plan.written, false);
  assert.deepEqual(plan.files, []);
  assert.equal(plan.reason, 'Verification failed. Nothing was written.');
});

const TAREFAS = join(dirname(fileURLToPath(import.meta.url)), '../../../solution/fixtures/finalize80/tarefas');

function tarefasDefs<T>(name: string): T {
  const source = readFileSync(join(TAREFAS, name), 'utf8');
  const json = extractNs4ClassicJsonObject(source);
  if (!json) throw new Error(`no JSON in ${name}`);
  return JSON.parse(json) as T;
}

function tarefasModule(): NrpModuleArtifacts {
  const journeyIndex = tarefasDefs<Ns5JourneyIndexArtifact>('journeys/index.defs.ts');
  const ontologyIndex = tarefasDefs<Ns5OntologyAnyIndex>('ontology/index.defs.ts');
  return {
    module: tarefasDefs<Ns5ModuleArtifact>('module.defs.ts'),
    journeyIndex,
    journeys: journeyIndex.journeys.map(entry => tarefasDefs<Ns5JourneyArtifact>(`journeys/${entry.journeyId}.defs.ts`)),
    ontologyIndex,
    entities: ns5OntologyEntityIds(ontologyIndex).map(entityId => tarefasDefs<Ns5OntologyAnyEntity>(`ontology/${entityId}.defs.ts`)),
    rules: tarefasDefs<Ns5RulesAny>('rules.defs.ts'),
    workflows: tarefasDefs<Ns5WorkflowsArtifact>('workflows.defs.ts'),
    access: tarefasDefs<Ns5AccessArtifact>('access.defs.ts'),
    integration: tarefasDefs<Ns5IntegrationArtifact>('integration.defs.ts'),
  };
}

function counts(issues: readonly NrpGateIssue[]): string {
  const byKind = new Map<string, number>();
  for (const issue of issues) byKind.set(issue.kind, (byKind.get(issue.kind) || 0) + 1);
  return [...byKind.entries()].map(([kind, count]) => `${kind}=${count}`).join(', ') || 'none';
}

void test('the tarefas fixture has no new gate error, and an edit that keeps it does not block', () => {
  const artifacts = tarefasModule();
  const baseline = checkNrpGates(artifacts, NRP_ARTIFACT_KINDS);
  const same = classifyNrpGateIssues(baseline, checkNrpGates(artifacts, NRP_ARTIFACT_KINDS));
  const fresh = nrpFreshIssues(same);
  assert.deepEqual(fresh, [], `new errors: ${fresh.map(issue => `${issue.kind} ${issue.code} ${issue.path}`).join('; ')}`);
  console.log(`[s3b] tarefas baseline ${baseline.length}: ${counts(baseline)}`);
  for (const issue of baseline) console.log(`[s3b] baseline ${issue.kind} ${issue.code} ${issue.path}`);
  const edited = applyNrpMechanical(artifacts, [
    { op: 'setScalar', targetId: 'Tarefa', fieldId: 'title', value: 'Tarefa' },
  ]).artifacts;
  const after = classifyNrpGateIssues(baseline, checkNrpGates(edited, NRP_ARTIFACT_KINDS));
  assert.equal(nrpFreshIssues(after).length, 0);
  assert.equal(nrpGateAction(after, ['ontology'], []).action, 'write');
  const journeyError: NrpGateIssue = {
    kind: 'coherence',
    code: 'I1',
    message: 'Unknown journey duplicarTarefa.',
    path: 'journeys/index.duplicarTarefa',
  };
  assert.equal(nrpIssueOwner(journeyError), 'journeys');
  const repairJourney = nrpGateAction([journeyError], ['rules', 'journeys'], []);
  assert.equal(repairJourney.action, 'repair');
  assert.equal(repairJourney.kind, 'journeys');
  const broken = tarefasModule();
  (broken.rules as { rules: Record<string, string> }).rules = { edicaoNaoMudaSituacao: 'Editar não muda a situação.' };
  broken.journeyIndex = {
    ...broken.journeyIndex,
    journeys: [...broken.journeyIndex.journeys, { journeyId: 'duplicarTarefa', actorRef: 'gestor', title: 'Duplicar' }],
  } as NrpModuleArtifacts['journeyIndex'];
  const scope = nrpFileScope(broken, 'journeys', {
    valid: true, reason: null, clarification: null, artifacts: ['rules', 'journeys'],
    targets: ['Tarefa', 'edicaoNaoMudaSituacao', 'duplicarTarefa'],
    intent: 'Duplicate a task.', mechanical: [], mechanicalOnly: false,
  });
  const allowed = [...scope.present, ...scope.creates.filter(id => !scope.present.includes(id))];
  assert.equal(allowed.includes('duplicarTarefa'), true);
  assert.equal(allowed.includes('index'), true);
  assert.equal(allowed.includes('edicaoNaoMudaSituacao'), false);
  const human = buildNrpRepairHumanPrompt('Duplicate a task.', 'journeys', [journeyError], scope.files, allowed);
  assert.match(human, /Allowed files: .*duplicarTarefa/);
  assert.equal(human.includes('edicaoNaoMudaSituacao'), false);
  assert.equal(after.some(issue => issue.baseline), baseline.length > 0);
});
