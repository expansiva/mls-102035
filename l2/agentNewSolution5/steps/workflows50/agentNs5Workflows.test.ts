/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/workflows50/agentNs5Workflows.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/agentNewSolution/helpers/ns4WorkerTools.js';
import { ownerStepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import {
  loadNs5Actors,
  loadNs5Entities,
  loadNs5FixtureJson,
  loadNs5Journeys,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
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
  collectNs5TimeEventPhrases,
  normalizeNs5WorkflowsPayload,
  ns5WorkflowsNeedsLlm,
  type Ns5WorkflowsEntityView,
  type Ns5WorkflowsJourneyView,
} from '/_102035_/l2/agentNewSolution5/steps/workflows50/contracts.js';
import {
  formatNs5WorkflowsGate,
  validateNs5Workflows,
} from '/_102035_/l2/agentNewSolution5/steps/workflows50/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function loadSchema(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(HERE, '../../schemas/workflows.schema.json'), 'utf8'),
  ) as Record<string, unknown>;
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
    { stepId: 'createServiceOrder', kind: 'act', entity: 'ServiceOrder', effect: 'create' },
    { stepId: 'handToTechnician', kind: 'handoff', entity: 'ServiceOrder', handoffTo: 'tecnico' },
  ]),
  journey('prepararPresupuestoServicio', 'tecnico', [
    { stepId: 'publishBudget', kind: 'act', entity: 'ServiceOrder', effect: 'transition', transitionRef: 'publishBudget' },
    { stepId: 'handToCustomer', kind: 'handoff', entity: 'ServiceOrder', handoffTo: 'cliente' },
  ]),
  journey('consultarYDecidirPresupuesto', 'cliente', [
    { stepId: 'decideBudget', kind: 'decide', entity: 'ServiceOrder' },
  ]),
  journey('repararAparato', 'tecnico', [
    { stepId: 'markServiceOrderReady', kind: 'act', entity: 'ServiceOrder', effect: 'transition', transitionRef: 'markServiceOrderReady' },
    { stepId: 'handToReception', kind: 'handoff', entity: 'ServiceOrder', handoffTo: 'recepcionista' },
  ]),
  journey('entregarAparato', 'recepcionista', [
    { stepId: 'recordDelivery', kind: 'act', entity: 'ServiceOrder', effect: 'transition', transitionRef: 'completeServiceOrder' },
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
    { stepId: 'open', kind: 'act', entity: 'Comanda', effect: 'create' },
  ]),
  journey('lancarItemNaComanda', 'garcom', [
    { stepId: 'addItem', kind: 'act', entity: 'ItemComanda', effect: 'create', affects: ['Comanda'] },
  ]),
  journey('cancelarItemLancado', 'garcom', [
    { stepId: 'cancelItem', kind: 'act', entity: 'ItemComanda', effect: 'transition', transitionRef: 'cancelarItem' },
  ]),
  journey('fecharComanda', 'caixa', [
    { stepId: 'close', kind: 'act', entity: 'Comanda', effect: 'transition', transitionRef: 'fecharComanda' },
  ]),
];

const COMANDA_ENTITIES: Ns5WorkflowsEntityView[] = [
  entity('Comanda', [{ transitionId: 'fecharComanda', by: ['caixa'] }]),
  entity('ItemComanda', [{ transitionId: 'cancelarItem', by: ['garcom'] }]),
];

const COMANDA_ACTORS = ['garcom', 'caixa'];

const MANUAL_TRIGGER = { kind: 'manual' as const, actorRef: 'recepcionista' };

function humanTask(taskId: string, actorRef: string, journeyRef: string, next: string[], description: string) {
  return { taskId, kind: 'human' as const, actorRef, journeyRef, next, description };
}

function validProcess(overrides: Partial<Ns5WorkflowProcess> = {}): Record<string, unknown> {
  return {
    processId: 'serviceOrderFulfillment',
    title: 'Service order fulfillment',
    description: 'Reception, analysis, customer decision, repair, delivery.',
    trigger: MANUAL_TRIGGER,
    tasks: [
      humanTask('receive', 'recepcionista', 'abrirOrdenServicio', ['analyze'], 'Reception opens the order.'),
      humanTask('analyze', 'tecnico', 'prepararPresupuestoServicio', ['decide'], 'Technician publishes the budget.'),
      humanTask('decide', 'cliente', 'consultarYDecidirPresupuesto', ['repair'], 'Customer approves or rejects the budget.'),
      humanTask('repair', 'tecnico', 'repararAparato', ['deliver'], 'Technician marks the order ready.'),
      humanTask('deliver', 'recepcionista', 'entregarAparato', [], 'Reception delivers the device.'),
    ],
    ...overrides,
  };
}

