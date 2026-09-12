/// <mls fileReference="_102035_/l2/agentNewSolution5/replayRealRuns.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseNs4ClassicDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import {
  loadNs5Actors,
  loadNs5Entities,
  loadNs5FixtureJson,
  loadNs5FixtureText,
  loadNs5Journeys,
  loadNs5Module,
  loadNs5OntologyIndex,
  loadNs5OracleSources,
  NS5_REAL_MODULES,
  stripNs5Hashes,
  stripNs5HashSource,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import {
  applyNs5AccessFormNormalizations,
  buildNs5AccessArtifact,
  normalizeNs5AccessPayload,
} from '/_102035_/l2/agentNewSolution5/steps/access60/contracts.js';
import { validateNs5Access } from '/_102035_/l2/agentNewSolution5/steps/access60/gate.js';
import { runNs5Oracle } from '/_102035_/l2/agentNewSolution5/steps/finalize80/gate.js';
import {
  buildNs5IntegrationArtifact,
  normalizeNs5IntegrationPayload,
} from '/_102035_/l2/agentNewSolution5/steps/integration70/contracts.js';
import { validateNs5Integration } from '/_102035_/l2/agentNewSolution5/steps/integration70/gate.js';
import {
  applyNs5InferredActorDrop,
  validateNs5Journeys,
} from '/_102035_/l2/agentNewSolution5/steps/journeys20/gate.js';
import {
  buildNs5JourneyIndex,
  hashNs5Journey,
  normalizeNs5JourneysPayload,
} from '/_102035_/l2/agentNewSolution5/steps/journeys20/contracts.js';
import { normalizeNs5ModuleArtifact } from '/_102035_/l2/agentNewSolution5/steps/module10/contracts.js';
import { validateNs5ModuleArtifact } from '/_102035_/l2/agentNewSolution5/steps/module10/gate.js';
import {
  assembleNs5Ontology,
  normalizeNs5OntologyBindings,
  normalizeNs5OntologyEntity,
  normalizeNs5OntologyPlan,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';
import { validateNs5OntologyBindings } from '/_102035_/l2/agentNewSolution5/steps/ontology30/gate.js';
import {
  buildNs5RulesArtifact,
  normalizeNs5RulesPayload,
} from '/_102035_/l2/agentNewSolution5/steps/rules40/contracts.js';
import { validateNs5Rules } from '/_102035_/l2/agentNewSolution5/steps/rules40/gate.js';
import {
  buildNs5WorkflowsArtifact,
  normalizeNs5WorkflowsPayload,
} from '/_102035_/l2/agentNewSolution5/steps/workflows50/contracts.js';
import { validateNs5Workflows } from '/_102035_/l2/agentNewSolution5/steps/workflows50/gate.js';
import { renderDefsSource, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type {
  Ns5JourneyArtifact,
  Ns5ModuleArtifact,
  Ns5OntologyEntityArtifact,
} from '/_102035_/l2/solution/types.js';

const PROJECT = 102047;

function defsFile(folder: string, shortName: string): Ns5FileInfo {
  return { project: PROJECT, level: 4, folder, shortName, extension: '.defs.ts' };
}

function assertDefsMatch(rendered: string, recorded: string, label: string): void {
  const renderedJson = parseNs4ClassicDefsSource<unknown>(rendered);
  const recordedJson = parseNs4ClassicDefsSource<unknown>(recorded);
  assert.deepEqual(stripNs5Hashes(renderedJson), stripNs5Hashes(recordedJson), `${label} json`);
  assert.equal(stripNs5HashSource(rendered), stripNs5HashSource(recorded), `${label} source`);
}

function render(
  folder: string,
  shortName: string,
  exportName: string,
  value: unknown,
  typeName: string,
): string {
  return renderDefsSource(defsFile(folder, shortName), exportName, value, typeName);
}

function accessView(entities: Ns5OntologyEntityArtifact[]) {
  return entities.map(entity => ({
    entityId: entity.entityId,
    party: entity.party,
    fields: entity.fields.map(field => ({ fieldId: field.fieldId })),
    ...(entity.details ? { details: entity.details } : {}),
    storage: { idField: entity.storage.idField },
    ...(entity.maintenance === 'crud' ? { maintenance: 'crud' as const } : {}),
  }));
}

function workflowJourneyView(journeys: Ns5JourneyArtifact[]) {
  return journeys.map(journey => ({
    journeyId: journey.journeyId,
    business: {
      actorRef: journey.business.actorRef,
      steps: journey.business.steps.map(step => ({
        stepId: step.stepId,
        kind: step.kind,
        entity: step.entity,
        ...(step.handoffTo ? { handoffTo: step.handoffTo } : {}),
      })),
    },
  }));
}

for (const moduleName of NS5_REAL_MODULES) {
  void test(`${moduleName} module10 draft replays to module.defs.ts`, () => {
    const draft = loadNs5FixtureJson<Ns5ModuleArtifact & { actors: unknown[] }>('steps/module10/fixtures', `${moduleName}-draft.json`);
    const { artifact, actors } = normalizeNs5ModuleArtifact(draft, {
      sourcePrompt: draft.sourcePrompt,
      fixedModuleName: moduleName,
    });
    const gate = validateNs5ModuleArtifact(artifact, { fixedModuleName: moduleName, actors });
    assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
    const rendered = render(moduleName, 'module', `${moduleName}Module`, artifact, 'Ns5ModuleArtifact');
    assertDefsMatch(rendered, loadNs5FixtureText('steps/module10/fixtures', `${moduleName}-module.defs.ts`), 'module');
  });

  void test(`${moduleName} journeys20 draft replays to journeys/*.defs.ts`, async () => {
    const draft = loadNs5FixtureJson<{ journeys: unknown[]; systemDecisions?: unknown[] }>(
      'steps/journeys20/fixtures',
      `${moduleName}-draft.json`,
    );
    const actors = loadNs5Actors(moduleName);
    const { journeys } = normalizeNs5JourneysPayload(draft);
    const gate = validateNs5Journeys(journeys, { actors, moduleName });
    assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
    const dropped = applyNs5InferredActorDrop(journeys, actors);
    const artifacts: Ns5JourneyArtifact[] = [];
    for (const journey of dropped.journeys) artifacts.push(await hashNs5Journey(journey));
    const index = buildNs5JourneyIndex(moduleName, artifacts, dropped.systemDecisions);
    for (const artifact of artifacts) {
      const rendered = render(
        `${moduleName}/journeys`,
        artifact.journeyId,
        `${artifact.journeyId}Journey`,
        artifact,
        'Ns5JourneyArtifact',
      );
      assertDefsMatch(
        rendered,
        loadNs5FixtureText('steps/journeys20/fixtures', moduleName, `${artifact.journeyId}.defs.ts`),
        artifact.journeyId,
      );
    }
    const indexRendered = render(
      `${moduleName}/journeys`,
      'index',
      `${moduleName}JourneyIndex`,
      index,
      'Ns5JourneyIndexArtifact',
    );
    assertDefsMatch(
      indexRendered,
      loadNs5FixtureText('steps/journeys20/fixtures', moduleName, 'index.defs.ts'),
      'journey index',
    );
  });

  void test(`${moduleName} ontology30 drafts replay to ontology/*.defs.ts`, () => {
    const planDraft = loadNs5FixtureJson<unknown>('steps/ontology30/fixtures', `${moduleName}-plan-draft.json`);
    const bindingsDraft = loadNs5FixtureJson<unknown>('steps/ontology30/fixtures', `${moduleName}-bindings-draft.json`);
    const journeys = loadNs5Journeys(moduleName);
    const plan = normalizeNs5OntologyPlan(planDraft, moduleName, journeys);
    const details = plan.entities.map(entity => {
      const raw = loadNs5FixtureJson<unknown>('steps/ontology30/fixtures', moduleName, `${entity.entityId}-draft.json`);
      return normalizeNs5OntologyEntity(raw, entity.entityId, journeys, {
        idField: entity.storage.idField,
        kind: entity.kind,
      });
    });
    const bindings = normalizeNs5OntologyBindings(bindingsDraft);
    const gate = validateNs5OntologyBindings(plan, details, bindings, {
      moduleName,
      actors: loadNs5Actors(moduleName),
      journeys,
    });
    assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
    const assembled = assembleNs5Ontology(plan, details, bindings);
    for (const entity of assembled.entities) {
      const rendered = render(
        `${moduleName}/ontology`,
        entity.entityId,
        `${moduleName}Entity${entity.entityId}`,
        entity,
        'Ns5OntologyEntityArtifact',
      );
      assertDefsMatch(
        rendered,
        loadNs5FixtureText('steps/ontology30/fixtures', moduleName, `${entity.entityId}.defs.ts`),
        entity.entityId,
      );
    }
    const indexRendered = render(
      `${moduleName}/ontology`,
      'index',
      `${moduleName}OntologyIndex`,
      assembled.index,
      'Ns5OntologyIndexArtifact',
    );
    assertDefsMatch(
      indexRendered,
      loadNs5FixtureText('steps/ontology30/fixtures', moduleName, 'index.defs.ts'),
      'ontology index',
    );
  });

  void test(`${moduleName} rules40 draft replays to rules.defs.ts`, () => {
    const draft = loadNs5FixtureJson<unknown>('steps/rules40/fixtures', `${moduleName}-draft.json`);
    const { rules } = normalizeNs5RulesPayload(draft);
    const gate = validateNs5Rules(rules, { moduleName });
    assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
    const artifact = buildNs5RulesArtifact(moduleName, rules);
    const rendered = render(moduleName, 'rules', `${moduleName}Rules`, artifact, 'Ns5RulesArtifact');
    assertDefsMatch(rendered, loadNs5FixtureText('steps/rules40/fixtures', `${moduleName}-rules.defs.ts`), 'rules');
  });

  void test(`${moduleName} workflows50 draft replays to workflows.defs.ts`, () => {
    const draft = loadNs5FixtureJson<unknown>('steps/workflows50/fixtures', `${moduleName}-draft.json`);
    const { processes } = normalizeNs5WorkflowsPayload(draft);
    const journeys = loadNs5Journeys(moduleName);
    const entities = loadNs5Entities(moduleName);
    const gate = validateNs5Workflows(processes, {
      moduleName,
      actorIds: loadNs5Actors(moduleName).map(actor => actor.actorId),
      journeys: workflowJourneyView(journeys),
      entities: entities.map(entity => ({
        entityId: entity.entityId,
        transitions: entity.transitions.map(transition => ({ transitionId: transition.transitionId, by: transition.by })),
      })),
    });
    assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
    const artifact = buildNs5WorkflowsArtifact(moduleName, processes);
    const rendered = render(moduleName, 'workflows', `${moduleName}Workflows`, artifact, 'Ns5WorkflowsArtifact');
    assertDefsMatch(rendered, loadNs5FixtureText('steps/workflows50/fixtures', `${moduleName}-workflows.defs.ts`), 'workflows');
  });

  void test(`${moduleName} access60 draft replays to access.defs.ts`, () => {
    const draft = loadNs5FixtureJson<unknown>('steps/access60/fixtures', `${moduleName}-draft.json`);
    const { authorities, grants: rawGrants } = normalizeNs5AccessPayload(draft);
    const actors = loadNs5Actors(moduleName);
    const entities = loadNs5Entities(moduleName);
    const { grants } = applyNs5AccessFormNormalizations(rawGrants, accessView(entities));
    const index = loadNs5OntologyIndex(moduleName);
    const journeys = loadNs5Journeys(moduleName);
    const gate = validateNs5Access(authorities, grants, {
      moduleName,
      actors,
      entities: accessView(entities),
      relationships: index.relationships.map(rel => ({
        relationshipId: rel.relationshipId,
        fromEntity: rel.fromEntity,
        toEntity: rel.toEntity,
        required: rel.required,
      })),
      journeys: journeys.map(journey => ({
        journeyId: journey.journeyId,
        business: { actorRef: journey.business.actorRef },
      })),
    });
    assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
    const artifact = buildNs5AccessArtifact(moduleName, actors, authorities, grants);
    const rendered = render(moduleName, 'access', `${moduleName}Access`, artifact, 'Ns5AccessArtifact');
    assertDefsMatch(rendered, loadNs5FixtureText('steps/access60/fixtures', `${moduleName}-access.defs.ts`), 'access');
  });

  void test(`${moduleName} integration70 draft replays to integration.defs.ts`, () => {
    const draft = loadNs5FixtureJson<unknown>('steps/integration70/fixtures', `${moduleName}-draft.json`);
    const { inbound, outbound, plugins } = normalizeNs5IntegrationPayload(draft);
    const moduleArtifact = loadNs5Module(moduleName);
    const entities = loadNs5Entities(moduleName);
    const gate = validateNs5Integration(inbound, outbound, plugins, {
      moduleName,
      actors: loadNs5Actors(moduleName),
      entities: entities.map(entity => ({ entityId: entity.entityId })),
      registryModuleNames: [],
      sourcePrompt: moduleArtifact.sourcePrompt,
    });
    assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
    const artifact = buildNs5IntegrationArtifact(moduleName, inbound, outbound, plugins);
    const rendered = render(moduleName, 'integration', `${moduleName}Integration`, artifact, 'Ns5IntegrationArtifact');
    assertDefsMatch(
      rendered,
      loadNs5FixtureText('steps/integration70/fixtures', `${moduleName}-integration.defs.ts`),
      'integration',
    );
  });

  void test(`${moduleName} finalize80 oracle on the recorded sources`, () => {
    const sources = loadNs5OracleSources(moduleName);
    const report = runNs5Oracle(sources);
    const recorded = loadNs5FixtureJson<{ finalStatus: string; errors: unknown[]; warnings: unknown[] }>(
      'steps/finalize80/fixtures',
      `${moduleName}-finalize-report.json`,
    );
    assert.equal(
      report.finalStatus,
      'passed',
      report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'),
    );
    assert.equal(report.errors.length, 0);
    assert.equal(recorded.finalStatus, 'passed');
    assert.equal(recorded.errors.length, 0);
  });
}
