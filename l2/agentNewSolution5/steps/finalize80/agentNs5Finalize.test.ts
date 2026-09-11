/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/finalize80/agentNs5Finalize.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102035_/l2/agentNewSolution5/agentNewSolution5.js';
import { markNs5Complete, nextNs5RunNn } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import { NS5_STEP_HOOKS } from '/_102035_/l2/agentNewSolution5/helpers/ns5Dispatch.js';
import { buildSolutionRegistryModuleBlock } from '/_102035_/l2/solution/lib.js';
import type { Ns5JourneyArtifact, Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';
import { collectNs5LifecycleSignal } from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';
import {
  ensureConfigListsModule,
  type Ns5OracleSources,
} from '/_102035_/l2/agentNewSolution5/steps/finalize80/contracts.js';
import { afterNs5FinalizePromptStep, beforeNs5FinalizePromptStep } from '/_102035_/l2/agentNewSolution5/steps/finalize80/agentNs5Finalize.js';
import { runNs5Oracle } from '/_102035_/l2/agentNewSolution5/steps/finalize80/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function loadSources(name: string): Ns5OracleSources {
  return JSON.parse(readFileSync(path.join(HERE, 'fixtures', name), 'utf8')) as Ns5OracleSources;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

void test('converted comandaRestaurante evidence passes I1–I6 with no warnings', () => {
  const report = runNs5Oracle(loadSources('comandaRestaurante.json'));
  assert.equal(report.finalStatus, 'passed', report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  assert.equal(report.errors.length, 0);
  assert.equal(report.warnings.length, 0);
  assert.ok(report.checks.every(check => check.status === 'passed'));
});

void test('converted ordenServicio evidence passes I1–I6 with no warnings', () => {
  const report = runNs5Oracle(loadSources('ordenServicio.json'));
  assert.equal(report.finalStatus, 'passed', report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  assert.equal(report.errors.length, 0);
  assert.equal(report.warnings.length, 0);
  assert.ok(report.checks.every(check => check.status === 'passed'));
});

void test('I1 fails when a journey step names an unknown entity', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  sources.journeys[0].business.steps[0].entity = 'Ghost';
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'failed');
  assert.ok(report.errors.some(issue => issue.code === 'NS5_FINALIZE_I1' && /Ghost/.test(issue.message)));
});

void test('I2 uses ontology30 collectNs5LifecycleSignal without changing messages', () => {
  const sources = loadSources('comandaRestaurante.json');
  assert.equal(collectNs5LifecycleSignal(sources.journeys, 'Comanda').requiresTransitions, true);
  assert.equal(collectNs5LifecycleSignal(sources.journeys, 'ItemComanda').requiresTransitions, true);
  const report = runNs5Oracle(sources);
  assert.equal(report.errors.filter(issue => issue.code === 'NS5_FINALIZE_I2').length, 0);
});

void test('I2 fails when a later act has no matching transition', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  const comanda = sources.entities.find(entity => entity.entityId === 'Comanda')!;
  comanda.transitions = [];
  for (const rule of sources.rules.rules) {
    rule.appliesTo.transitionRefs = rule.appliesTo.transitionRefs.filter(ref => ref !== 'Comanda.fecharComanda');
  }
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'failed');
  assert.ok(report.errors.some(issue => issue.code === 'NS5_FINALIZE_I2' && /closeTab/.test(issue.message)));
  assert.equal(report.errors.every(issue => issue.code === 'NS5_FINALIZE_I2'), true, report.errors.map(issue => `${issue.code} ${issue.message}`).join('\n'));
});

void test('I2 fails a decide without two transitions from the same origin (task_6da10605 shape)', () => {
  const sources = clone(loadSources('ordenServicio.json'));
  const quote = sources.entities.find(entity => entity.entityId === 'Presupuesto')!;
  quote.lifecycleStates = [];
  quote.transitions = [];
  quote.mutability = 'appendOnly';
  for (const rule of sources.rules.rules) rule.appliesTo.transitionRefs = [];
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'failed');
  assert.equal(report.errors.every(issue => issue.code === 'NS5_FINALIZE_I2'), true, report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  const decide = report.errors.find(issue => /decideQuote/.test(issue.message));
  assert.ok(decide, report.errors.map(issue => `${issue.path}: ${issue.message}`).join('\n'));
  assert.match(decide.message, /two transitions from the same origin state/);
});

void test('I3 fails when an actor has no profile', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  sources.access.profiles = sources.access.profiles.filter(profile => profile.profileId !== 'caixa');
  sources.access.grants = sources.access.grants.filter(grant => grant.profileRef !== 'caixa');
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'failed');
  assert.ok(report.errors.some(issue => issue.code === 'NS5_FINALIZE_I3' && /caixa/.test(issue.message)));
});

void test('I4 warns when a rule is not referenced by transition, journey, grant or details', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  sources.rules.rules.push({
    ruleId: 'orphanHint',
    title: 'Orphan',
    description: 'Not attached to a transition, journey, grant or details field.',
    appliesTo: { entityRefs: [], fieldRefs: ['Comanda.status'], transitionRefs: [], journeyRefs: [] },
  });
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'passed');
  assert.ok(report.warnings.some(issue => issue.code === 'NS5_FINALIZE_I4' && /orphanHint/.test(issue.message)));
});

void test('I5 fails an mdm entity without mdmSubtype', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  const mesa = sources.entities.find(entity => entity.entityId === 'Mesa')!;
  delete mesa.mdmSubtype;
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'failed');
  assert.ok(report.errors.some(issue => issue.code === 'NS5_FINALIZE_I5' && /Mesa/.test(issue.message)));
});

