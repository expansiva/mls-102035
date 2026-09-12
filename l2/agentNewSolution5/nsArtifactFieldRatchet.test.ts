/// <mls fileReference="_102035_/l2/agentNewSolution5/nsArtifactFieldRatchet.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * One-way ratchet: NS5 human-facing source contracts must not gain a structured key
 * without a non-LLM reader. A new key fails until it is added here with `{ reader, since }`.
 */
interface KeyEntry { reader: string; since: string }

const TYPES = fileURLToPath(new URL('../solution/types.ts', import.meta.url));

const CONTRACTS: Record<string, { file: string; name: string }> = {
  Ns5ModuleActor: { file: TYPES, name: 'Ns5ModuleActor' },
  Ns5ModuleArtifact: { file: TYPES, name: 'Ns5ModuleArtifact' },
  Ns5JourneyStep: { file: TYPES, name: 'Ns5JourneyStep' },
  Ns5JourneyArtifact: { file: TYPES, name: 'Ns5JourneyArtifact' },
  Ns5SystemDecision: { file: TYPES, name: 'Ns5SystemDecision' },
  Ns5JourneyIndexEntry: { file: TYPES, name: 'Ns5JourneyIndexEntry' },
  Ns5JourneyIndexArtifact: { file: TYPES, name: 'Ns5JourneyIndexArtifact' },
  Ns5OntologyEntityArtifact: { file: TYPES, name: 'Ns5OntologyEntityArtifact' },
  Ns5OntologyField: { file: TYPES, name: 'Ns5OntologyField' },
  Ns5OntologyDetail: { file: TYPES, name: 'Ns5OntologyDetail' },
  Ns5OntologyEnumValue: { file: TYPES, name: 'Ns5OntologyEnumValue' },
  Ns5OntologyFieldConstraints: { file: TYPES, name: 'Ns5OntologyFieldConstraints' },
  Ns5OntologyRelationship: { file: TYPES, name: 'Ns5OntologyRelationship' },
  Ns5OntologyIndexArtifact: { file: TYPES, name: 'Ns5OntologyIndexArtifact' },
  Ns5Rule: { file: TYPES, name: 'Ns5Rule' },
  Ns5RulesArtifact: { file: TYPES, name: 'Ns5RulesArtifact' },
  Ns5WorkflowTask: { file: TYPES, name: 'Ns5WorkflowTask' },
  Ns5WorkflowProcess: { file: TYPES, name: 'Ns5WorkflowProcess' },
  Ns5WorkflowsArtifact: { file: TYPES, name: 'Ns5WorkflowsArtifact' },
  Ns5AccessAuthority: { file: TYPES, name: 'Ns5AccessAuthority' },
  Ns5AccessGrant: { file: TYPES, name: 'Ns5AccessGrant' },
  Ns5AccessDataScope: { file: TYPES, name: 'Ns5AccessDataScope' },
  Ns5AccessDisclosure: { file: TYPES, name: 'Ns5AccessDisclosure' },
  Ns5AccessArtifact: { file: TYPES, name: 'Ns5AccessArtifact' },
  Ns5IntegrationItem: { file: TYPES, name: 'Ns5IntegrationItem' },
  Ns5IntegrationPlugin: { file: TYPES, name: 'Ns5IntegrationPlugin' },
  Ns5IntegrationArtifact: { file: TYPES, name: 'Ns5IntegrationArtifact' },
};

