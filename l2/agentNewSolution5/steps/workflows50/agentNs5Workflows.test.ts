/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/workflows50/agentNs5Workflows.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/agentNewSolution/helpers/ns4WorkerTools.js';
import { ownerStepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import type {
  Ns5JourneyArtifact,
  Ns5OntologyEntityArtifact,
  Ns5WorkflowProcess,
} from '/_102035_/l2/solution/types.js';
import { buildNs5WorkflowsHumanPrompt } from '/_102035_/l2/agentNewSolution5/steps/workflows50/agentNs5Workflows.js';
import {
  buildNs5WorkflowsArtifact,
  buildNs5WorkflowsTool,
  collectNs5ProcessSignals,
  normalizeNs5WorkflowsPayload,
  type Ns5WorkflowsEntityView,
  type Ns5WorkflowsJourneyView,
} from '/_102035_/l2/agentNewSolution5/steps/workflows50/contracts.js';
import {
  formatNs5WorkflowsGate,
  validateNs5Workflows,
} from '/_102035_/l2/agentNewSolution5/steps/workflows50/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

interface DerivedWorkflowsFixture {
  derivedFrom: string;
  processes: Ns5WorkflowProcess[];
}

function loadSchema(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(HERE, '../../schemas/workflows.schema.json'), 'utf8'),
  ) as Record<string, unknown>;
}

function loadDerived(name: string): DerivedWorkflowsFixture {
  return JSON.parse(readFileSync(path.join(HERE, 'fixtures', name), 'utf8')) as DerivedWorkflowsFixture;
}

function journey(
  journeyId: string,
  actorRef: string,
  steps: Ns5WorkflowsJourneyView['business']['steps'],
): Ns5WorkflowsJourneyView {
  return { journeyId, business: { actorRef, steps } };
}

function entity(
  entityId: string,
  transitions: Ns5WorkflowsEntityView['transitions'] = [],
): Ns5WorkflowsEntityView {
  return { entityId, transitions };
}

const ORDEN_ACTORS = ['recepcionista', 'tecnico', 'cliente'];

const ORDEN_JOURNEYS: Ns5WorkflowsJourneyView[] = [
  journey('abrirOrdenServicio', 'recepcionista', [
    { stepId: 'createServiceOrder', kind: 'act', entity: 'ServiceOrder' },
    { stepId: 'handToTechnician', kind: 'handoff', entity: 'ServiceOrder', handoffTo: 'tecnico' },
  ]),
  journey('prepararPresupuestoServicio', 'tecnico', [
    { stepId: 'publishBudget', kind: 'act', entity: 'ServiceOrder' },
    { stepId: 'handToCustomer', kind: 'handoff', entity: 'ServiceOrder', handoffTo: 'cliente' },
  ]),
  journey('consultarYDecidirPresupuesto', 'cliente', [
    { stepId: 'decideBudget', kind: 'decide', entity: 'ServiceOrder' },
  ]),
  journey('repararAparato', 'tecnico', [
    { stepId: 'markServiceOrderReady', kind: 'act', entity: 'ServiceOrder' },
    { stepId: 'handToReception', kind: 'handoff', entity: 'ServiceOrder', handoffTo: 'recepcionista' },
  ]),
  journey('entregarAparato', 'recepcionista', [
    { stepId: 'recordDelivery', kind: 'act', entity: 'ServiceOrder' },
  ]),
];

const ORDEN_ENTITIES: Ns5WorkflowsEntityView[] = [
  entity('ServiceOrder', [
    { transitionId: 'publishBudget', by: ['tecnico'] },
    { transitionId: 'approveBudget', by: ['cliente'] },
    { transitionId: 'rejectBudget', by: ['cliente'] },
    { transitionId: 'markServiceOrderReady', by: ['tecnico'] },
    { transitionId: 'completeServiceOrder', by: ['recepcionista'] },
  ]),
];