void test('I5 fails an own grant whose non-mdm entity does not reach a person', () => {
  const sources = clone(loadSources('ordenServicio.json'));
  sources.ontologyIndex.relationships = [];
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'failed');
  assert.ok(report.errors.some(issue => issue.code === 'NS5_FINALIZE_I5' && /party:person/.test(issue.message)));
});

void test('I6 warns when a handoff has no covering process', () => {
  const sources = clone(loadSources('comandaRestaurante.json'));
  const journey = sources.journeys[0];
  journey.business.steps.push({
    stepId: 'handToCashier',
    kind: 'handoff',
    entity: 'Comanda',
    handoffTo: 'caixa',
    title: 'Hand off',
    description: 'Pass the tab to the cashier.',
  });
  const report = runNs5Oracle(sources);
  assert.equal(report.finalStatus, 'passed');
  assert.ok(report.warnings.some(issue => issue.code === 'NS5_FINALIZE_I6' && /handToCashier/.test(issue.message)));
});

void test('registry module block maps mdmSubtype to <mod>.<Entity>', () => {
  const sources = loadSources('comandaRestaurante.json');
  const block = buildSolutionRegistryModuleBlock({
    moduleName: sources.module.moduleName,
    actors: sources.module.actors,
    entities: sources.entities,
    updatedAt: '2026-09-10T00:00:00.000Z',
  });
  assert.deepEqual(
    block.roles.map(role => `${role.mdmSubtype} <- ${role.role}`).sort(),
    ['Location <- comandaRestaurante.Mesa', 'Product <- comandaRestaurante.ItemCardapio'],
  );
  assert.deepEqual(block.actors.map(actor => actor.actorId), ['garcom', 'caixa']);
});

void test('ensureConfigListsModule writes moduleId without inventing navigation', () => {
  const config = ensureConfigListsModule({}, 'comandaRestaurante', 'pt-BR', 102047);
  const modules = config.modules as Array<{ moduleId: string; navigation: unknown[] }>;
  assert.equal(modules.length, 1);
  assert.equal(modules[0].moduleId, 'comandaRestaurante');
  assert.deepEqual(modules[0].navigation, []);
});

void test('nextNs5RunNn increments the newsolution5 slug', () => {
  assert.equal(nextNs5RunNn(['pipeline', 'finalize-report', 'run01_newsolution5']), '02');
  assert.equal(nextNs5RunNn(['run01_newsolution']), '01');
});

void test('markNs5Complete sets status complete and refuses a failed pipeline', () => {
  const now = '2026-09-10T12:00:00.000Z';
  const complete = markNs5Complete({
    schemaVersion: '2026-09-10-ns5-pipeline-v1',
    flowId: 'agentNewSolution5',
    moduleName: 'comandaRestaurante',
    status: 'inProgress',
    steps: {},
    sourcePrompt: 'x',
    invocation: { fast: true, module: 'comandaRestaurante', rebuildAll: false },
    updatedAt: now,
  }, now);
  assert.equal(complete.status, 'complete');
  assert.equal(complete.awaitingStep, undefined);
  const failed = markNs5Complete({ ...complete, status: 'failed' }, now);
  assert.equal(failed.status, 'failed');
});

void test('finalize80 is hooked and never mentions a CB/CF handoff', () => {
  assert.equal(typeof NS5_STEP_HOOKS.finalize80?.beforePromptStep, 'function');
  assert.equal(typeof NS5_STEP_HOOKS.finalize80?.afterPromptStep, 'function');
  const source = readFileSync(path.join(HERE, 'agentNs5Finalize.ts'), 'utf8');
  assert.doesNotMatch(source, /dispatchChangeBackendHandoff|agentChangeBackend|agentChangeFrontend|\/nochain/);
});

void test('afterPromptStep fails because finalize80 is deterministic', async () => {
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: 'plan',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentNewSolution5',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const step: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 80,
    interaction: { input: [], payload: [{ result: 'model reply' }] } as mls.msg.AIAgentStep['interaction'],
    stepTitle: 'Finalize',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentNewSolution5',
    prompt: JSON.stringify({ planId: 'finalize80', moduleName: 'comandaRestaurante' }),
    rags: [],
    planning: { planId: 'finalize80', dependsOn: ['integration70-done'], executionMode: 'sequential', executionHost: 'client' },
  };
  const context = {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [root], longMemory: { moduleName: 'comandaRestaurante' } } },
  } as mls.msg.ExecutionContext;
  const intents = await afterNs5FinalizePromptStep(
    { agentName: 'agentNewSolution5' } as IAgentMeta,
    context,
    root,
    step,
    1,
  );
  const status = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.ok(status);
  assert.equal(status.status, 'failed');
  assert.match(String(status.traceMsg || ''), /deterministic/);
  assert.equal(status.cleaner, 'input_output');
});

void test('createAgent graph includes the finalize80 hook', () => {
  const agent = createAgent();
  assert.equal(typeof agent.beforePromptStep, 'function');
  assert.equal(NS5_STEP_HOOKS.finalize80?.beforePromptStep, beforeNs5FinalizePromptStep);
});

void test('fixture entities stay typed as ontology artifacts when cloned', () => {
  const sources = loadSources('comandaRestaurante.json');
  const entity: Ns5OntologyEntityArtifact = sources.entities[0];
  const journey: Ns5JourneyArtifact = sources.journeys[0];
  assert.equal(entity.kind, 'mdm');
  assert.equal(journey.business.steps[1].kind, 'act');
});