const KEYS: Record<string, Record<string, KeyEntry>> = {
  Ns5ModuleActor: {
    actorId: { reader: 'steps/journeys20/gate.ts, steps/access60/gate.ts, finalize80 I3', since: '2026-09-10' },
    kind: { reader: 'steps/journeys20/gate.ts, steps/integration70/contracts.ts, finalize80 I8', since: '2026-09-10' },
    origin: { reader: 'steps/journeys20/gate.ts (inferred-actor drop)', since: '2026-09-10' },
    title: { reader: 'planner / UI', since: '2026-09-10' },
    description: { reader: 'planner / UI', since: '2026-09-10' },
  },
  Ns5ModuleArtifact: {
    schemaVersion: { reader: 'steps/module10/gate.ts', since: '2026-09-10' },
    moduleName: { reader: 'every later step and the registry', since: '2026-09-10' },
    title: { reader: 'planner / UI', since: '2026-09-10' },
    userLanguage: { reader: 'steps/module10/gate.ts, NS4_PHRASES', since: '2026-09-10' },
    productLanguages: { reader: 'steps/module10/gate.ts', since: '2026-09-10' },
    defaultLanguage: { reader: 'steps/module10/gate.ts', since: '2026-09-10' },
    sourcePrompt: { reader: 'resume and /rebuild all', since: '2026-09-10' },
    details: { reader: 'steps/ontology30 persist (typed module aggregates), later screens/backend', since: '2026-09-11' },
  },
  Ns5JourneyStep: {
    stepId: { reader: 'steps/workflows50/gate.ts, finalize80', since: '2026-09-10' },
    kind: { reader: 'steps/journeys20/gate.ts, finalize80 I2 I8', since: '2026-09-10' },
    entity: { reader: 'steps/ontology30/gate.ts, finalize80 I1 I8', since: '2026-09-10' },
    affects: { reader: 'steps/ontology30 collectNs5CitedEntities, finalize80 I1', since: '2026-09-10' },
    title: { reader: 'planner / UI', since: '2026-09-10' },
    description: { reader: 'planner / UI', since: '2026-09-10' },
    handoffTo: { reader: 'steps/journeys20/gate.ts, steps/workflows50, finalize80 I6', since: '2026-09-10' },
  },
  Ns5JourneyArtifact: {
    schemaVersion: { reader: 'steps/journeys20/gate.ts', since: '2026-09-10' },
    journeyId: { reader: 'journeys/index, workflows50.journeyRef', since: '2026-09-10' },
    business: { reader: 'steps/journeys20/gate.ts, finalize80', since: '2026-09-10' },
    businessHash: { reader: 'staleness: journeys20 rewrite vs finalize80', since: '2026-09-10' },
  },
  Ns5SystemDecision: {
    decisionId: { reader: 'journeys/index.defs.ts after inferred-actor drop', since: '2026-09-10' },
    chosen: { reader: 'steps/journeys20/gate.ts', since: '2026-09-10' },
    alternatives: { reader: 'steps/journeys20/gate.ts', since: '2026-09-10' },
    decidedBy: { reader: 'steps/journeys20/gate.ts', since: '2026-09-10' },
  },
  Ns5JourneyIndexEntry: {
    journeyId: { reader: 'ontology30 and access60 read this list', since: '2026-09-10' },
    actorRef: { reader: 'steps/access60/gate.ts, finalize80 I3', since: '2026-09-10' },
    title: { reader: 'planner / UI', since: '2026-09-10' },
  },
  Ns5JourneyIndexArtifact: {
    schemaVersion: { reader: 'steps/journeys20/gate.ts', since: '2026-09-10' },
    moduleName: { reader: 'folder', since: '2026-09-10' },
    journeys: { reader: 'ontology30, access60, finalize80', since: '2026-09-10' },
    systemDecisions: { reader: 'steps/journeys20 persist', since: '2026-09-10' },
  },
  Ns5OntologyEntityArtifact: {
    schemaVersion: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    moduleName: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    entityId: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    title: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    description: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    kind: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    party: { reader: 'steps/ontology30/gate.ts, finalize80 I8', since: '2026-09-10' },
    mdmSubtype: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    displayField: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    fields: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    uniqueKeys: { reader: 'steps/ontology30/gate.ts, finalize80 I9, DDL/upsert lote', since: '2026-09-11' },
    details: { reader: 'typed JSON column, screens, finalize80 I4 details.<name>', since: '2026-09-10' },
    lifecycleStates: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    transitions: { reader: 'steps/ontology30/gate.ts, finalize80', since: '2026-09-10' },
    storage: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    mutability: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
  },
  Ns5OntologyField: {
    fieldId: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    title: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    type: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    required: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    unique: { reader: 'steps/ontology30/gate.ts, DDL unique index', since: '2026-09-11' },
    enum: { reader: 'steps/ontology30/gate.ts, screen select/badge, i18n', since: '2026-09-10' },
    constraints: { reader: 'steps/ontology30/gate.ts, DDL/validation', since: '2026-09-11' },
    description: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
  },
  Ns5OntologyDetail: {
    type: { reader: 'typed JSON column, screens, ontology30 gate', since: '2026-09-11' },
    description: { reader: 'typed JSON column, screens, rules citing details.<name>', since: '2026-09-11' },
  },
  Ns5OntologyEnumValue: {
    value: { reader: 'steps/ontology30/gate.ts, lifecycleStates ⊆ enum.value', since: '2026-09-11' },
    title: { reader: 'screen select/badge, i18n', since: '2026-09-11' },
  },
  Ns5OntologyFieldConstraints: {
    min: { reader: 'steps/ontology30/gate.ts, DDL/validation', since: '2026-09-11' },
    max: { reader: 'steps/ontology30/gate.ts, DDL/validation', since: '2026-09-11' },
    maxLength: { reader: 'steps/ontology30/gate.ts, DDL/validation', since: '2026-09-11' },
    precision: { reader: 'steps/ontology30/gate.ts, DDL/validation', since: '2026-09-11' },
  },
  Ns5OntologyRelationship: {
    relationshipId: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    fromEntity: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    toEntity: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    type: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    description: { reader: 'ontology screen edge label, master frontend', since: '2026-09-11' },
    required: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    persistence: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    realization: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
  },
  Ns5OntologyIndexArtifact: {
    schemaVersion: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    moduleName: { reader: 'folder / registry', since: '2026-09-10' },
    businessDomain: { reader: 'steps/ontology30/gate.ts', since: '2026-09-10' },
    entities: { reader: 'finalize80 coverage', since: '2026-09-10' },
    relationships: { reader: 'steps/ontology30/gate.ts, access60 anchorPath', since: '2026-09-10' },
    systemDecisions: { reader: 'steps/ontology30/gate.ts applyNs5PlatformServiceCandidateDecisions', since: '2026-09-11' },
  },
  Ns5Rule: {
    ruleId: { reader: 'steps/rules40/gate.ts, finalize80 I4, transitions.ruleRefs', since: '2026-09-10' },
    description: { reader: 'steps/rules40/gate.ts', since: '2026-09-10' },
  },
  Ns5RulesArtifact: {
    schemaVersion: { reader: 'steps/rules40/gate.ts', since: '2026-09-10' },
    moduleName: { reader: 'steps/rules40/gate.ts', since: '2026-09-10' },
    rules: { reader: 'steps/rules40/gate.ts, finalize80 I4', since: '2026-09-10' },
  },
  Ns5WorkflowTask: {
    taskId: { reader: 'steps/workflows50/gate.ts', since: '2026-09-10' },
    kind: { reader: 'steps/workflows50/gate.ts', since: '2026-09-10' },
    actorRef: { reader: 'steps/workflows50/gate.ts', since: '2026-09-10' },
    journeyRef: { reader: 'steps/workflows50/gate.ts', since: '2026-09-10' },
    stepRef: { reader: 'steps/workflows50/gate.ts', since: '2026-09-10' },
    next: { reader: 'steps/workflows50/gate.ts', since: '2026-09-10' },
    description: { reader: 'steps/workflows50/gate.ts', since: '2026-09-10' },
  },
  Ns5WorkflowProcess: {
    processId: { reader: 'steps/workflows50/gate.ts', since: '2026-09-10' },
    title: { reader: 'steps/workflows50/gate.ts', since: '2026-09-10' },
    description: { reader: 'steps/workflows50/gate.ts', since: '2026-09-10' },
    tasks: { reader: 'steps/workflows50/gate.ts, finalize80 I6', since: '2026-09-10' },
  },
  Ns5WorkflowsArtifact: {
    schemaVersion: { reader: 'steps/workflows50/gate.ts', since: '2026-09-10' },
    moduleName: { reader: 'steps/workflows50/gate.ts', since: '2026-09-10' },
    processes: { reader: 'steps/workflows50/gate.ts, finalize80 I6', since: '2026-09-10' },
  },
  Ns5AccessAuthority: {
    authorityId: { reader: 'steps/access60/gate.ts', since: '2026-09-10' },
    title: { reader: 'steps/access60/gate.ts', since: '2026-09-10' },
    description: { reader: 'steps/access60/gate.ts', since: '2026-09-10' },
  },
  Ns5AccessGrant: {
    grantId: { reader: 'steps/access60/gate.ts', since: '2026-09-10' },
    actorRef: { reader: 'steps/access60/gate.ts', since: '2026-09-11' },
    authorityRef: { reader: 'steps/access60/gate.ts', since: '2026-09-10' },
    entityRefs: { reader: 'steps/access60/gate.ts', since: '2026-09-10' },
    dataScope: { reader: 'steps/access60/gate.ts, basic backend', since: '2026-09-10' },
    disclosure: { reader: 'steps/access60/gate.ts, basic backend', since: '2026-09-10' },
  },
  Ns5AccessDataScope: {
    mode: { reader: 'steps/access60/gate.ts, basic backend, finalize80 I8', since: '2026-09-10' },
    anchorEntity: { reader: 'steps/access60/gate.ts, basic backend, finalize80 I8', since: '2026-09-10' },
    description: { reader: 'steps/access60/gate.ts', since: '2026-09-10' },
  },
  Ns5AccessDisclosure: {
    mode: { reader: 'steps/access60/gate.ts, basic backend', since: '2026-09-10' },
    allowedFields: { reader: 'basic backend', since: '2026-09-10' },
    deniedFields: { reader: 'basic backend', since: '2026-09-10' },
    description: { reader: 'steps/access60/gate.ts', since: '2026-09-10' },
  },
  Ns5AccessArtifact: {
    schemaVersion: { reader: 'steps/access60/gate.ts', since: '2026-09-10' },
    moduleName: { reader: 'steps/access60/gate.ts', since: '2026-09-10' },
    actors: { reader: 'steps/access60 persist from pipeline, finalize80 I3', since: '2026-09-11' },
    authorities: { reader: 'steps/access60/gate.ts', since: '2026-09-10' },
    grants: { reader: 'steps/access60/gate.ts, basic backend', since: '2026-09-10' },
  },
  Ns5IntegrationItem: {
    id: { reader: 'steps/integration70/gate.ts', since: '2026-09-10' },
    kind: { reader: 'steps/integration70/gate.ts', since: '2026-09-10' },
    from: { reader: 'steps/integration70/gate.ts', since: '2026-09-10' },
    to: { reader: 'steps/integration70/gate.ts', since: '2026-09-10' },
    description: { reader: 'steps/integration70/gate.ts', since: '2026-09-10' },
    entityRefs: { reader: 'steps/integration70/gate.ts', since: '2026-09-10' },
  },
  Ns5IntegrationPlugin: {
    pluginId: { reader: 'steps/integration70/gate.ts', since: '2026-09-10' },
    description: { reader: 'steps/integration70/gate.ts', since: '2026-09-10' },
    entityRefs: { reader: 'steps/integration70/gate.ts', since: '2026-09-10' },
  },
  Ns5IntegrationArtifact: {
    schemaVersion: { reader: 'steps/integration70/gate.ts', since: '2026-09-10' },
    moduleName: { reader: 'steps/integration70/gate.ts', since: '2026-09-10' },
    inbound: { reader: 'steps/integration70/gate.ts, sidecar / basic backend', since: '2026-09-10' },
    outbound: { reader: 'steps/integration70/gate.ts, sidecar / basic backend', since: '2026-09-10' },
    plugins: { reader: 'steps/integration70/gate.ts, sidecar / basic backend', since: '2026-09-10' },
  },
};