function drafts(payload: unknown, journeyIds?: readonly string[]) {
  return normalizeNs5WorkflowsPayload(payload, journeyIds ? { journeyIds } : undefined);
}

function gateOf(
  processes: Ns5WorkflowProcess[],
  journeys = ORDEN_JOURNEYS,
  entities = ORDEN_ENTITIES,
  actorIds = ORDEN_ACTORS,
  journeyDecisions?: ReturnType<typeof drafts>['journeyDecisions'],
) {
  return validateNs5Workflows(processes, { actorIds, journeys, entities, journeyDecisions });
}

void test('workflows50 tool schema is provider-clean', () => {
  const tool = buildNs5WorkflowsTool(loadSchema(), createNs4FlexibleWorkerTool);
  assert.equal(tool.function.name, 'submitNs5Workflows');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
});

void test('real ordenServicio5 workflows draft is one process of human stages per journey, no locate/inspect', () => {
  const draft = loadNs5FixtureJson<{ processes: Ns5WorkflowProcess[] }>('steps/workflows50/fixtures', 'ordenServicio5-draft.json');
  assert.equal(draft.processes.length, 1);
  const process = draft.processes[0];
  assert.equal(process.processId, 'gestionarOrdenServicio');
  assert.equal(process.trigger.kind, 'manual');
  assert.ok(process.tasks.length <= 6);
  assert.equal(process.tasks.every(task => task.kind === 'human'), true);
  assert.equal(process.tasks.every(task => Boolean(task.journeyRef) && !('stepRef' in task)), true);
  const keys = process.tasks.map(task => `${task.kind}|${task.journeyRef}`);
  assert.equal(new Set(keys).size, keys.length);
  const journeys = loadNs5Journeys('ordenServicio5').map(item => ({
    journeyId: item.journeyId,
    business: {
      actorRef: item.business.actorRef,
      steps: item.business.steps.map(step => ({
        stepId: step.stepId,
        kind: step.kind,
        entity: step.entity,
        ...(step.handoffTo ? { handoffTo: step.handoffTo } : {}),
      })),
    },
  }));
  const entities = loadNs5Entities('ordenServicio5').map(item => ({
    entityId: item.entityId,
    transitions: item.transitions.map(transition => ({ transitionId: transition.transitionId, by: transition.by })),
  }));
  const normalized = drafts(draft, journeys.map(item => item.journeyId));
  const gate = validateNs5Workflows(normalized.processes, {
    actorIds: loadNs5Actors('ordenServicio5').map(actor => actor.actorId),
    journeys,
    entities,
    journeyDecisions: normalized.journeyDecisions,
  });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('real comandaRestaurante5 workflows draft is empty and has no process signal', () => {
  const draft = loadNs5FixtureJson<{ processes: Ns5WorkflowProcess[] }>('steps/workflows50/fixtures', 'comandaRestaurante5-draft.json');
  assert.deepEqual(draft.processes, []);
});

void test('comanda-like journeys have no process signal (skip LLM)', () => {
  const signals = collectNs5ProcessSignals(COMANDA_JOURNEYS, COMANDA_ENTITIES);
  assert.deepEqual(signals, []);
  assert.equal(ns5WorkflowsNeedsLlm(signals, []), false);
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

void test('system and time transitions are process signals and do not force an empty-process error', () => {
  const signals = collectNs5ProcessSignals(
    [journey('watchWaitlist', 'organizador', [{ stepId: 'watch', kind: 'inspect', entity: 'Inscricao' }])],
    [entity('Inscricao', [{ transitionId: 'promoteFromWaitlist', by: 'system' }])],
  );
  assert.ok(signals.some(signal => signal.kind === 'systemBy' && signal.transitionId === 'promoteFromWaitlist'));
  const gate = validateNs5Workflows([], {
    actorIds: ['organizador'],
    journeys: [journey('watchWaitlist', 'organizador', [{ stepId: 'watch', kind: 'inspect', entity: 'Inscricao' }])],
    entities: [entity('Inscricao', [{ transitionId: 'promoteFromWaitlist', by: 'system' }])],
  });
  assert.equal(gate.ok, true);
  assert.equal(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_SIGNAL_WITHOUT_PROCESS'), false);
});

void test('time/event phrases are extracted in code and force the LLM call', () => {
  const phrases = collectNs5TimeEventPhrases(
    'Todo mês, dia 1, gerar as mensalidades. Quando o plano vence, avisar. Fechar automaticamente.',
  );
  assert.ok(phrases.some(phrase => /todo m/i.test(phrase)));
  assert.ok(phrases.some(phrase => /quando o plano vence/i.test(phrase)));
  assert.ok(phrases.some(phrase => /automaticamente/i.test(phrase)));
  assert.equal(ns5WorkflowsNeedsLlm([], phrases), true);
  assert.equal(ns5WorkflowsNeedsLlm([], []), false);
});

void test('normalize + gate accept a valid chained process covering handoffs by journeyRef', () => {
  const normalized = drafts({ processes: [validProcess()] });
  const gate = gateOf(normalized.processes);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('empty catalog is invalid when a handoff exists', () => {
  const gate = gateOf([]);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_SIGNAL_WITHOUT_PROCESS'));
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_HANDOFF_UNCOVERED'));
});

void test('gate rejects a human task without actorRef or journeyRef', () => {
  const processes = drafts({
    processes: [validProcess({
      tasks: [{
        taskId: 'decide',
        kind: 'human',
        next: [],
        description: 'Customer decides.',
      }],
    })],
  }).processes;
  const noHandoff = ORDEN_JOURNEYS.map(item => ({
    ...item,
    business: { ...item.business, steps: item.business.steps.filter(step => step.kind !== 'handoff') },
  }));
  const gate = gateOf(processes, noHandoff, ORDEN_ENTITIES);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_HUMAN_ACTOR'));
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_HUMAN_JOURNEY'));
});

void test('gate rejects unknown actor, journey, entity and next refs', () => {
  const processes = drafts({
    processes: [validProcess({
      tasks: [{
        taskId: 'ghost',
        kind: 'human',
        actorRef: 'ghost',
        journeyRef: 'ghostJourney',
        next: ['missing'],
        description: 'Broken refs.',
      }],
    })],
  }).processes;
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
        humanTask('a', 'tecnico', 'prepararPresupuestoServicio', ['b'], 'A.'),
        humanTask('b', 'cliente', 'consultarYDecidirPresupuesto', ['a'], 'B.'),
      ],
    })],
  }).processes;
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
        humanTask('a', 'tecnico', 'prepararPresupuestoServicio', ['pause'], 'A.'),
        { taskId: 'pause', kind: 'wait', next: ['b'], description: 'Wait for the customer.' },
        humanTask('b', 'cliente', 'consultarYDecidirPresupuesto', ['a'], 'B.'),
      ],
    })],
  }).processes;
  const noHandoff = ORDEN_JOURNEYS.map(item => ({
    ...item,
    business: { ...item.business, steps: item.business.steps.filter(step => step.kind !== 'handoff') },
  }));
  const gate = gateOf(processes, noHandoff, ORDEN_ENTITIES);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('uncovered handoff fails NS5_WORKFLOWS_HANDOFF_UNCOVERED', () => {
  const processes = drafts({
    processes: [validProcess({
      tasks: [humanTask('receive', 'recepcionista', 'abrirOrdenServicio', [], 'Reception opens the order.')],
    })],
  }).processes;
  const gate = gateOf(processes);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_HANDOFF_UNCOVERED'));
});