const COMANDA_JOURNEYS: Ns5WorkflowsJourneyView[] = [
  journey('abrirComandaParaMesa', 'garcom', [
    { stepId: 'open', kind: 'act', entity: 'Comanda' },
  ]),
  journey('lancarItemNaComanda', 'garcom', [
    { stepId: 'addItem', kind: 'act', entity: 'ItemComanda', affects: ['Comanda'] },
  ]),
  journey('cancelarItemLancado', 'garcom', [
    { stepId: 'cancelItem', kind: 'act', entity: 'ItemComanda' },
  ]),
  journey('fecharComanda', 'caixa', [
    { stepId: 'close', kind: 'act', entity: 'Comanda' },
  ]),
];

const COMANDA_ENTITIES: Ns5WorkflowsEntityView[] = [
  entity('Comanda', [{ transitionId: 'fecharComanda', by: ['caixa'] }]),
  entity('ItemComanda', [{ transitionId: 'cancelarItem', by: ['garcom'] }]),
];

const COMANDA_ACTORS = ['garcom', 'caixa'];

function validProcess(overrides: Partial<Ns5WorkflowProcess> = {}): Record<string, unknown> {
  return {
    processId: 'serviceOrderFulfillment',
    title: 'Service order fulfillment',
    description: 'Reception, analysis, customer decision, repair, delivery.',
    tasks: [
      {
        taskId: 'receive',
        kind: 'human',
        actorRef: 'recepcionista',
        journeyRef: 'abrirOrdenServicio',
        stepRef: 'createServiceOrder',
        next: ['analyze'],
        description: 'Reception opens the order.',
      },
      {
        taskId: 'analyze',
        kind: 'human',
        actorRef: 'tecnico',
        journeyRef: 'prepararPresupuestoServicio',
        stepRef: 'publishBudget',
        next: ['decide'],
        description: 'Technician publishes the budget.',
      },
      {
        taskId: 'decide',
        kind: 'human',
        actorRef: 'cliente',
        journeyRef: 'consultarYDecidirPresupuesto',
        stepRef: 'decideBudget',
        next: ['repair'],
        description: 'Customer approves or rejects the budget.',
      },
      {
        taskId: 'repair',
        kind: 'human',
        actorRef: 'tecnico',
        journeyRef: 'repararAparato',
        stepRef: 'markServiceOrderReady',
        next: ['deliver'],
        description: 'Technician marks the order ready.',
      },
      {
        taskId: 'deliver',
        kind: 'human',
        actorRef: 'recepcionista',
        journeyRef: 'entregarAparato',
        stepRef: 'recordDelivery',
        next: [],
        description: 'Reception delivers the device.',
      },
    ],
    ...overrides,
  };
}

function drafts(payload: unknown): Ns5WorkflowProcess[] {
  return normalizeNs5WorkflowsPayload(payload).processes;
}

function gateOf(
  processes: Ns5WorkflowProcess[],
  journeys = ORDEN_JOURNEYS,
  entities = ORDEN_ENTITIES,
  actorIds = ORDEN_ACTORS,
) {
  return validateNs5Workflows(processes, { actorIds, journeys, entities });
}

void test('workflows50 tool schema is provider-clean', () => {
  const tool = buildNs5WorkflowsTool(loadSchema(), createNs4FlexibleWorkerTool);
  assert.equal(tool.function.name, 'submitNs5Workflows');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
});

