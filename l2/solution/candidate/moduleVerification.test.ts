/// <mls fileReference="_102035_/l2/solution/candidate/moduleVerification.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { ns5OntologyEntityIds, type Ns5OntologyAnyIndex } from '/_102035_/l2/solution/ontologyView.js';
import { loadNs5Defs } from '/_102035_/l2/solution/testing/ns5RealFixtures.test.js';
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
import {
  CANDIDATE_GATE_KINDS,
  assembleCandidateModule,
  classifyCandidateIssues,
  freshCandidateIssues,
  verifyCandidateModule,
  type CandidateModule,
} from '/_102035_/l2/solution/candidate/moduleVerification.js';

function tarefasDefs<T>(name: string): T {
  return loadNs5Defs<T>('fixtures/finalize80', 'tarefas', name);
}

function tarefasModule(): CandidateModule {
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

test('tarefas v3 has no fresh gate error', () => {
  const artifacts = tarefasModule();
  const baseline = verifyCandidateModule(artifacts, CANDIDATE_GATE_KINDS);
  const fresh = freshCandidateIssues(classifyCandidateIssues(baseline, verifyCandidateModule(artifacts, CANDIDATE_GATE_KINDS)));
  assert.deepEqual(fresh, [], fresh.map(issue => `${issue.kind} ${issue.code} ${issue.path}`).join('; '));
  assert.equal(baseline.filter(issue => issue.kind === 'coherence').length, 0);
});

test('a new rules error blocks and an error already on the module does not', () => {
  const artifacts = tarefasModule();
  const baseline = verifyCandidateModule(artifacts, CANDIDATE_GATE_KINDS);
  const stale = classifyCandidateIssues(baseline, verifyCandidateModule(artifacts, CANDIDATE_GATE_KINDS));
  assert.equal(freshCandidateIssues(stale).length, 0);
  assert.ok(stale.filter(issue => issue.baseline).length === baseline.length);

  const catalog = artifacts.rules as { rules: { ruleId: string; description: string }[] };
  const broken = assembleCandidateModule(artifacts, [{
    mode: 'model',
    kind: 'rules',
    artifact: {
      files: [{
        id: 'rules',
        artifact: { ...artifacts.rules, rules: [...catalog.rules, { ruleId: 'semDescricao', description: '' }] },
      }],
    },
  }]);
  const fresh = freshCandidateIssues(classifyCandidateIssues(baseline, verifyCandidateModule(broken, CANDIDATE_GATE_KINDS)));
  assert.ok(fresh.some(issue => issue.code === 'NS5_RULES_DESCRIPTION'), fresh.map(issue => `${issue.kind} ${issue.code}`).join(','));
});