void test('normalize maps id to processId/taskId, drops empty next, and drops duplicate stages', () => {
  const normalized = drafts({
    processes: [{
      id: 'serviceOrderFulfillment',
      title: 'Fulfillment',
      description: 'Chain.',
      trigger: MANUAL_TRIGGER,
      tasks: [
        {
          id: 'decide',
          kind: 'human',
          actorRef: 'cliente',
          journeyRef: 'consultarYDecidirPresupuesto',
          next: ['repair', 'repair', ''],
          description: 'Customer decides.',
        },
        {
          taskId: 'decideAgain',
          kind: 'human',
          actorRef: 'cliente',
          journeyRef: 'consultarYDecidirPresupuesto',
          next: ['repair'],
          description: 'Duplicate decide.',
        },
      ],
    }],
  });
  assert.equal(normalized.processes[0].processId, 'serviceOrderFulfillment');
  assert.equal(normalized.processes[0].tasks.length, 1);
  assert.equal(normalized.processes[0].tasks[0].taskId, 'decide');
  assert.equal(normalized.processes[0].tasks[0].journeyRef, 'consultarYDecidirPresupuesto');
  assert.equal('stepRef' in normalized.processes[0].tasks[0], false);
  assert.deepEqual(normalized.processes[0].tasks[0].next, ['repair']);
  assert.ok(normalized.systemDecisions.some(decision => decision.decisionId === 'dropDuplicateTaskDecideAgain'));
});

