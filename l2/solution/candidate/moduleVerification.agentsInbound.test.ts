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
import { NS5_LIFECYCLE_ON_ENTITY } from '/_102035_/l2/solution/gates/finalize80/gate.js';
import { verifyCandidateModule, type CandidateModule } from '/_102035_/l2/solution/candidate/moduleVerification.js';
import { candidateCanPublish, validateV3Candidate } from '/_102035_/l2/solution/candidate/candidateValidation.js';
import type { NewReleaseArtifact, NewReleaseOverlaySources, Ns5TobeArtifactPath } from '/_102035_/l2/solution/candidate/tobePaths.js';

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

function overlayArtifact<T>(relative: Ns5TobeArtifactPath, value: T): NewReleaseArtifact<T> {
  return { path: relative, source: 'asis', value };
}

function agentsOverlay(): NewReleaseOverlaySources {
  const loaded = agentsModule();
  const module = overlayArtifact('module.defs.ts', loaded.module);
  const journeyIndex = overlayArtifact('journeys/index.defs.ts', loaded.journeyIndex);
  const journeys = loaded.journeys.map(row => overlayArtifact(`journeys/${row.journeyId}.defs.ts`, row));
  const ontologyIndex = overlayArtifact('ontology/index.defs.ts', loaded.ontologyIndex);
  const entities = loaded.entities.map(entity => overlayArtifact(`ontology/${entity.entityId}.defs.ts`, entity));
  const rules = overlayArtifact('rules.defs.ts', loaded.rules);
  const workflows = overlayArtifact('workflows.defs.ts', loaded.workflows);
  const access = overlayArtifact('access.defs.ts', loaded.access);
  const integration = overlayArtifact('integration.defs.ts', loaded.integration);
  const all: NewReleaseArtifact<unknown>[] = [module, journeyIndex, ...journeys, ontologyIndex, ...entities, rules, workflows, access, integration];
  return { module, journeyIndex, journeys, ontologyIndex, entities, rules, workflows, access, integration, all };
}

const RELEASE_RULE = 'releaseRuleWithoutReader';

function withReleaseRule(citeOn: string | null): NewReleaseOverlaySources {
  const copy = structuredClone(agentsOverlay());
  const rules = copy.rules.value;
  if (!rules || Array.isArray(rules.rules)) throw new Error('Expected the agents rules map');
  rules.rules = { ...rules.rules, [RELEASE_RULE]: 'A release rule that must be read by the entity it governs.' };
  if (!citeOn) return copy;
  const entity = copy.entities.find(item => item.value?.entityId === citeOn);
  if (!entity?.value || !('rules' in entity.value) || !Array.isArray(entity.value.rules)) {
    throw new Error(`Entity ${citeOn} has no rules list`);
  }
  entity.value.rules = [...entity.value.rules, RELEASE_RULE];
  return copy;
}

test('a new agents rule with no entity blocks publication until an entity cites it', () => {
  const context = { siblingSystems: [] };
  const base = agentsOverlay();
  const orphan = validateV3Candidate(withReleaseRule(null), context, base);
  const fresh = orphan.issues.filter(issue => issue.severity === 'error' && !issue.baseline && issue.path === `rules.${RELEASE_RULE}`);
  assert.equal(fresh.length, 1, JSON.stringify(fresh));
  assert.equal(fresh[0]?.code, 'NS5_FINALIZE_I4');
  assert.match(fresh[0]?.message || '', /Cite the rule id in `rules` of the entity it governs/);
  assert.equal(candidateCanPublish(orphan, ['oracle']), false);

  const cited = validateV3Candidate(withReleaseRule('Agent'), context, agentsOverlay());
  const extra = cited.issues.filter(issue => issue.severity === 'error' && !issue.baseline);
  assert.deepEqual(extra, [], extra.map(issue => `${issue.code} ${issue.path}`).join('; '));
  assert.equal(candidateCanPublish(cited, ['oracle']), true);
});

const CATALOG_WITHOUT_PROMPT = `
  export interface CmListAgentsOutput { agents: CmAgentCard[]; }
  export interface CmAgentCard { name: string; situation: string; }
`;

test('agents-d9a7a597 surfaces an unread AgentDraft field as an oracle warning', () => {
  const validation = validateV3Candidate(agentsOverlay(), {
    siblingSystems: [],
    connectionSources: { cm: CATALOG_WITHOUT_PROMPT },
  });
  const prompt = validation.issues.filter(issue => issue.code === 'EXTERNAL_FIELD_NOT_DELIVERED' && issue.path === 'ontology.AgentDraft.prompt');
  assert.equal(prompt.length, 1);
  assert.equal(prompt[0]?.severity, 'warning');
  assert.equal(prompt[0]?.source, 'oracle');
  assert.equal(prompt[0]?.baseline, undefined);
  assert.equal(validation.issues.some(issue => issue.severity === 'error' && issue.path === 'ontology.AgentDraft.prompt'), false);
});

test('agents L4 at d9a7a597 has no inbound-writer error; dropping cm.record charges ExecutionSummary', () => {
  const artifacts = agentsModule();
  assert.deepEqual(inboundWriter(artifacts), []);

  const integration = structuredClone(artifacts.integration);
  integration.connections = (integration.connections || []).filter(row => !(row.connectionId === 'cm' && row.operationId === 'record'));
  const charged = inboundWriter({ ...artifacts, integration });
  assert.ok(charged.some(message => message.includes('ExecutionSummary')), charged.join('\n'));
});

test('a draft that moves out of external with a decide and no lifecycle charges the entity, not the journey', () => {
  const artifacts = agentsModule();
  const draft = structuredClone(artifacts.entities.find(entity => entity.entityId === 'AgentDraft')) as unknown as Record<string, unknown>;
  draft.kind = 'entity';
  delete draft.connectionId;
  const entities = artifacts.entities.map(entity => entity.entityId === 'AgentDraft' ? draft as unknown as Ns5OntologyAnyEntity : entity);
  const issues = verifyCandidateModule({ ...artifacts, entities }, ['journeys', 'integration'], [])
    .filter(issue => issue.code === 'NS5_FINALIZE_I2' || issue.code === 'NS5_FINALIZE_I1');
  const decide = issues.filter(issue => issue.message.includes('needs at least two transitions'));
  assert.equal(decide.length, 1, issues.map(issue => `${issue.code} ${issue.path} ${issue.message}`).join('\n'));
  assert.ok((decide[0]?.message ?? '').endsWith(NS5_LIFECYCLE_ON_ENTITY), decide[0]?.message);
});
