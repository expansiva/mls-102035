/// <mls fileReference="_102035_/l2/solution/candidate/moduleVerification.agentsInbound.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
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
import { verifyCandidateModule, type CandidateModule } from '/_102035_/l2/solution/candidate/moduleVerification.js';

const FIXTURE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/agents-d9a7a597');

function defs<T>(name: string): T {
  const source = readFileSync(path.join(FIXTURE, name), 'utf8');
  const json = extractNs4ClassicJsonObject(source);
  if (!json) throw new Error(`no JSON object in ${name}`);
  return JSON.parse(json) as T;
}

/** Agents L4 frozen at commit d9a7a597, byte for byte under fixtures/agents-d9a7a597. */
function agentsModule(): CandidateModule {
  const journeyIndex = defs<Ns5JourneyIndexArtifact>('journeys/index.defs.ts');
  const ontologyIndex = defs<Ns5OntologyAnyIndex>('ontology/index.defs.ts');
  return {
    module: defs<Ns5ModuleArtifact>('module.defs.ts'),
    journeyIndex,
    journeys: journeyIndex.journeys.map(entry => defs<Ns5JourneyArtifact>(`journeys/${entry.journeyId}.defs.ts`)),
    ontologyIndex,
    entities: ns5OntologyEntityIds(ontologyIndex).map(entityId => defs<Ns5OntologyAnyEntity>(`ontology/${entityId}.defs.ts`)),
    rules: defs<Ns5RulesAny>('rules.defs.ts'),
    workflows: defs<Ns5WorkflowsArtifact>('workflows.defs.ts'),
    access: defs<Ns5AccessArtifact>('access.defs.ts'),
    integration: defs<Ns5IntegrationArtifact>('integration.defs.ts'),
  };
}

function inboundWriter(artifacts: CandidateModule): string[] {
  return verifyCandidateModule(artifacts, ['integration'], [])
    .filter(issue => issue.code === 'NS5_INTEGRATION_INBOUND_WRITER')
    .map(issue => issue.message);
}

test('agents L4 at d9a7a597 has no inbound-writer error; dropping cm.record charges ExecutionSummary', () => {
  const artifacts = agentsModule();
  assert.deepEqual(inboundWriter(artifacts), []);

  const integration = structuredClone(artifacts.integration);
  integration.connections = (integration.connections || []).filter(row => !(row.connectionId === 'cm' && row.operationId === 'record'));
  const charged = inboundWriter({ ...artifacts, integration });
  assert.ok(charged.some(message => message.includes('ExecutionSummary')), charged.join('\n'));
});