void test('mechanical create Mensalidade is the academia scheduled shape', () => {
  const journeys = [
    journey('gerarMensalidadesDoMes', 'financeiro', [
      { stepId: 'gerar', kind: 'act', entity: 'Mensalidade', effect: 'create' },
    ]),
  ];
  const entities = [entity('Mensalidade')];
  const normalized = drafts({
    processes: [{
      processId: 'gerarMensalidadesMensal',
      title: 'Gerar mensalidades do mês',
      description: 'Todo mês cria as mensalidades dos alunos ativos.',
      trigger: { kind: 'scheduled', schedule: 'todo mês, dia 1' },
      tasks: [{
        taskId: 'criarMensalidades',
        kind: 'mechanical',
        entityRef: 'Mensalidade',
        effect: 'create',
        next: [],
        description: 'Criar as mensalidades do mês.',
      }],
    }],
    journeyDecisions: [{ journeyId: 'gerarMensalidadesDoMes', inProcess: true, processId: 'gerarMensalidadesMensal' }],
  }, ['gerarMensalidadesDoMes']);
  const gate = validateNs5Workflows(normalized.processes, {
    actorIds: ['financeiro'],
    journeys,
    entities,
    journeyDecisions: normalized.journeyDecisions,
  });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(normalized.processes[0].trigger.kind, 'scheduled');
  assert.equal(normalized.processes[0].tasks[0].kind, 'mechanical');
  assert.equal(normalized.processes[0].tasks[0].effect, 'create');
  assert.equal(normalized.journeyDecisions[0].inProcess, true);
});

void test('frota preventiva is event plus a human journey stage', () => {
  const journeys = [
    journey('abrirOrdemPreventiva', 'gestorFrota', [
      { stepId: 'abrir', kind: 'act', entity: 'OrdemManutencao', effect: 'create' },
    ]),
  ];
  const entities = [entity('Preventiva', [{ transitionId: 'vencer', by: 'time' }])];
  const normalized = drafts({
    processes: [{
      processId: 'tratarPreventivaVencida',
      title: 'Tratar preventiva vencida',
      description: 'Quando a preventiva vence, o gestor abre a ordem.',
      trigger: { kind: 'event', event: 'Preventiva.vencer' },
      tasks: [humanTask('abrirOrdemPreventiva', 'gestorFrota', 'abrirOrdemPreventiva', [], 'Abrir a ordem preventiva.')],
    }],
    journeyDecisions: [{ journeyId: 'abrirOrdemPreventiva', inProcess: true, processId: 'tratarPreventivaVencida' }],
  }, ['abrirOrdemPreventiva']);
  const gate = validateNs5Workflows(normalized.processes, {
    actorIds: ['gestorFrota'],
    journeys,
    entities,
    journeyDecisions: normalized.journeyDecisions,
  });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(normalized.processes[0].trigger.kind, 'event');
  assert.equal(normalized.processes[0].tasks[0].kind, 'human');
});