function interfaceBody(source: string, name: string): string {
  const match = source.match(new RegExp(`export interface ${name}\\b[^{]*\\{`));
  if (!match || match.index === undefined) throw new Error(`interface ${name} not found`);
  const start = match.index + match[0].length - 1;
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start + 1, index);
    }
  }
  throw new Error(`interface ${name} is unclosed`);
}

function keysOf(body: string): string[] {
  const stripped = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const keys: string[] = [];
  let depth = 0;
  for (const line of stripped.split('\n')) {
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    if (depth === 0) {
      const property = line.match(/^\s+(?:readonly\s+)?([A-Za-z][A-Za-z0-9]*)\??\s*:/);
      if (property) keys.push(property[1]);
    }
    depth += opens - closes;
  }
  return keys;
}

test('NS5 source contracts do not gain a key without a non-LLM reader', () => {
  for (const [artifact, spec] of Object.entries(CONTRACTS)) {
    const source = readFileSync(spec.file, 'utf8');
    const found = keysOf(interfaceBody(source, spec.name));
    const table = KEYS[artifact];
    assert.ok(table, `${artifact} is missing from the ratchet table`);
    const extra = found.filter(key => !(key in table));
    if (extra.length) {
      assert.fail(
        `${artifact} gained structured key(s) without a ratchet entry: ${extra.join(', ')}. `
        + `Add { reader: '<file that reads it without an LLM>', since: 'YYYY-MM-DD' }.`,
      );
    }
    for (const key of found) {
      assert.ok(table[key].reader, `${artifact}.${key} needs a reader`);
      assert.ok(table[key].since, `${artifact}.${key} needs a since date`);
    }
  }
});