void test('derived ordenServicio2 fixture is one process of five chained tasks with human decide', () => {
  const fixture = loadDerived('ordenServicio2-workflows.json');
  assert.match(fixture.derivedFrom, /ordenServicio2\/journeys/);
  assert.equal(fixture.processes.length, 1);
  const process = fixture.processes[0];
  assert.equal(process.tasks.length, 5);
  const decide = process.tasks.find(task => task.taskId === 'decide');
  assert.ok(decide);
  assert.equal(decide.kind, 'human');
  assert.equal(decide.actorRef, 'cliente');
  assert.equal(decide.journeyRef, 'consultarYDecidirPresupuesto');
  assert.equal(decide.stepRef, 'decideBudget');
  assert.deepEqual(process.tasks.map(task => task.next[0] || ''), ['analyze', 'decide', 'repair', 'deliver', '']);
  const processes = drafts({ processes: fixture.processes });
  const covered = ORDEN_JOURNEYS.map(item => ({
    ...item,
    business: {
      ...item.business,
      steps: item.business.steps.filter(step => step.kind !== 'handoff'),
    },
  }));
  const gate = gateOf(processes, covered, ORDEN_ENTITIES);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('comanda-like journeys have no process signal (skip LLM)', () => {
  const signals = collectNs5ProcessSignals(COMANDA_JOURNEYS, COMANDA_ENTITIES);
  assert.deepEqual(signals, []);
  const gate = validateNs5Workflows([], {
    actorIds: COMANDA_ACTORS,
    journeys: COMANDA_JOURNEYS,
    entities: COMANDA_ENTITIES,
  });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('handoff is a process signal', () => {
  const signals = collectNs5ProcessSignals(ORDEN_JOURNEYS, [entity('ServiceOrder')]);
  assert.ok(signals.some(signal => signal.kind === 'handoff'));
});

void test('multi-actor transitions on one entity are a foreignBy signal', () => {
  const noHandoff = ORDEN_JOURNEYS.map(item => ({
    ...item,
    business: {
      ...item.business,
      steps: item.business.steps.filter(step => step.kind !== 'handoff' && step.kind !== 'decide'),
    },
  }));
  const signals = collectNs5ProcessSignals(noHandoff, ORDEN_ENTITIES);
  assert.ok(signals.some(signal => signal.kind === 'foreignBy' && signal.entityId === 'ServiceOrder'));
});

void test('cross-actor decide is a process signal when transitions are empty', () => {
  const noHandoff = ORDEN_JOURNEYS.map(item => ({
    ...item,
    business: {
      ...item.business,
      steps: item.business.steps.filter(step => step.kind !== 'handoff'),
    },
  }));
  const signals = collectNs5ProcessSignals(noHandoff, [entity('ServiceOrder')]);
  assert.ok(signals.some(signal => signal.kind === 'crossActorDecide' && signal.stepId === 'decideBudget'));
});

void test('normalize + gate accept a valid chained process covering handoffs', () => {
  const withHandoffTasks = drafts({
    processes: [validProcess({
      tasks: [
        ...(validProcess().tasks as Record<string, unknown>[]),
        {
          taskId: 'handToTechnician',
          kind: 'human',
          actorRef: 'tecnico',
          journeyRef: 'abrirOrdenServicio',
          stepRef: 'handToTechnician',
          next: ['analyze'],
          description: 'Work passes to the technician.',
        },
        {
          taskId: 'handToCustomer',
          kind: 'human',
          actorRef: 'cliente',
          journeyRef: 'prepararPresupuestoServicio',
          stepRef: 'handToCustomer',
          next: ['decide'],
          description: 'Work passes to the customer.',
        },
        {
          taskId: 'handToReception',
          kind: 'human',
          actorRef: 'recepcionista',
          journeyRef: 'repararAparato',
          stepRef: 'handToReception',
          next: ['deliver'],
          description: 'Work passes back to reception.',
        },
      ],
    })],
  });
  const gate = gateOf(withHandoffTasks);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('empty catalog is invalid when a handoff exists', () => {
  const gate = gateOf([]);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_SIGNAL_WITHOUT_PROCESS'));
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_HANDOFF_UNCOVERED'));
});

void test('gate rejects a human task without actorRef', () => {
  const processes = drafts({
    processes: [validProcess({
      tasks: [{
        taskId: 'decide',
        kind: 'human',
        journeyRef: 'consultarYDecidirPresupuesto',
        stepRef: 'decideBudget',
        next: [],
        description: 'Customer decides.',
      }],
    })],
  });
  const noHandoff = ORDEN_JOURNEYS.map(item => ({
    ...item,
    business: { ...item.business, steps: item.business.steps.filter(step => step.kind !== 'handoff') },
  }));
  const gate = gateOf(processes, noHandoff, ORDEN_ENTITIES);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_HUMAN_ACTOR'));
});

void test('gate rejects unknown actor, journey, step and next refs', () => {
  const processes = drafts({
    processes: [validProcess({
      tasks: [{
        taskId: 'ghost',
        kind: 'human',
        actorRef: 'ghost',
        journeyRef: 'ghostJourney',
        stepRef: 'ghostStep',
        next: ['missing'],
        description: 'Broken refs.',
      }],
    })],
  });
  const noHandoff = ORDEN_JOURNEYS.map(item => ({
    ...item,
    business: { ...item.business, steps: item.business.steps.filter(step => step.kind !== 'handoff') },
  }));
  const gate = gateOf(processes, noHandoff, ORDEN_ENTITIES);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_ACTOR_UNKNOWN'));
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_JOURNEY_UNKNOWN'));
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_NEXT_UNKNOWN'));
});

void test('gate rejects a cycle that does not go through wait', () => {
  const processes = drafts({
    processes: [validProcess({
      tasks: [
        {
          taskId: 'a',
          kind: 'human',
          actorRef: 'tecnico',
          journeyRef: 'prepararPresupuestoServicio',
          stepRef: 'publishBudget',
          next: ['b'],
          description: 'A.',
        },
        {
          taskId: 'b',
          kind: 'human',
          actorRef: 'cliente',
          journeyRef: 'consultarYDecidirPresupuesto',
          stepRef: 'decideBudget',
          next: ['a'],
          description: 'B.',
        },
      ],
    })],
  });
  const noHandoff = ORDEN_JOURNEYS.map(item => ({
    ...item,
    business: { ...item.business, steps: item.business.steps.filter(step => step.kind !== 'handoff') },
  }));
  const gate = gateOf(processes, noHandoff, ORDEN_ENTITIES);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_CYCLE'));
  const feedback = formatNs5WorkflowsGate(gate.issues);
  assert.match(feedback, /NS5_WORKFLOWS_CYCLE/);
});

void test('a cycle through wait is allowed', () => {
  const processes = drafts({
    processes: [validProcess({
      tasks: [
        {
          taskId: 'a',
          kind: 'human',
          actorRef: 'tecnico',
          journeyRef: 'prepararPresupuestoServicio',
          stepRef: 'publishBudget',
          next: ['pause'],
          description: 'A.',
        },
        {
          taskId: 'pause',
          kind: 'wait',
          next: ['b'],
          description: 'Wait for the customer.',
        },
        {
          taskId: 'b',
          kind: 'human',
          actorRef: 'cliente',
          journeyRef: 'consultarYDecidirPresupuesto',
          stepRef: 'decideBudget',
          next: ['a'],
          description: 'B.',
        },
      ],
    })],
  });
  const noHandoff = ORDEN_JOURNEYS.map(item => ({
    ...item,
    business: { ...item.business, steps: item.business.steps.filter(step => step.kind !== 'handoff') },
  }));
  const gate = gateOf(processes, noHandoff, ORDEN_ENTITIES);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('uncovered handoff fails NS5_WORKFLOWS_HANDOFF_UNCOVERED', () => {
  const processes = drafts({ processes: [validProcess()] });
  const gate = gateOf(processes);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_HANDOFF_UNCOVERED'));
});

void test('normalize maps id to processId/taskId and drops empty next', () => {
  const processes = drafts({
    processes: [{
      id: 'serviceOrderFulfillment',
      title: 'Fulfillment',
      description: 'Chain.',
      tasks: [{
        id: 'decide',
        kind: 'human',
        actorRef: 'cliente',
        journeyRef: 'consultarYDecidirPresupuesto',
        stepRef: 'decideBudget',
        next: ['repair', 'repair', ''],
        description: 'Customer decides.',
      }],
    }],
  });
  assert.equal(processes[0].processId, 'serviceOrderFulfillment');
  assert.equal(processes[0].tasks[0].taskId, 'decide');
  assert.equal(processes[0].tasks[0].journeyRef, 'consultarYDecidirPresupuesto');
  assert.deepEqual(processes[0].tasks[0].next, ['repair']);
});

void test('buildNs5WorkflowsArtifact keeps schemaVersion and process order', () => {
  const processes = drafts({ processes: [validProcess()] });
  const artifact = buildNs5WorkflowsArtifact('ordenServicio5', processes);
  assert.equal(artifact.schemaVersion, '2026-09-10-ns5-workflows-v1');
  assert.equal(artifact.moduleName, 'ordenServicio5');
  assert.equal(artifact.processes[0].processId, 'serviceOrderFulfillment');
  assert.equal(artifact.processes[0].tasks[2].actorRef, 'cliente');
});

void test('ownerStepId maps workflows50 repair planIds', () => {
  assert.equal(ownerStepId('workflows50'), 'workflows50');
  assert.equal(ownerStepId('workflows50-repair-1'), 'workflows50');
  assert.equal(ownerStepId('workflows50-done'), '');
});

void test('human prompt carries source request, journeys, handoffs and transitions', () => {
  const serviceOrder = {
    schemaVersion: '2026-09-10-ns5-ontology-v1',
    moduleName: 'ordenServicio5',
    entityId: 'ServiceOrder',
    title: 'Service order',
    description: 'Repair order.',
    kind: 'core',
    party: 'none',
    displayField: 'numeroOrden',
    fields: [],
    lifecycleStates: [
      { state: 'open', reachedBy: 'actor' },
      { state: 'budgetReady', reachedBy: 'actor' },
    ],
    transitions: [{
      transitionId: 'publishBudget',
      from: ['open'],
      to: 'budgetReady',
      by: ['tecnico'],
      description: 'Technician publishes the budget.',
    }],
    storage: { target: 'moduleDatabase', scope: 'module', idField: 'id' },
  } as Ns5OntologyEntityArtifact;
  const decideJourney = {
    schemaVersion: '2026-09-10-ns5-journey-v1',
    journeyId: 'consultarYDecidirPresupuesto',
    business: {
      actorRef: 'cliente',
      title: 'Decide the budget',
      goal: 'Approve or reject.',
      entry: { mode: 'fromNotification' },
      steps: [
        { stepId: 'decideBudget', kind: 'decide', entity: 'ServiceOrder', title: 'Decide', description: 'The customer decides.' },
      ],
      outcome: { statement: 'Decided.', evidence: ['Decided.'] },
    },
    businessHash: 'sha256:0',
  } as Ns5JourneyArtifact;
  const analyzeJourney = {
    schemaVersion: '2026-09-10-ns5-journey-v1',
    journeyId: 'prepararPresupuestoServicio',
    business: {
      actorRef: 'tecnico',
      title: 'Analyze',
      goal: 'Publish a budget.',
      entry: { mode: 'contextOrLookup' },
      steps: [
        { stepId: 'publishBudget', kind: 'act', entity: 'ServiceOrder', title: 'Publish', description: 'Budget is published.' },
        { stepId: 'handToCustomer', kind: 'handoff', entity: 'ServiceOrder', handoffTo: 'cliente', title: 'Hand off', description: 'Customer decides next.' },
      ],
      outcome: { statement: 'Published.', evidence: ['Published.'] },
    },
    businessHash: 'sha256:1',
  } as Ns5JourneyArtifact;
  const human = buildNs5WorkflowsHumanPrompt({
    sourcePrompt: 'modulo orden de servicio. perfiles: recepcionista, tecnico, cliente.',
    userLanguage: 'es',
    actorIds: ORDEN_ACTORS,
    journeys: [analyzeJourney, decideJourney],
    entities: [serviceOrder],
  });
  assert.match(human, /Source request/);
  assert.match(human, /consultarYDecidirPresupuesto \(cliente\)/);
  assert.match(human, /handoffTo=cliente/);
  assert.match(human, /ServiceOrder\.publishBudget/);
  assert.match(human, /"kind": "handoff"/);
});

void test('workflows50 prompt has no domain examples and keeps process vs FSM', () => {
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /submitNs5Workflows/);
  assert.match(prompt, /not the entity lifecycle/);
  assert.match(prompt, /placeholders — use only ids that exist in the module/);
  assert.doesNotMatch(prompt, /comanda|garcom|waiter|stock|quantity|descuento|presupuesto|recepcionista/i);
});