void test('evento waitlist is event plus mechanical transition', () => {
  const journeys = [
    journey('cancelarInscricao', 'participante', [
      { stepId: 'cancelar', kind: 'act', entity: 'Inscricao', effect: 'transition', transitionRef: 'cancelar' },
    ]),
  ];
  const entities = [entity('Inscricao', [
    { transitionId: 'cancelar', by: ['participante'] },
    { transitionId: 'promoteFromWaitlist', by: 'system' },
  ])];
  const normalized = drafts({
    processes: [{
      processId: 'promoverListaDeEspera',
      title: 'Promover lista de espera',
      description: 'Quando uma inscrição cancela, o sistema promove a lista de espera.',
      trigger: { kind: 'event', event: 'Inscricao.cancelar' },
      tasks: [{
        taskId: 'promover',
        kind: 'mechanical',
        entityRef: 'Inscricao',
        effect: 'transition',
        transitionRef: 'promoteFromWaitlist',
        next: [],
        description: 'Promover o próximo da lista de espera.',
      }],
    }],
    journeyDecisions: [{ journeyId: 'cancelarInscricao', inProcess: true, processId: 'promoverListaDeEspera' }],
  }, ['cancelarInscricao']);
  const gate = validateNs5Workflows(normalized.processes, {
    actorIds: ['participante'],
    journeys,
    entities,
    journeyDecisions: normalized.journeyDecisions,
  });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('mechanical transitionRef must exist with by system or the actor', () => {
  const processes = drafts({
    processes: [validProcess({
      trigger: { kind: 'manual', actorRef: 'recepcionista' },
      tasks: [{
        taskId: 'autoClose',
        kind: 'mechanical',
        entityRef: 'ServiceOrder',
        effect: 'transition',
        transitionRef: 'approveBudget',
        next: [],
        description: 'Wrong by.',
      }],
    })],
  }).processes;
  const noHandoff = ORDEN_JOURNEYS.map(item => ({
    ...item,
    business: { ...item.business, steps: item.business.steps.filter(step => step.kind !== 'handoff') },
  }));
  const gate = gateOf(processes, noHandoff, ORDEN_ENTITIES);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_TRANSITION_BY'));
});

void test('trigger.event accepts module.eventId inbound form', () => {
  const processes = drafts({
    processes: [validProcess({
      trigger: { kind: 'event', event: 'comandaRestaurante.comandaFechada' },
    })],
  }).processes;
  const gate = gateOf(processes);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('trigger.event still rejects a malformed event id', () => {
  const processes = drafts({
    processes: [validProcess({
      trigger: { kind: 'event', event: 'not-an-event' },
    })],
  }).processes;
  const gate = gateOf(processes);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_WORKFLOWS_TRIGGER_EVENT'));
});

void test('buildNs5WorkflowsArtifact keeps schemaVersion and process order', () => {
  const normalized = drafts({
    processes: [validProcess()],
    journeyDecisions: ORDEN_JOURNEYS.map(item => ({
      journeyId: item.journeyId,
      inProcess: true,
      processId: 'serviceOrderFulfillment',
    })),
  }, ORDEN_JOURNEYS.map(item => item.journeyId));
  const artifact = buildNs5WorkflowsArtifact(
    'ordenServicio5',
    normalized.processes,
    normalized.journeyDecisions,
    normalized.systemDecisions,
  );
  assert.equal(artifact.schemaVersion, '2026-09-12-ns5-workflows-v2');
  assert.equal(artifact.moduleName, 'ordenServicio5');
  assert.equal(artifact.processes[0].processId, 'serviceOrderFulfillment');
  assert.equal(artifact.processes[0].tasks[2].actorRef, 'cliente');
  assert.equal(artifact.journeyDecisions.length, 5);
});

void test('ownerStepId maps workflows50 repair planIds', () => {
  assert.equal(ownerStepId('workflows50'), 'workflows50');
  assert.equal(ownerStepId('workflows50-repair-1'), 'workflows50');
  assert.equal(ownerStepId('workflows50-done'), '');
});

void test('human prompt carries source request, journeys, write acts, phrases and transitions', () => {
  const serviceOrder = {
    schemaVersion: '2026-09-11-ns5-ontology-v2',
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
        {
          stepId: 'publishBudget',
          kind: 'act',
          entity: 'ServiceOrder',
          effect: 'transition',
          transitionRef: 'publishBudget',
          title: 'Publish',
          description: 'Budget is published.',
        },
        { stepId: 'handToCustomer', kind: 'handoff', entity: 'ServiceOrder', handoffTo: 'cliente', title: 'Hand off', description: 'Customer decides next.' },
      ],
      outcome: { statement: 'Published.', evidence: ['Published.'] },
    },
    businessHash: 'sha256:1',
  } as Ns5JourneyArtifact;
  const human = buildNs5WorkflowsHumanPrompt({
    sourcePrompt: 'modulo orden de servicio. perfiles: recepcionista, tecnico, cliente. cuando el cliente responde, continuar.',
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
  assert.match(human, /effect=transition/);
  assert.match(human, /Time and event phrases/);
  assert.match(human, /cuando el cliente responde/i);
  assert.doesNotMatch(human, /stepRefs/);
});

void test('workflows50 prompt has no domain examples and keeps process vs FSM', () => {
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /submitNs5Workflows/);
  assert.match(prompt, /not the entity lifecycle/);
  assert.match(prompt, /placeholders — use only ids that exist in the module/);
  assert.match(prompt, /journeyDecisions/);
  assert.match(prompt, /mechanical/);
  assert.doesNotMatch(prompt, /stepRef/);
  assert.doesNotMatch(prompt, /comanda|garcom|waiter|stock|quantity|descuento|presupuesto|recepcionista/i);
});