test('details and transitions are registered with finalize80 / basic backend readers', () => {
  assert.match(KEYS.Ns5OntologyEntityArtifact.details.reader, /finalize80/);
  assert.match(KEYS.Ns5OntologyEntityArtifact.transitions.reader, /finalize80/);
});

test('ns5_19 uniqueness, typed details, relationship description, enum labels and constraints have readers', () => {
  assert.match(KEYS.Ns5OntologyField.unique.reader, /ontology30\/gate/);
  assert.match(KEYS.Ns5OntologyField.constraints.reader, /DDL/);
  assert.match(KEYS.Ns5OntologyEntityArtifact.uniqueKeys.reader, /finalize80 I9/);
  assert.match(KEYS.Ns5OntologyRelationship.description.reader, /ontology screen/);
  assert.match(KEYS.Ns5OntologyField.enum.reader, /select\/badge/);
  assert.match(KEYS.Ns5ModuleArtifact.details.reader, /typed/);
});

test('rules40 title and appliesTo were removed; I4 reads cited ruleRefs', () => {
  assert.equal('title' in KEYS.Ns5Rule, false);
  assert.equal('appliesTo' in KEYS.Ns5Rule, false);
  assert.match(KEYS.Ns5Rule.ruleId.reader, /finalize80 I4/);
  assert.match(KEYS.Ns5RulesArtifact.rules.reader, /finalize80/);
});

test('module.details is registered with the ontology30 persist as reader', () => {
  assert.match(KEYS.Ns5ModuleArtifact.details.reader, /ontology30/);
  assert.match(KEYS.Ns5ModuleArtifact.details.since, /2026-09-11/);
});

test('workflows50 tasks are registered with the workflows gate as reader', () => {
  assert.match(KEYS.Ns5WorkflowTask.actorRef.reader, /workflows50\/gate/);
  assert.match(KEYS.Ns5WorkflowsArtifact.processes.reader, /finalize80/);
});

test('access60 disclosure fields are registered with the basic backend as reader', () => {
  assert.equal(KEYS.Ns5AccessDisclosure.allowedFields.reader, 'basic backend');
  assert.equal(KEYS.Ns5AccessDisclosure.deniedFields.reader, 'basic backend');
  assert.match(KEYS.Ns5AccessDataScope.anchorEntity.reader, /basic backend/);
});

test('integration70 inbound/outbound/plugins are registered with the sidecar as reader', () => {
  assert.match(KEYS.Ns5IntegrationArtifact.inbound.reader, /sidecar/);
  assert.match(KEYS.Ns5IntegrationArtifact.outbound.reader, /sidecar/);
  assert.match(KEYS.Ns5IntegrationArtifact.plugins.reader, /sidecar/);
  assert.match(KEYS.Ns5IntegrationItem.from.reader, /integration70\/gate/);
  assert.match(KEYS.Ns5IntegrationPlugin.pluginId.reader, /integration70\/gate/);
});

test('module.actors and module.scope were removed; access.actors is the reader', () => {
  assert.equal('actors' in KEYS.Ns5ModuleArtifact, false);
  assert.equal('scope' in KEYS.Ns5ModuleArtifact, false);
  assert.equal('Ns5AccessProfile' in KEYS, false);
  assert.match(KEYS.Ns5AccessArtifact.actors.reader, /finalize80 I3/);
  assert.match(KEYS.Ns5AccessGrant.actorRef.reader, /access60\/gate/);
});

test('module10 and journeys20 contracts are registered with non-LLM readers', () => {
  assert.match(KEYS.Ns5ModuleActor.origin.reader, /journeys20/);
  assert.match(KEYS.Ns5JourneyStep.kind.reader, /finalize80/);
  assert.match(KEYS.Ns5JourneyArtifact.businessHash.reader, /finalize80/);
  assert.match(KEYS.Ns5JourneyIndexArtifact.journeys.reader, /finalize80/);
  assert.match(KEYS.Ns5OntologyIndexArtifact.relationships.reader, /access60/);
});
