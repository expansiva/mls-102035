/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/ontology30/agentNs5Ontology.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/agentNewSolution/helpers/ns4WorkerTools.js';
import { ns5OntologyEntitySelector, ownerStepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import { NS5_STEP_HOOKS, hooksFor } from '/_102035_/l2/agentNewSolution5/helpers/ns5Dispatch.js';
import { loadNs5Actors, loadNs5Defs, loadNs5FixtureJson, loadNs5Journeys } from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import type { Ns5ModuleActor, Ns5OntologyEntityArtifact, Ns5OntologyRelationship } from '/_102035_/l2/solution/types.js';
import {
  buildNs5OntologyBindingsHumanPrompt,
  buildNs5OntologyPlanHumanPrompt,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/agentNs5Ontology.js';
import {
  assembleNs5Ontology,
  buildNs5OntologyBindingsTool,
  buildNs5OntologyEntityTool,
  buildNs5OntologyPlanTool,
  collectNs5LifecycleSignal,
  liftNs5AggregateOnlyEntities,
  normalizeNs5OntologyBindings,
  normalizeNs5OntologyEntity,
  applyNs5ModuleDetails,
  normalizeNs5OntologyPlan,
  ns5LifecycleHasBranchingOrigin,
  type Ns5OntologyBindingsDraft,
  type Ns5OntologyEntityDraft,
  type Ns5OntologyPlanDraft,
  type Ns5OntologyPlanEntity,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';
import {
  applyNs5PlatformServiceCandidateDecisions,
  NS5_PLATFORM_SERVICE_KEEP,
  NS5_PLATFORM_SERVICE_USE,
  validateNs5OntologyAssembly,
  validateNs5OntologyBindings,
  validateNs5OntologyEntity,
  validateNs5OntologyPlan,
  type Ns5OntologyGateContext,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function loadSchema(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(HERE, '../../schemas', name), 'utf8')) as Record<string, unknown>;
}

function realPlan(moduleName: 'comandaRestaurante5' | 'ordenServicio5'): Ns5OntologyPlanDraft {
  return loadNs5FixtureJson<Ns5OntologyPlanDraft>('steps/ontology30/fixtures', `${moduleName}-plan-draft.json`);
}

function realDetail(moduleName: 'comandaRestaurante5' | 'ordenServicio5', entityId: string): Ns5OntologyEntityDraft {
  return loadNs5FixtureJson<Ns5OntologyEntityDraft>('steps/ontology30/fixtures', moduleName, `${entityId}-draft.json`);
}

function realBindings(moduleName: 'comandaRestaurante5' | 'ordenServicio5'): Ns5OntologyBindingsDraft {
  return loadNs5FixtureJson<Ns5OntologyBindingsDraft>('steps/ontology30/fixtures', `${moduleName}-bindings-draft.json`);
}

function planEntity(moduleName: 'comandaRestaurante5' | 'ordenServicio5', entityId: string): Ns5OntologyPlanEntity {
  const entity = realPlan(moduleName).entities.find(item => item.entityId === entityId);
  if (!entity) throw new Error(`missing plan entity ${entityId}`);
  return entity;
}

const ACTORS: Ns5ModuleActor[] = [
  { actorId: 'garcom', kind: 'internal', origin: 'named', title: 'Waiter', description: 'Opens the table order.' },
  { actorId: 'caixa', kind: 'internal', origin: 'named', title: 'Cashier', description: 'Closes the order.' },
];

const FECHAR = {
  business: {
    actorRef: 'caixa',
    title: 'Close the order',
    goal: 'Take payment and free the table.',
    entry: { mode: 'contextOrLookup' as const },
    steps: [
      { stepId: 'locateComanda', kind: 'locate' as const, entity: 'Comanda', title: 'Find', description: 'Found.' },
      { stepId: 'fecharComanda', kind: 'act' as const, entity: 'Comanda', affects: ['Mesa'], title: 'Close', description: 'Closed.' },
    ],
    outcome: { statement: 'Closed.', evidence: ['Closed.'] },
  },
};

function ctx(overrides: Partial<Ns5OntologyGateContext> = {}): Ns5OntologyGateContext {
  return { moduleName: 'comandaRestaurante5', actors: ACTORS, journeys: [FECHAR], ...overrides };
}

function mdmPlan(entityId: string, subtype: string, party: 'person' | 'organization' | 'none', idField: string): Ns5OntologyPlanEntity {
  return {
    entityId,
    title: entityId,
    description: `${entityId} master record.`,
    kind: 'mdm',
    party,
    mdmSubtype: subtype,
    displayField: 'name',
    storage: { target: 'mdm', scope: 'organization', idField, mdmType: `comandaRestaurante5.${entityId}` },
  };
}

function corePlan(entityId: string, idField: string, displayField: string): Ns5OntologyPlanEntity {
  return {
    entityId,
    title: entityId,
    description: `${entityId} operational record.`,
    kind: 'core',
    party: 'none',
    displayField,
    storage: { target: 'moduleDatabase', scope: 'module', idField },
  };
}

function idField(entityId: string, fieldId: string): Ns5OntologyEntityDraft['fields'][number] {
  return { fieldId, title: fieldId, type: 'uuid', required: true, description: 'Identity.' };
}

function emptyMdmDetail(entityId: string): Ns5OntologyEntityDraft {
  return { entityId, fields: [], lifecycleStates: [], transitions: [] };
}

function step(stepId: string, kind: 'act' | 'decide' | 'locate' | 'inspect', entity: string) {
  return { stepId, kind, entity, title: stepId, description: 'Done.' };
}

function journey(actorRef: string, steps: ReturnType<typeof step>[]) {
  return {
    business: {
      actorRef,
      title: 'Journey',
      goal: 'Goal.',
      entry: { mode: 'coldStart' as const },
      steps,
      outcome: { statement: 'Done.', evidence: ['Done.'] },
    },
  };
}

function emptyCoreDetail(entityId: string, fieldId: string, displayField = fieldId): Ns5OntologyEntityDraft {
  return {
    entityId,
    fields: [idField(entityId, fieldId), ...(displayField === fieldId ? [] : [{ fieldId: displayField, title: displayField, type: 'string' as const, required: true, description: 'Label.' }])],
    lifecycleStates: [],
    transitions: [],
  };
}

function ticketLifecycle(branching: boolean): Ns5OntologyEntityDraft {
  const states = branching
    ? [
        { state: 'open', reachedBy: 'actor' as const },
        { state: 'accepted', reachedBy: 'actor' as const },
        { state: 'rejected', reachedBy: 'actor' as const },
      ]
    : [
        { state: 'open', reachedBy: 'actor' as const },
        { state: 'accepted', reachedBy: 'actor' as const },
      ];
  const transitions = [
    { transitionId: 'accept', from: ['open'], to: 'accepted', by: ['caixa'], description: 'Accept.' },
    ...(branching
      ? [{ transitionId: 'reject', from: ['open'], to: 'rejected', by: ['caixa'], description: 'Reject.' }]
      : []),
  ];
  return {
    entityId: 'Ticket',
    fields: [
      idField('Ticket', 'ticketId'),
      { fieldId: 'status', title: 'Status', type: 'string', required: true, enum: states.map(item => ({ value: item.state, title: item.state })), description: 'State.' },
    ],
    lifecycleStates: states,
    transitions,
  };
}

void test('ontology30 tool schemas are provider-clean', () => {
  const plan = buildNs5OntologyPlanTool(loadSchema('ontology-plan.schema.json'), createNs4FlexibleWorkerTool);
  const entity = buildNs5OntologyEntityTool(loadSchema('ontology-entity.schema.json'), createNs4FlexibleWorkerTool);
  const bindings = buildNs5OntologyBindingsTool(loadSchema('ontology-bindings.schema.json'), createNs4FlexibleWorkerTool);
  assert.equal(plan.function.name, 'submitNs5OntologyPlan');
  assert.equal(entity.function.name, 'submitNs5Entity');
  assert.equal(bindings.function.name, 'submitNs5RelationshipBindings');
  assert.equal(lintToolSchema(JSON.stringify(plan.function.parameters)), null);
  assert.equal(lintToolSchema(JSON.stringify(entity.function.parameters)), null);
  assert.equal(lintToolSchema(JSON.stringify(bindings.function.parameters)), null);
});

void test('real Cliente is mdm Person with empty fields and passes the gate', () => {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Service orders',
    entities: [planEntity('ordenServicio5', 'Cliente')],
    relationships: [],
  }, 'ordenServicio5');
  const detail = normalizeNs5OntologyEntity(realDetail('ordenServicio5', 'Cliente'), 'Cliente');
  assert.equal(plan.entities[0].kind, 'mdm');
  assert.equal(plan.entities[0].mdmSubtype, 'Person');
  assert.deepEqual(detail.fields, []);
  const gate = validateNs5OntologyEntity(plan, detail, ctx({
    moduleName: 'ordenServicio5',
    journeys: [{ business: { ...FECHAR.business, steps: [{ ...FECHAR.business.steps[0], entity: 'Cliente' }] } }],
  }));
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('real ItemCardapio keeps namespace fields and level-1 displayField', () => {
  const itemJourneys = [journey('garcom', [
    step('consultarItem', 'inspect', 'ItemCardapio'),
    { ...step('registrarItem', 'act', 'ItemComanda'), affects: ['ItemCardapio'] },
  ])];
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [planEntity('comandaRestaurante5', 'ItemCardapio')],
    relationships: [],
  }, 'comandaRestaurante5', itemJourneys);
  const detail = normalizeNs5OntologyEntity(realDetail('comandaRestaurante5', 'ItemCardapio'), 'ItemCardapio', itemJourneys);
  assert.equal(plan.entities[0].mdmSubtype, 'Product');
  assert.equal(detail.fields.some(field => field.fieldId === 'price'), true);
  assert.equal(detail.fields.some(field => field.fieldId === 'id'), false);
  const gate = validateNs5OntologyEntity(plan, detail, ctx({
    moduleName: 'comandaRestaurante5',
    journeys: itemJourneys,
  }));
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('real Comanda keeps details and fecharComanda by caixa', () => {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [planEntity('comandaRestaurante5', 'Comanda')],
    relationships: [],
  }, 'comandaRestaurante5');
  const detail = normalizeNs5OntologyEntity(realDetail('comandaRestaurante5', 'Comanda'), 'Comanda');
  assert.ok(detail.details?.valorItens);
  assert.equal(detail.transitions[0]?.transitionId, 'fecharComanda');
  assert.deepEqual(detail.transitions[0]?.by, ['caixa']);
  const gate = validateNs5OntologyEntity(plan, detail, ctx({
    journeys: [{
      business: {
        ...FECHAR.business,
        steps: FECHAR.business.steps
          .filter(step => step.entity === 'Comanda')
          .map(step => ({ ...step, affects: undefined })),
      },
    }],
  }));
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('mdm idField inside fields[] is NS5_ONTOLOGY_MDM_ID_IN_FIELDS', () => {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Service orders',
    entities: [planEntity('ordenServicio5', 'Cliente')],
    relationships: [],
  }, 'ordenServicio5');
  const detail = normalizeNs5OntologyEntity({
    ...realDetail('ordenServicio5', 'Cliente'),
    fields: [idField('Cliente', 'id')],
  }, 'Cliente');
  const gate = validateNs5OntologyEntity(plan, detail, ctx({ moduleName: 'ordenServicio5' }));
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_MDM_ID_IN_FIELDS'));
});

void test('non-mdm stored entity without uuid idField fails', () => {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [corePlan('Comanda', 'comandaId', 'comandaNumber')],
    relationships: [],
  }, 'comandaRestaurante5');
  const detail = normalizeNs5OntologyEntity({
    entityId: 'Comanda',
    fields: [{ fieldId: 'comandaNumber', title: 'Number', type: 'string', required: true, description: 'Number.' }],
    lifecycleStates: [],
    transitions: [],
  }, 'Comanda');
  const gate = validateNs5OntologyEntity(plan, detail, ctx());
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_STORAGE_ID_FIELD'));
});

void test('mdm with lifecycle fails', () => {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Service orders',
    entities: [planEntity('ordenServicio5', 'Cliente')],
    relationships: [],
  }, 'ordenServicio5');
  const detail = normalizeNs5OntologyEntity({
    ...realDetail('ordenServicio5', 'Cliente'),
    lifecycleStates: [{ state: 'active', reachedBy: 'actor' }],
  }, 'Cliente');
  const gate = validateNs5OntologyEntity(plan, detail, ctx({ moduleName: 'ordenServicio5' }));
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_MDM_LIFECYCLE'));
});

void test('collectNs5LifecycleSignal is the I2 structural predicate', () => {
  const once = [journey('garcom', [step('openTab', 'act', 'Tab')])];
  assert.deepEqual(collectNs5LifecycleSignal(once, 'Tab'), { requiresTransitions: false, requiresBranching: false });
  const twice = [
    journey('garcom', [step('openTab', 'act', 'Tab')]),
    journey('caixa', [step('closeTab', 'act', 'Tab')]),
  ];
  assert.deepEqual(collectNs5LifecycleSignal(twice, 'Tab'), { requiresTransitions: true, requiresBranching: false });
  const decide = [journey('caixa', [step('openTab', 'act', 'Tab'), step('choose', 'decide', 'Tab')])];
  assert.deepEqual(collectNs5LifecycleSignal(decide, 'Tab'), { requiresTransitions: false, requiresBranching: true });
  assert.equal(collectNs5LifecycleSignal(twice, 'Ghost').requiresTransitions, false);
  assert.equal(ns5LifecycleHasBranchingOrigin({ transitions: [{ from: ['open'] }, { from: ['open'] }] }), true);
  assert.equal(ns5LifecycleHasBranchingOrigin({ transitions: [{ from: ['open'] }] }), false);
});

void test('repeated act with appendOnly empty lifecycle fails isolated entity validation', () => {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Tickets',
    entities: [{ ...corePlan('Ticket', 'ticketId', 'ticketId'), mutability: 'appendOnly' }],
    relationships: [],
  }, 'comandaRestaurante5');
  const journeys = [
    journey('garcom', [step('openTicket', 'act', 'Ticket')]),
    journey('caixa', [step('closeTicket', 'act', 'Ticket')]),
  ];
  const isolated = validateNs5OntologyEntity(plan, emptyCoreDetail('Ticket', 'ticketId'), ctx({ journeys }));
  assert.equal(isolated.ok, false);
  assert.ok(isolated.issues.some(issue => issue.code === 'NS5_ONTOLOGY_LIFECYCLE_REQUIRED' && /repeated act/.test(issue.message)));

  const overview = validateNs5OntologyPlan(plan, ctx({ journeys }));
  assert.equal(overview.ok, false);
  assert.ok(overview.issues.some(issue => issue.code === 'NS5_ONTOLOGY_LIFECYCLE_REQUIRED' && /appendOnly/.test(issue.message)));
});

void test('repeated act with lifecycle covering the second act passes isolated entity validation', () => {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Tickets',
    entities: [corePlan('Ticket', 'ticketId', 'ticketId')],
    relationships: [],
  }, 'comandaRestaurante5');
  const journeys = [
    journey('garcom', [step('openTicket', 'act', 'Ticket')]),
    journey('caixa', [step('closeTicket', 'act', 'Ticket')]),
  ];
  const detail = ticketLifecycle(false);
  const gate = validateNs5OntologyEntity(plan, normalizeNs5OntologyEntity(detail, 'Ticket'), ctx({ journeys }));
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('decide with empty lifecycle fails LIFECYCLE_REQUIRED and does not ask for branching yet', () => {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Tickets',
    entities: [corePlan('Ticket', 'ticketId', 'ticketId')],
    relationships: [],
  }, 'comandaRestaurante5');
  const journeys = [journey('caixa', [step('choose', 'decide', 'Ticket')])];
  const isolated = validateNs5OntologyEntity(plan, emptyCoreDetail('Ticket', 'ticketId'), ctx({ journeys }));
  assert.equal(isolated.ok, false);
  assert.ok(isolated.issues.some(issue => issue.code === 'NS5_ONTOLOGY_LIFECYCLE_REQUIRED' && /decide/.test(issue.message)));
  assert.equal(isolated.issues.some(issue => issue.code === 'NS5_ONTOLOGY_LIFECYCLE_BRANCHING_REQUIRED'), false);
});

void test('decide with one transition fails branching; two from the same origin pass', () => {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Tickets',
    entities: [corePlan('Ticket', 'ticketId', 'ticketId')],
    relationships: [],
  }, 'comandaRestaurante5');
  const journeys = [journey('caixa', [step('openTicket', 'act', 'Ticket'), step('choose', 'decide', 'Ticket')])];
  const one = validateNs5OntologyEntity(plan, normalizeNs5OntologyEntity(ticketLifecycle(false), 'Ticket'), ctx({ journeys }));
  assert.equal(one.ok, false);
  assert.ok(one.issues.some(issue => issue.code === 'NS5_ONTOLOGY_LIFECYCLE_BRANCHING_REQUIRED'));

  const two = validateNs5OntologyEntity(plan, normalizeNs5OntologyEntity(ticketLifecycle(true), 'Ticket'), ctx({ journeys }));
  assert.equal(two.ok, true, two.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('a single act may stay appendOnly without lifecycle', () => {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Tickets',
    entities: [{ ...corePlan('PaymentEvent', 'paymentEventId', 'paymentEventId'), mutability: 'appendOnly' }],
    relationships: [],
  }, 'comandaRestaurante5');
  const journeys = [journey('caixa', [step('registerPayment', 'act', 'PaymentEvent')])];
  const isolated = validateNs5OntologyEntity(plan, emptyCoreDetail('PaymentEvent', 'paymentEventId'), ctx({ journeys }));
  assert.equal(isolated.ok, true, isolated.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(isolated.issues.some(issue => issue.code === 'NS5_ONTOLOGY_LIFECYCLE_REQUIRED'), false);

  const overview = validateNs5OntologyPlan(plan, ctx({ journeys }));
  assert.equal(overview.ok, true, overview.issues.filter(issue => issue.severity === 'error').map(issue => issue.code).join(', '));
});

void test('plan overview does not demand lifecycle states when mutability is omitted', () => {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Tickets',
    entities: [corePlan('Ticket', 'ticketId', 'ticketId')],
    relationships: [],
  }, 'comandaRestaurante5');
  const journeys = [
    journey('garcom', [step('openTicket', 'act', 'Ticket')]),
    journey('caixa', [step('closeTicket', 'act', 'Ticket')]),
  ];
  const overview = validateNs5OntologyPlan(plan, ctx({ journeys }));
  assert.equal(overview.ok, true, overview.issues.filter(issue => issue.severity === 'error').map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(overview.issues.some(issue => issue.code === 'NS5_ONTOLOGY_LIFECYCLE_REQUIRED'), false);
});

void test('appendOnly with transitions fails', () => {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [{ ...corePlan('AuditEvent', 'auditEventId', 'auditEventId'), mutability: 'appendOnly' }],
    relationships: [],
  }, 'comandaRestaurante5');
  const detail = normalizeNs5OntologyEntity({
    entityId: 'AuditEvent',
    fields: [
      idField('AuditEvent', 'auditEventId'),
      { fieldId: 'status', title: 'Status', type: 'string', required: true, enum: [{ value: 'open', title: 'Open' }, { value: 'closed', title: 'Closed' }], description: 'Status.' },
    ],
    lifecycleStates: [
      { state: 'open', reachedBy: 'actor' },
      { state: 'closed', reachedBy: 'actor' },
    ],
    transitions: [{ transitionId: 'close', from: ['open'], to: 'closed', by: ['caixa'], description: 'Close.' }],
  }, 'AuditEvent');
  const gate = validateNs5OntologyEntity(plan, detail, ctx());
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_MUTABILITY_LIFECYCLE'));
});

void test('actor/command state without an arriving transition fails', () => {
  const source = realDetail('comandaRestaurante5', 'Comanda');
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [planEntity('comandaRestaurante5', 'Comanda')],
    relationships: [],
  }, 'comandaRestaurante5');
  const detail = normalizeNs5OntologyEntity({
    ...source,
    lifecycleStates: [
      ...source.lifecycleStates,
      { state: 'cancelled', reachedBy: 'actor' },
    ],
    fields: source.fields.map(field => field.fieldId === 'status'
      ? { ...field, enum: [...(field.enum || []), { value: 'cancelled', title: 'Cancelled' }] }
      : field),
  }, 'Comanda');
  const gate = validateNs5OntologyEntity(plan, detail, ctx());
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_STATE_UNREACHABLE'));
});

void test('time state with an arriving transition fails', () => {
  const source = realDetail('comandaRestaurante5', 'Comanda');
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [planEntity('comandaRestaurante5', 'Comanda')],
    relationships: [],
  }, 'comandaRestaurante5');
  const detail = normalizeNs5OntologyEntity({
    ...source,
    lifecycleStates: [
      { state: 'aberta', reachedBy: 'actor' },
      { state: 'overdue', reachedBy: 'time' },
    ],
    fields: source.fields.map(field => field.fieldId === 'status'
      ? { ...field, enum: [{ value: 'aberta', title: 'Aberta' }, { value: 'overdue', title: 'Vencida' }] }
      : field),
    transitions: [{ transitionId: 'expire', from: ['aberta'], to: 'overdue', by: 'time', description: 'Expires.' }],
  }, 'Comanda');
  const gate = validateNs5OntologyEntity(plan, detail, ctx());
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_TIME_TRANSITION'));
});

void test('transition by unknown actor fails', () => {
  const source = realDetail('comandaRestaurante5', 'Comanda');
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [planEntity('comandaRestaurante5', 'Comanda')],
    relationships: [],
  }, 'comandaRestaurante5');
  const detail = normalizeNs5OntologyEntity({
    ...source,
    transitions: [{ transitionId: 'fecharComanda', from: ['aberta'], to: 'fechada', by: ['ghost'], description: 'Close.' }],
  }, 'Comanda');
  const gate = validateNs5OntologyEntity(plan, detail, ctx());
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_TRANSITION_BY_UNKNOWN'));
});

void test('journey entity that the ontology omits is an error; uncited entity is a warning', () => {
  const mesa = mdmPlan('Mesa', 'Location', 'none', 'mesaId');
  const extra = corePlan('TipPolicy', 'tipPolicyId', 'tipPolicyId');
  const plan: Ns5OntologyPlanDraft = {
    moduleName: 'comandaRestaurante5',
    businessDomain: 'Restaurant orders',
    entities: [mesa, extra],
    relationships: [],
  };
  const gate = validateNs5OntologyPlan(plan, ctx());
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_JOURNEY_ENTITY' && /Comanda/.test(issue.message)));
  const covered: Ns5OntologyPlanDraft = {
    ...plan,
    entities: [mesa, corePlan('Comanda', 'comandaId', 'comandaNumber'), extra],
  };
  const coveredGate = validateNs5OntologyPlan(covered, ctx());
  assert.equal(coveredGate.ok, true, coveredGate.issues.filter(issue => issue.severity === 'error').map(issue => issue.code).join(', '));
  assert.ok(coveredGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_ENTITY_UNCITED' && issue.severity === 'warning' && /TipPolicy/.test(issue.message)));
  assert.deepEqual(coveredGate.uncitedEntities, ['TipPolicy']);
});

void test('isolated entity validation does not demand other journey-cited entities', () => {
  const mesa = mdmPlan('Mesa', 'Location', 'none', 'mesaId');
  const extra = corePlan('TipPolicy', 'tipPolicyId', 'tipPolicyId');
  const plan: Ns5OntologyPlanDraft = {
    moduleName: 'comandaRestaurante5',
    businessDomain: 'Restaurant orders',
    entities: [mesa, planEntity('comandaRestaurante5', 'Comanda'), extra],
    relationships: [],
  };
  const mesaGate = validateNs5OntologyEntity(plan, emptyMdmDetail('Mesa'), ctx());
  assert.equal(mesaGate.ok, true, mesaGate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(mesaGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_JOURNEY_ENTITY' || issue.code === 'NS5_ONTOLOGY_ENTITY_UNCITED'), false);
  assert.deepEqual(mesaGate.uncitedEntities, []);

  const comandaGate = validateNs5OntologyEntity(plan, normalizeNs5OntologyEntity(realDetail('comandaRestaurante5', 'Comanda'), 'Comanda'), ctx());
  assert.equal(comandaGate.ok, true, comandaGate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(comandaGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_JOURNEY_ENTITY'), false);

  const extraDetail = normalizeNs5OntologyEntity({
    entityId: 'TipPolicy',
    fields: [idField('TipPolicy', 'tipPolicyId')],
    lifecycleStates: [],
    transitions: [],
  }, 'TipPolicy');
  const extraGate = validateNs5OntologyEntity(plan, extraDetail, ctx());
  assert.equal(extraGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_ENTITY_UNCITED' || issue.code === 'NS5_ONTOLOGY_JOURNEY_ENTITY'), false);
  assert.deepEqual(extraGate.uncitedEntities, []);

  const missing = validateNs5OntologyPlan({ ...plan, entities: [mesa] }, ctx());
  assert.equal(missing.ok, false);
  assert.ok(missing.issues.some(issue => issue.code === 'NS5_ONTOLOGY_JOURNEY_ENTITY' && /Comanda/.test(issue.message)));
});

void test('n15 bindings require mdm endpoint [idField] and reject empty to.fieldIds', () => {
  const actors = loadNs5Actors('comandaRestaurante5');
  const journeys = loadNs5Journeys('comandaRestaurante5');
  const plan = normalizeNs5OntologyPlan(realPlan('comandaRestaurante5'), 'comandaRestaurante5', journeys);
  const details = plan.entities.map(entity => normalizeNs5OntologyEntity(realDetail('comandaRestaurante5', entity.entityId), entity.entityId));
  const bindings = normalizeNs5OntologyBindings(realBindings('comandaRestaurante5'));
  const good = validateNs5OntologyBindings(plan, details, bindings, {
    moduleName: 'comandaRestaurante5',
    actors,
    journeys,
  });
  assert.equal(good.ok, true, good.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));

  const emptyTo = normalizeNs5OntologyBindings({
    bindings: bindings.bindings.map(binding => binding.relationshipId === 'comandaMesa'
      ? { ...binding, realization: { ...binding.realization, to: { entityId: 'Mesa', fieldIds: [] } } }
      : binding),
  });
  const emptyGate = validateNs5OntologyBindings(plan, details, emptyTo, {
    moduleName: 'comandaRestaurante5',
    actors,
    journeys,
  });
  assert.equal(emptyGate.ok, false);
  assert.ok(emptyGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_RELATIONSHIP_FIELDS_REQUIRED'));

  const wrongId = normalizeNs5OntologyBindings({
    bindings: bindings.bindings.map(binding => binding.relationshipId === 'comandaMesa'
      ? { ...binding, realization: { ...binding.realization, to: { entityId: 'Mesa', fieldIds: ['name'] } } }
      : binding),
  });
  const wrongGate = validateNs5OntologyBindings(plan, details, wrongId, {
    moduleName: 'comandaRestaurante5',
    actors,
    journeys,
  });
  assert.equal(wrongGate.ok, false);
  assert.ok(wrongGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_RELATIONSHIP_MDM_ENDPOINT_ID'));
});

void test('normalize drops mdmSubtype except on mdm and appendOnly except off mdm', () => {
  const mixed = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [
      { ...mdmPlan('Mesa', 'Location', 'none', 'mesaId'), mutability: 'appendOnly' },
      { ...corePlan('Comanda', 'comandaId', 'comandaNumber'), mdmSubtype: 'Document', mutability: 'appendOnly' },
    ],
    relationships: [],
  }, 'comandaRestaurante5');
  assert.equal(mixed.entities[0].mdmSubtype, 'Location');
  assert.equal('mutability' in mixed.entities[0], false);
  assert.equal('mdmSubtype' in mixed.entities[1], false);
  assert.equal(mixed.entities[1].mutability, 'appendOnly');
  const gate = validateNs5OntologyPlan(mixed, ctx());
  assert.equal(gate.ok, true, gate.issues.filter(issue => issue.severity === 'error').map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_MUTABILITY' || issue.code === 'NS5_ONTOLOGY_MDM_SUBTYPE_UNKNOWN'), false);
});

void test('live plan payload (5/5 mutability, 3/5 mdmSubtype off-kind) passes after normalize', () => {
  const fixture = JSON.parse(
    readFileSync(path.join(HERE, 'fixtures', 'comandaRestaurante5-plan-kind-fields.json'), 'utf8'),
  ) as {
    derivedFrom: string;
    entities: Array<{ kind: string; mdmSubtype?: string; mutability?: string }>;
  };
  assert.match(fixture.derivedFrom, /ontology30-plan-draft\.json$/);
  assert.equal(fixture.entities.length, 5);
  assert.equal(fixture.entities.filter(entity => entity.mutability === 'appendOnly').length, 5);
  assert.equal(fixture.entities.filter(entity => entity.kind !== 'mdm' && entity.mdmSubtype).length, 3);
  assert.equal(fixture.entities.filter(entity => entity.kind === 'mdm' && entity.mutability === 'appendOnly').length, 2);
  const plan = normalizeNs5OntologyPlan(fixture, 'comandaRestaurante5');
  assert.equal(plan.entities.filter(entity => entity.kind !== 'mdm' && entity.mdmSubtype).length, 0);
  assert.equal(plan.entities.filter(entity => entity.kind === 'mdm' && entity.mutability).length, 0);
  assert.equal(plan.entities.filter(entity => entity.kind === 'mdm' && entity.mdmSubtype).length, 2);
  assert.equal(plan.entities.filter(entity => entity.kind !== 'mdm' && entity.mutability === 'appendOnly').length, 3);
  const journeys = [{
    business: {
      actorRef: 'caixa',
      title: 'Cover the plan entities',
      goal: 'Cite every frozen entity.',
      entry: { mode: 'coldStart' as const },
      steps: plan.entities.map(entity => ({
        stepId: `cite${entity.entityId}`,
        kind: 'act' as const,
        entity: entity.entityId,
        title: entity.entityId,
        description: 'Cited.',
      })),
      outcome: { statement: 'Covered.', evidence: ['Covered.'] },
    },
  }];
  const gate = validateNs5OntologyPlan(plan, ctx({ journeys }));
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_MUTABILITY' || issue.code === 'NS5_ONTOLOGY_MDM_SUBTYPE_UNKNOWN'), false);
});

void test('gate still requires mdmSubtype on mdm and rejects off-kind fields when normalize is skipped', () => {
  const missing = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [mdmPlan('Mesa', '', 'none', 'mesaId')],
    relationships: [],
  }, 'comandaRestaurante5');
  delete missing.entities[0].mdmSubtype;
  const missingGate = validateNs5OntologyPlan(missing, ctx({ journeys: [{ business: { ...FECHAR.business, steps: [{ ...FECHAR.business.steps[0], entity: 'Mesa' }] } }] }));
  assert.ok(missingGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_MDM_SUBTYPE_REQUIRED'));

  const skipped = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [mdmPlan('Mesa', 'Location', 'none', 'mesaId'), corePlan('Comanda', 'comandaId', 'comandaNumber')],
    relationships: [],
  }, 'comandaRestaurante5');
  skipped.entities[0].mutability = 'appendOnly';
  skipped.entities[1].mdmSubtype = 'Document';
  const skippedGate = validateNs5OntologyPlan(skipped, ctx());
  assert.ok(skippedGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_MUTABILITY' && /mdm/.test(issue.message)));
  assert.ok(skippedGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_MDM_SUBTYPE_UNKNOWN' && /only valid on kind mdm/.test(issue.message)));
});

void test('normalize drops appendOnly when journeys repeat act or decide; plan then approves', () => {
  const twice = [
    journey('garcom', [step('openTicket', 'act', 'Ticket')]),
    journey('caixa', [step('closeTicket', 'act', 'Ticket')]),
  ];
  const twicePlan = normalizeNs5OntologyPlan({
    businessDomain: 'Tickets',
    entities: [{ ...corePlan('Ticket', 'ticketId', 'ticketId'), mutability: 'appendOnly' }],
    relationships: [],
  }, 'comandaRestaurante5', twice);
  assert.equal('mutability' in twicePlan.entities[0], false);
  const twiceGate = validateNs5OntologyPlan(twicePlan, ctx({ journeys: twice }));
  assert.equal(twiceGate.ok, true, twiceGate.issues.filter(issue => issue.severity === 'error').map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(twiceGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_LIFECYCLE_REQUIRED'), false);

  const decide = [journey('caixa', [step('choose', 'decide', 'Ticket')])];
  const decidePlan = normalizeNs5OntologyPlan({
    businessDomain: 'Tickets',
    entities: [{ ...corePlan('Ticket', 'ticketId', 'ticketId'), mutability: 'appendOnly' }],
    relationships: [],
  }, 'comandaRestaurante5', decide);
  assert.equal('mutability' in decidePlan.entities[0], false);
  const decideGate = validateNs5OntologyPlan(decidePlan, ctx({ journeys: decide }));
  assert.equal(decideGate.ok, true, decideGate.issues.filter(issue => issue.severity === 'error').map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('normalize keeps appendOnly when a single act does not require lifecycle', () => {
  const journeys = [journey('caixa', [step('registerPayment', 'act', 'PaymentEvent')])];
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Tickets',
    entities: [{ ...corePlan('PaymentEvent', 'paymentEventId', 'paymentEventId'), mutability: 'appendOnly' }],
    relationships: [],
  }, 'comandaRestaurante5', journeys);
  assert.equal(plan.entities[0].mutability, 'appendOnly');
  const overview = validateNs5OntologyPlan(plan, ctx({ journeys }));
  assert.equal(overview.ok, true, overview.issues.filter(issue => issue.severity === 'error').map(issue => issue.code).join(', '));
});

void test('gate still rejects appendOnly with lifecycle signal when normalize is skipped', () => {
  const journeys = [
    journey('garcom', [step('openTicket', 'act', 'Ticket')]),
    journey('caixa', [step('closeTicket', 'act', 'Ticket')]),
  ];
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Tickets',
    entities: [corePlan('Ticket', 'ticketId', 'ticketId')],
    relationships: [],
  }, 'comandaRestaurante5');
  plan.entities[0].mutability = 'appendOnly';
  const overview = validateNs5OntologyPlan(plan, ctx({ journeys }));
  assert.equal(overview.ok, false);
  assert.ok(overview.issues.some(issue => issue.code === 'NS5_ONTOLOGY_LIFECYCLE_REQUIRED' && /appendOnly/.test(issue.message)));
});

void test('normalize accepts typed details as an array and as a record; string values are dropped', () => {
  const typed = { type: 'money' as const, description: 'Sum of active items.' };
  const fromArray = normalizeNs5OntologyEntity({
    entityId: 'Comanda',
    fields: [],
    details: [{ name: 'total', type: 'money', description: 'Sum of active items.' }],
    lifecycleStates: [],
    transitions: [],
  }, 'Comanda');
  assert.deepEqual(fromArray.details, { total: typed });
  const fromRecord = normalizeNs5OntologyEntity({
    entityId: 'Comanda',
    fields: [],
    details: { total: typed },
    lifecycleStates: [],
    transitions: [],
  }, 'Comanda');
  assert.deepEqual(fromRecord.details, { total: typed });
  const fromString = normalizeNs5OntologyEntity({
    entityId: 'Comanda',
    fields: [],
    details: { total: 'Sum of active items.' },
    lifecycleStates: [],
    transitions: [],
  }, 'Comanda');
  assert.equal(fromString.details, undefined);
});

void test('ontology30 plan prompt omits mutability when journeys repeat act or decide', () => {
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /more than one `act` step on this entity/);
  assert.match(prompt, /or a `decide` step on it, omit `mutability` here/);
  assert.match(prompt, /The entity\s+pass declares `lifecycleStates`\s+and `transitions` covering those steps/);
  assert.match(prompt, /moduleDetails/);
  assert.match(prompt, /one-sentence `description`/);
  assert.match(prompt, /A reference catalog nobody creates in a journey/);
  assert.match(prompt, /as its `entity` or in `affects`/);
  assert.doesNotMatch(prompt, /never both/);
  assert.doesNotMatch(prompt, /comanda|garcom|waiter|stock|quantity|abrir|fechar/i);
});

void test('ontology30 entity prompt states uniqueKeys, typed details, enum titles and intrinsic constraints', () => {
  const prompt = readFileSync(path.join(HERE, 'promptEntity.md'), 'utf8');
  assert.match(prompt, /Declare `unique`\/`uniqueKeys` for what must not repeat/);
  assert.match(prompt, /intrinsic to the type, never a business\s+policy/);
  assert.match(prompt, /Each enum entry is `\{ "value", "title" \}`/);
  assert.match(prompt, /\{ "name", "type", "description" \}/);
  assert.match(prompt, /A reference catalog nobody creates in a journey/);
  assert.doesNotMatch(prompt, /never both/);
});

void test('plan human prompt includes journeys, actors and level-1 placeholders', () => {
  const prompt = buildNs5OntologyPlanHumanPrompt({
    sourcePrompt: 'Restaurant table orders.',
    userLanguage: 'pt-BR',
    actors: ACTORS,
    journeys: [{ schemaVersion: '2026-09-10-ns5-journey-v1', journeyId: 'fecharComanda', business: FECHAR.business, businessHash: 'sha256:x' }],
    level1Catalog: '## Platform level-1 catalog (placeholders — not module entities)\nSubtypes: <Person>, <Location>',
  });
  assert.match(prompt, /caixa/);
  assert.match(prompt, /affects=Mesa/);
  assert.match(prompt, /<Person>/);
  assert.match(prompt, /Restaurant table orders/);
});

void test('bindings human prompt lists the synthetic mdm identity', () => {
  const mesa = mdmPlan('Mesa', 'Location', 'none', 'mesaId');
  const assembled = assembleNs5Ontology(
    { moduleName: 'comandaRestaurante5', businessDomain: 'Restaurant orders', entities: [mesa], relationships: [] },
    [emptyMdmDetail('Mesa')],
  );
  const prompt = buildNs5OntologyBindingsHumanPrompt({ plan: { moduleName: 'comandaRestaurante5', businessDomain: 'Restaurant orders', entities: [mesa], relationships: [] }, entities: assembled.entities });
  assert.match(prompt, /mesaId/);
});

void test('persistArtifacts reconciles ontology defs against the index', () => {
  const source = readFileSync(new URL('./agentNs5Ontology.ts', import.meta.url), 'utf8');
  const persist = source.slice(source.indexOf('async function persistArtifacts'));
  assert.match(persist, /reconcileModuleDefs\(\s*moduleName,\s*'ontology'/);
  assert.match(persist, /removedOrphans/);
  assert.match(persist, /liftedAggregateEntities/);
  assert.match(persist, /applyNs5PlatformServiceCandidateDecisions/);
  assert.match(persist, /writeStepState/);
});

void test('supporting file-or-note entity linked to mdm is a platform-service candidate warning', () => {
  const person = mdmPlan('Cliente', 'Person', 'person', 'id');
  const photo: Ns5OntologyPlanEntity = {
    entityId: 'Foto',
    title: 'Photo',
    description: 'A file of the master record.',
    kind: 'supporting',
    party: 'none',
    displayField: 'fileName',
    storage: { target: 'moduleDatabase', scope: 'module', idField: 'id' },
  };
  const plan: Ns5OntologyPlanDraft = {
    moduleName: 'comandaRestaurante5',
    businessDomain: 'Sample',
    entities: [person, photo],
    relationships: [{
      relationshipId: 'fotoOfCliente',
      fromEntity: 'Foto',
      toEntity: 'Cliente',
      type: 'oneToMany',
      required: false,
      description: 'Photos attached to the customer record.',
      persistence: { mode: 'crossStoreReference' },
    }],
  };
  const photoDetail: Ns5OntologyEntityDraft = {
    entityId: 'Foto',
    fields: [
      { fieldId: 'id', title: 'id', type: 'uuid', required: true, description: 'Identity.' },
      { fieldId: 'url', title: 'url', type: 'string', required: true, description: 'File.' },
      { fieldId: 'fileName', title: 'fileName', type: 'string', required: true, description: 'Name.' },
      { fieldId: 'mimeType', title: 'mimeType', type: 'string', required: true, description: 'Type.' },
    ],
    lifecycleStates: [],
    transitions: [],
  };
  const assembled = assembleNs5Ontology(plan, [emptyMdmDetail('Cliente'), photoDetail], {
    bindings: [{
      relationshipId: 'fotoOfCliente',
      realization: {
        kind: 'fieldReference',
        ownerEntity: 'Foto',
        from: { entityId: 'Foto', fieldIds: ['id'] },
        to: { entityId: 'Cliente', fieldIds: ['id'] },
      },
    }],
  });
  const gate = validateNs5OntologyAssembly(assembled, {
    moduleName: 'comandaRestaurante5',
    actors: ACTORS,
    journeys: [journey('garcom', [step('attach', 'act', 'Foto')])],
    requireJourneyCitation: false,
    requireRelationshipRealization: false,
  });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const warning = gate.issues.find(issue => issue.code === 'NS5_ONTOLOGY_PLATFORM_SERVICE_CANDIDATE');
  assert.ok(warning);
  assert.equal(warning.severity, 'warning');
  assert.match(warning.message, /attachments\/comments already exist/);
  const withDecision = applyNs5PlatformServiceCandidateDecisions(assembled.index, assembled.entities);
  assert.equal(withDecision.systemDecisions?.length, 1);
  assert.equal(withDecision.systemDecisions?.[0]?.chosen, NS5_PLATFORM_SERVICE_KEEP);
  assert.deepEqual(withDecision.systemDecisions?.[0]?.alternatives, [NS5_PLATFORM_SERVICE_KEEP, NS5_PLATFORM_SERVICE_USE]);
});

void test('entityId matching a platform service name is not a gate', () => {
  const person = mdmPlan('Cliente', 'Person', 'person', 'id');
  const named: Ns5OntologyPlanEntity = {
    entityId: 'Attachment',
    title: 'Attachment',
    description: 'A business attachment record with its own payload.',
    kind: 'supporting',
    party: 'none',
    displayField: 'label',
    storage: { target: 'moduleDatabase', scope: 'module', idField: 'id' },
  };
  const plan: Ns5OntologyPlanDraft = {
    moduleName: 'comandaRestaurante5',
    businessDomain: 'Sample',
    entities: [person, named],
    relationships: [{
      relationshipId: 'attachmentOfCliente',
      fromEntity: 'Attachment',
      toEntity: 'Cliente',
      type: 'oneToMany',
      required: false,
      description: 'Attachments of the customer record.',
      persistence: { mode: 'crossStoreReference' },
    }],
  };
  const namedDetail: Ns5OntologyEntityDraft = {
    entityId: 'Attachment',
    fields: [
      { fieldId: 'id', title: 'id', type: 'uuid', required: true, description: 'Identity.' },
      { fieldId: 'label', title: 'label', type: 'string', required: true, description: 'Label.' },
    ],
    lifecycleStates: [],
    transitions: [],
  };
  const assembled = assembleNs5Ontology(plan, [emptyMdmDetail('Cliente'), namedDetail]);
  const gate = validateNs5OntologyAssembly(assembled, {
    moduleName: 'comandaRestaurante5',
    actors: ACTORS,
    journeys: [],
    requireJourneyCitation: false,
    requireRelationshipRealization: false,
  });
  assert.equal(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_PLATFORM_SERVICE_CANDIDATE'), false);
});

void test('live serviceOrderPhotos id→id fails; FK on many or fieldCollection on one passes', () => {
  const orden = loadNs5Defs<Ns5OntologyEntityArtifact>(
    'steps/ontology30/fixtures/live',
    'OrdenServicio.defs.ts',
  );
  const foto = loadNs5Defs<Ns5OntologyEntityArtifact>(
    'steps/ontology30/fixtures/live',
    'FotoOrdenServicio.defs.ts',
  );
  const actors: Ns5ModuleActor[] = [
    { actorId: 'recepcionista', kind: 'internal', origin: 'named', title: 'Reception', description: 'Receives devices.' },
    { actorId: 'tecnico', kind: 'internal', origin: 'named', title: 'Tech', description: 'Repairs.' },
    { actorId: 'cliente', kind: 'external', origin: 'named', title: 'Customer', description: 'Owns orders.' },
  ];
  const writerJourneys = [
    journey('recepcionista', [
      step('openOrder', 'act', 'OrdenServicio'),
      step('attachPhoto', 'act', 'FotoOrdenServicio'),
    ]),
  ];
  const bad: Ns5OntologyRelationship = {
    relationshipId: 'serviceOrderPhotos',
    fromEntity: 'OrdenServicio',
    toEntity: 'FotoOrdenServicio',
    type: 'oneToMany',
    required: false,
    description: 'Photos taken at reception of the service order.',
    persistence: { mode: 'crossStoreReference' },
    realization: {
      kind: 'fieldReference',
      ownerEntity: 'FotoOrdenServicio',
      from: { entityId: 'OrdenServicio', fieldIds: ['id'] },
      to: { entityId: 'FotoOrdenServicio', fieldIds: ['id'] },
    },
  };
  const failing = validateNs5OntologyAssembly(
    {
      entities: [orden, foto],
      index: {
        schemaVersion: '2026-09-11-ns5-ontology-v2',
        moduleName: 'ordenServicio5',
        businessDomain: 'Service orders.',
        entities: ['OrdenServicio', 'FotoOrdenServicio'],
        relationships: [bad],
      },
    },
    { moduleName: 'ordenServicio5', actors, requireJourneyCitation: false, requireRelationshipRealization: true },
  );
  assert.equal(failing.ok, false);
  assert.ok(failing.issues.some(issue => issue.code === 'NS5_ONTOLOGY_RELATIONSHIP_OWNER_KEY'));
  assert.ok(failing.issues.some(issue => issue.code === 'NS5_ONTOLOGY_RELATIONSHIP_MDM_OWNER_WITHOUT_NAMESPACE'));

  const collectionOrden = {
    ...orden,
    fields: [
      ...orden.fields,
      {
        fieldId: 'fotoOrdenServicioIds',
        title: 'Photos',
        type: 'json' as const,
        required: false,
        description: 'Photo ids attached at reception.',
      },
    ],
  };
  const collection: Ns5OntologyRelationship = {
    ...bad,
    persistence: { mode: 'moduleReference' },
    realization: {
      kind: 'fieldCollection',
      ownerEntity: 'OrdenServicio',
      from: { entityId: 'OrdenServicio', fieldIds: ['fotoOrdenServicioIds'] },
      to: { entityId: 'FotoOrdenServicio', fieldIds: ['id'] },
    },
  };
  const collectionGate = validateNs5OntologyAssembly(
    {
      entities: [collectionOrden, foto],
      index: {
        schemaVersion: '2026-09-11-ns5-ontology-v2',
        moduleName: 'ordenServicio5',
        businessDomain: 'Service orders.',
        entities: ['OrdenServicio', 'FotoOrdenServicio'],
        relationships: [collection],
      },
    },
    { moduleName: 'ordenServicio5', actors, journeys: writerJourneys, requireJourneyCitation: false, requireRelationshipRealization: true },
  );
  assert.equal(
    collectionGate.ok,
    true,
    collectionGate.issues.filter(issue => issue.severity === 'error').map(issue => `${issue.code}: ${issue.message}`).join('\n'),
  );

  const namespaceFoto = {
    ...foto,
    fields: [{
      fieldId: 'ordenServicioId',
      title: 'Service order',
      type: 'uuid' as const,
      required: false,
      description: 'Order this photo belongs to.',
    }],
  };
  const fk: Ns5OntologyRelationship = {
    ...bad,
    realization: {
      kind: 'fieldReference',
      ownerEntity: 'FotoOrdenServicio',
      from: { entityId: 'OrdenServicio', fieldIds: ['id'] },
      to: { entityId: 'FotoOrdenServicio', fieldIds: ['ordenServicioId'] },
    },
  };
  const fkGate = validateNs5OntologyAssembly(
    {
      entities: [orden, namespaceFoto],
      index: {
        schemaVersion: '2026-09-11-ns5-ontology-v2',
        moduleName: 'ordenServicio5',
        businessDomain: 'Service orders.',
        entities: ['OrdenServicio', 'FotoOrdenServicio'],
        relationships: [fk],
      },
    },
    { moduleName: 'ordenServicio5', actors, journeys: writerJourneys, requireJourneyCitation: false, requireRelationshipRealization: true },
  );
  assert.equal(
    fkGate.ok,
    true,
    fkGate.issues.filter(issue => issue.severity === 'error').map(issue => `${issue.code}: ${issue.message}`).join('\n'),
  );
});

void test('PainelMensalidades aggregate-only entity fails; module.details version passes', () => {
  const panelPlan: Ns5OntologyPlanDraft = {
    moduleName: 'mensalidadesAcademia',
    businessDomain: 'Gym fees',
    entities: [{
      entityId: 'PainelMensalidades',
      title: 'Panel',
      description: 'Monthly KPIs.',
      kind: 'supporting',
      party: 'none',
      displayField: 'referenceMonth',
      mutability: 'appendOnly',
      storage: { target: 'moduleDatabase', scope: 'module', idField: 'painelMensalidadesId' },
    }],
    relationships: [],
  };
  const panelDetail: Ns5OntologyEntityDraft = {
    entityId: 'PainelMensalidades',
    fields: [
      idField('PainelMensalidades', 'painelMensalidadesId'),
      { fieldId: 'referenceMonth', title: 'Month', type: 'string', required: true, description: 'Reference month.' },
    ],
    details: {
      totalAreceber: { type: 'money', description: 'Soma dos valores das mensalidades geradas para o mês de referência.' },
      quantidadeAlunosBloqueados: { type: 'integer', description: 'Quantidade de alunos bloqueados por possuírem duas mensalidades vencidas.' },
    },
    lifecycleStates: [],
    transitions: [],
  };
  const inspectOnly = journey('garcom', [
    step('locatePanel', 'locate', 'PainelMensalidades'),
    step('inspectPanel', 'inspect', 'PainelMensalidades'),
  ]);
  const failing = validateNs5OntologyEntity(panelPlan, panelDetail, ctx({
    moduleName: 'mensalidadesAcademia',
    journeys: [inspectOnly],
  }));
  assert.equal(failing.ok, false);
  assert.ok(failing.issues.some(issue => issue.code === 'NS5_ONTOLOGY_AGGREGATE_ONLY_ENTITY' && /module.details/.test(issue.message)));

  const mensalidadePlan: Ns5OntologyPlanDraft = {
    moduleName: 'mensalidadesAcademia',
    businessDomain: 'Gym fees',
    entities: [corePlan('Mensalidade', 'mensalidadeId', 'mensalidadeId')],
    relationships: [],
    moduleDetails: {
      totalAreceber: { type: 'money', description: 'Soma dos valores das mensalidades geradas para o mês de referência.' },
      quantidadeAlunosBloqueados: { type: 'integer', description: 'Quantidade de alunos bloqueados por possuírem duas mensalidades vencidas.' },
    },
  };
  const generate = journey('garcom', [step('gerar', 'act', 'Mensalidade')]);
  const passingPlan = validateNs5OntologyPlan(mensalidadePlan, ctx({
    moduleName: 'mensalidadesAcademia',
    journeys: [generate],
  }));
  assert.equal(passingPlan.ok, true, passingPlan.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const passingEntity = validateNs5OntologyEntity(
    mensalidadePlan,
    emptyCoreDetail('Mensalidade', 'mensalidadeId'),
    ctx({ moduleName: 'mensalidadesAcademia', journeys: [generate] }),
  );
  assert.equal(passingEntity.ok, true, passingEntity.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const module = applyNs5ModuleDetails(
    {
      schemaVersion: '2026-09-10-ns5-module-v2' as const,
      moduleName: 'mensalidadesAcademia',
      title: 'Fees',
      userLanguage: 'pt-BR',
      productLanguages: ['pt-BR'],
      defaultLanguage: 'pt-BR',
      sourcePrompt: 'academia',
    },
    mensalidadePlan.moduleDetails,
  );
  assert.deepEqual(module.details?.totalAreceber, mensalidadePlan.moduleDetails?.totalAreceber);
});

function panelPlan(entityId: string, idField: string): Ns5OntologyPlanEntity {
  return {
    entityId,
    title: entityId,
    description: 'Monthly KPIs.',
    kind: 'supporting',
    party: 'none',
    displayField: idField,
    mutability: 'appendOnly',
    storage: { target: 'moduleDatabase', scope: 'module', idField },
  };
}

function emptyModule(): Parameters<typeof applyNs5ModuleDetails>[0] {
  return {
    schemaVersion: '2026-09-10-ns5-module-v2',
    moduleName: 'mensalidadesAcademia',
    title: 'Fees',
    userLanguage: 'pt-BR',
    productLanguages: ['pt-BR'],
    defaultLanguage: 'pt-BR',
    sourcePrompt: 'academia',
  };
}

void test('lift moves PainelGerencial and PainelMensalidades into module.details; ontology30 then approves', () => {
  const generate = journey('garcom', [step('gerar', 'act', 'Mensalidade')]);
  const inspectPanel = journey('garcom', [
    step('locatePanel', 'locate', 'PainelGerencial'),
    step('inspectPanel', 'inspect', 'PainelGerencial'),
  ]);
  const painelGerencial = loadNs5FixtureJson<Ns5OntologyEntityDraft>(
    'steps/ontology30/fixtures', 'mensalidadesAcademia', 'PainelGerencial-draft.json',
  );
  const gerencialPlan: Ns5OntologyPlanDraft = {
    moduleName: 'mensalidadesAcademia',
    businessDomain: 'Gym fees',
    entities: [corePlan('Mensalidade', 'mensalidadeId', 'mensalidadeId'), panelPlan('PainelGerencial', 'id')],
    relationships: [],
  };
  const gerencialLift = liftNs5AggregateOnlyEntities(
    gerencialPlan,
    [emptyCoreDetail('Mensalidade', 'mensalidadeId'), painelGerencial],
    [generate, inspectPanel],
  );
  assert.deepEqual(gerencialLift.issues, []);
  assert.deepEqual(gerencialLift.liftedEntityIds, ['PainelGerencial']);
  assert.equal(gerencialLift.plan.entities.some(entity => entity.entityId === 'PainelGerencial'), false);
  assert.deepEqual(Object.keys(gerencialLift.plan.moduleDetails || {}), [
    'totalAreceberMes',
    'totalRecebidoMes',
    'quantidadeAlunosAtivos',
    'quantidadeAlunosBloqueados',
    'quantidadeAlunosInadimplentes',
  ]);
  const assembled = assembleNs5Ontology(gerencialLift.plan, gerencialLift.details);
  assert.equal(assembled.entities.some(entity => entity.entityId === 'PainelGerencial'), false);
  assert.equal(assembled.index.entities.includes('PainelGerencial'), false);
  const gerencialGate = validateNs5OntologyBindings(gerencialLift.plan, gerencialLift.details, { bindings: [] }, ctx({
    moduleName: 'mensalidadesAcademia',
    journeys: [generate, inspectPanel],
    requireRelationshipRealization: false,
  }));
  assert.equal(gerencialGate.ok, true, gerencialGate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const gerencialModule = applyNs5ModuleDetails(emptyModule(), gerencialLift.plan.moduleDetails);
  assert.deepEqual(gerencialModule.details?.quantidadeAlunosAtivos, painelGerencial.details?.quantidadeAlunosAtivos);
  const overlapping = liftNs5AggregateOnlyEntities(
    { ...gerencialPlan, moduleDetails: { quantidadeAlunosAtivos: { type: 'integer', description: 'From the plan.' } } },
    [emptyCoreDetail('Mensalidade', 'mensalidadeId'), painelGerencial],
    [generate, inspectPanel],
  );
  assert.deepEqual(overlapping.issues, []);
  assert.deepEqual(overlapping.plan.moduleDetails?.quantidadeAlunosAtivos, { type: 'integer', description: 'From the plan.' });
  assert.ok(overlapping.plan.moduleDetails?.totalAreceberMes);

  const painelMensalidades = loadNs5FixtureJson<Ns5OntologyEntityDraft>(
    'steps/ontology30/fixtures', 'mensalidadesAcademia', 'PainelMensalidades-draft.json',
  );
  const mensalidadesPlan: Ns5OntologyPlanDraft = {
    moduleName: 'mensalidadesAcademia',
    businessDomain: 'Gym fees',
    entities: [corePlan('Mensalidade', 'mensalidadeId', 'mensalidadeId'), panelPlan('PainelMensalidades', 'painelMensalidadesId')],
    relationships: [],
  };
  const mensalidadesLift = liftNs5AggregateOnlyEntities(
    mensalidadesPlan,
    [emptyCoreDetail('Mensalidade', 'mensalidadeId'), painelMensalidades],
    [generate, journey('garcom', [step('locatePanel', 'locate', 'PainelMensalidades'), step('inspectPanel', 'inspect', 'PainelMensalidades')])],
  );
  assert.deepEqual(mensalidadesLift.issues, []);
  assert.deepEqual(mensalidadesLift.liftedEntityIds, ['PainelMensalidades']);
  assert.equal(mensalidadesLift.plan.entities.some(entity => entity.entityId === 'PainelMensalidades'), false);
  assert.equal(Object.keys(mensalidadesLift.plan.moduleDetails || {}).length, 5);
  const mensalidadesGate = validateNs5OntologyBindings(mensalidadesLift.plan, mensalidadesLift.details, { bindings: [] }, ctx({
    moduleName: 'mensalidadesAcademia',
    journeys: [generate, journey('garcom', [step('locatePanel', 'locate', 'PainelMensalidades'), step('inspectPanel', 'inspect', 'PainelMensalidades')])],
    requireRelationshipRealization: false,
  }));
  assert.equal(mensalidadesGate.ok, true, mensalidadesGate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('two aggregate-only entities sharing a details key is NS5_ONTOLOGY_AGGREGATE_DETAIL_COLLISION', () => {
  const generate = journey('garcom', [step('gerar', 'act', 'Mensalidade')]);
  const inspectOnly = journey('garcom', [
    step('locateA', 'locate', 'PainelA'),
    step('inspectA', 'inspect', 'PainelA'),
    step('locateB', 'locate', 'PainelB'),
    step('inspectB', 'inspect', 'PainelB'),
  ]);
  const plan: Ns5OntologyPlanDraft = {
    moduleName: 'mensalidadesAcademia',
    businessDomain: 'Gym fees',
    entities: [
      corePlan('Mensalidade', 'mensalidadeId', 'mensalidadeId'),
      panelPlan('PainelA', 'id'),
      panelPlan('PainelB', 'id'),
    ],
    relationships: [],
  };
  const shared = {
    totalAreceberMes: { type: 'money' as const, description: 'Soma dos valores das mensalidades geradas para o mês.' },
  };
  const lift = liftNs5AggregateOnlyEntities(
    plan,
    [
      emptyCoreDetail('Mensalidade', 'mensalidadeId'),
      { entityId: 'PainelA', fields: [idField('PainelA', 'id')], details: shared, lifecycleStates: [], transitions: [] },
      { entityId: 'PainelB', fields: [idField('PainelB', 'id')], details: shared, lifecycleStates: [], transitions: [] },
    ],
    [generate, inspectOnly],
  );
  assert.equal(lift.plan.entities.some(entity => entity.entityId === 'PainelA'), true);
  assert.ok(lift.issues.some(issue => (
    issue.code === 'NS5_ONTOLOGY_AGGREGATE_DETAIL_COLLISION'
    && /PainelA/.test(issue.message)
    && /PainelB/.test(issue.message)
    && /totalAreceberMes/.test(issue.message)
  )));
});

void test('aggregate-only entity with a relationship is not lifted; gate stays the net', () => {
  const generate = journey('garcom', [step('gerar', 'act', 'Mensalidade')]);
  const inspectPanel = journey('garcom', [
    step('locatePanel', 'locate', 'PainelGerencial'),
    step('inspectPanel', 'inspect', 'PainelGerencial'),
  ]);
  const painelGerencial = loadNs5FixtureJson<Ns5OntologyEntityDraft>(
    'steps/ontology30/fixtures', 'mensalidadesAcademia', 'PainelGerencial-draft.json',
  );
  const plan: Ns5OntologyPlanDraft = {
    moduleName: 'mensalidadesAcademia',
    businessDomain: 'Gym fees',
    entities: [corePlan('Mensalidade', 'mensalidadeId', 'mensalidadeId'), panelPlan('PainelGerencial', 'id')],
    relationships: [{
      relationshipId: 'mensalidadePainel',
      fromEntity: 'Mensalidade',
      toEntity: 'PainelGerencial',
      type: 'manyToOne',
      required: false,
      description: 'Fees rolled into the management panel.',
      persistence: { mode: 'moduleReference' },
    }],
  };
  const lift = liftNs5AggregateOnlyEntities(
    plan,
    [emptyCoreDetail('Mensalidade', 'mensalidadeId'), painelGerencial],
    [generate, inspectPanel],
  );
  assert.deepEqual(lift.liftedEntityIds, []);
  assert.equal(lift.plan.entities.some(entity => entity.entityId === 'PainelGerencial'), true);
  const failing = validateNs5OntologyEntity(plan, painelGerencial, ctx({
    moduleName: 'mensalidadesAcademia',
    journeys: [generate, inspectPanel],
  }));
  assert.equal(failing.ok, false);
  assert.ok(failing.issues.some(issue => issue.code === 'NS5_ONTOLOGY_AGGREGATE_ONLY_ENTITY'));
});

void test('uniqueKeys require existing fields, reject idField, and unique is not on idField', () => {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Gym fees',
    entities: [corePlan('Mensalidade', 'id', 'id')],
    relationships: [],
  }, 'mensalidadesAcademia');
  const base = {
    entityId: 'Mensalidade',
    fields: [
      idField('Mensalidade', 'id'),
      { fieldId: 'matriculaId', title: 'Enrollment', type: 'uuid' as const, required: true, description: 'Enrollment.' },
      { fieldId: 'competencia', title: 'Period', type: 'date' as const, required: true, description: 'Period.' },
    ],
    lifecycleStates: [],
    transitions: [],
  };
  const good = normalizeNs5OntologyEntity({
    ...base,
    uniqueKeys: [['matriculaId', 'competencia']],
  }, 'Mensalidade');
  const passing = validateNs5OntologyEntity(plan, good, ctx({
    moduleName: 'mensalidadesAcademia',
    journeys: [journey('garcom', [step('gerar', 'act', 'Mensalidade')])],
    requireJourneyCitation: false,
  }));
  assert.equal(passing.ok, true, passing.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));

  const missing = normalizeNs5OntologyEntity({ ...base, uniqueKeys: [['matriculaId', 'ghost']] }, 'Mensalidade');
  const missingGate = validateNs5OntologyEntity(plan, missing, ctx({
    moduleName: 'mensalidadesAcademia',
    journeys: [journey('garcom', [step('gerar', 'act', 'Mensalidade')])],
  }));
  assert.ok(missingGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_UNIQUE_KEYS_UNKNOWN'));

  const withId = normalizeNs5OntologyEntity({ ...base, uniqueKeys: [['id', 'competencia']] }, 'Mensalidade');
  const idGate = validateNs5OntologyEntity(plan, withId, ctx({
    moduleName: 'mensalidadesAcademia',
    journeys: [journey('garcom', [step('gerar', 'act', 'Mensalidade')])],
  }));
  assert.ok(idGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_UNIQUE_KEYS_ID_FIELD'));

  const uniqueId = normalizeNs5OntologyEntity({
    ...base,
    fields: [{ ...idField('Mensalidade', 'id'), unique: true }, base.fields[1], base.fields[2]],
  }, 'Mensalidade');
  const uniqueIdGate = validateNs5OntologyEntity(plan, uniqueId, ctx({
    moduleName: 'mensalidadesAcademia',
    journeys: [journey('garcom', [step('gerar', 'act', 'Mensalidade')])],
  }));
  assert.ok(uniqueIdGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_UNIQUE_ID_FIELD'));
});

void test('constraints match the field type; enum values need titles; details need a catalog type', () => {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Gym fees',
    entities: [corePlan('Plano', 'id', 'name')],
    relationships: [],
  }, 'mensalidadesAcademia');
  const good = normalizeNs5OntologyEntity({
    entityId: 'Plano',
    fields: [
      idField('Plano', 'id'),
      { fieldId: 'name', title: 'Name', type: 'string', required: true, description: 'Name.' },
      {
        fieldId: 'diaVencimento',
        title: 'Due day',
        type: 'integer',
        required: true,
        constraints: { min: 1, max: 31 },
        description: 'Day of month.',
      },
      {
        fieldId: 'status',
        title: 'Status',
        type: 'string',
        required: true,
        enum: [{ value: 'active', title: 'Ativo' }, { value: 'cancelled', title: 'Cancelado' }],
        description: 'Status.',
      },
    ],
    details: { acessoPermitido: { type: 'boolean', description: 'Whether the student may enter.' } },
    lifecycleStates: [
      { state: 'active', reachedBy: 'actor' },
      { state: 'cancelled', reachedBy: 'actor' },
    ],
    transitions: [{ transitionId: 'cancel', from: ['active'], to: 'cancelled', by: ['caixa'], description: 'Cancel.' }],
  }, 'Plano');
  const passing = validateNs5OntologyEntity(plan, good, ctx({
    moduleName: 'mensalidadesAcademia',
    journeys: [journey('caixa', [step('criar', 'act', 'Plano')])],
  }));
  assert.equal(passing.ok, true, passing.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));

  const policy = normalizeNs5OntologyEntity({
    ...good,
    fields: good.fields.map(field => field.fieldId === 'diaVencimento'
      ? { ...field, constraints: { maxLength: 2 } }
      : field),
  }, 'Plano');
  const policyGate = validateNs5OntologyEntity(plan, policy, ctx({
    moduleName: 'mensalidadesAcademia',
    journeys: [journey('caixa', [step('criar', 'act', 'Plano')])],
  }));
  assert.ok(policyGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_CONSTRAINTS'));

  const untyped = normalizeNs5OntologyEntity({
    ...good,
    details: [{ name: 'acessoPermitido', description: 'Whether the student may enter.' }],
  }, 'Plano');
  const untypedGate = validateNs5OntologyEntity(plan, untyped, ctx({
    moduleName: 'mensalidadesAcademia',
    journeys: [journey('caixa', [step('criar', 'act', 'Plano')])],
  }));
  assert.ok(untypedGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_DETAILS_TYPE'));
});

void test('relationship without description fails', () => {
  const plan: Ns5OntologyPlanDraft = {
    moduleName: 'comandaRestaurante5',
    businessDomain: 'Restaurant orders',
    entities: [mdmPlan('Mesa', 'Location', 'none', 'id'), corePlan('Comanda', 'id', 'numero')],
    relationships: [{
      relationshipId: 'comandaMesa',
      fromEntity: 'Comanda',
      toEntity: 'Mesa',
      type: 'manyToOne',
      required: true,
      description: '',
      persistence: { mode: 'crossStoreReference' },
    }],
  };
  const gate = validateNs5OntologyPlan(plan, ctx({ requireJourneyCitation: false }));
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_RELATIONSHIP_DESCRIPTION'));
});

void test('ownerStepId keeps ontology fan-out on the ontology30 hook and ignores the done-anchor', () => {
  assert.equal(ownerStepId('ontology30-entities-0'), 'ontology30');
  assert.equal(ownerStepId('ontology30-bindings-repair-1'), 'ontology30');
  assert.equal(ownerStepId('ontology30-finalize-0'), 'ontology30');
  assert.equal(ownerStepId('ontology30-done'), '');
  assert.equal(ns5OntologyEntitySelector('entity:Customer'), 'Customer');
  assert.equal(typeof NS5_STEP_HOOKS.ontology30?.beforePromptStep, 'function');
  assert.equal(typeof hooksFor('', 'entity:Mesa')?.beforePromptStep, 'function');
});

function planoPlan(maintenance?: 'crud'): Ns5OntologyPlanEntity {
  return {
    ...mdmPlan('Plano', 'Service', 'none', 'id'),
    ...(maintenance ? { maintenance } : {}),
  };
}

function planoDetail(): Ns5OntologyEntityDraft {
  return {
    entityId: 'Plano',
    fields: [
      { fieldId: 'periodicidade', title: 'Period', type: 'string', required: true, description: 'Billing period.' },
      { fieldId: 'valor', title: 'Price', type: 'money', required: true, description: 'Price.' },
      { fieldId: 'diaVencimento', title: 'Due day', type: 'integer', required: true, description: 'Due day.' },
    ],
    lifecycleStates: [],
    transitions: [],
  };
}

function gatePlano(
  maintenance: 'crud' | undefined,
  journeys: ReturnType<typeof journey>[],
  detail: Ns5OntologyEntityDraft = planoDetail(),
) {
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Gym fees',
    entities: [planoPlan(maintenance)],
    relationships: [],
  }, 'comandaRestaurante5', journeys);
  return validateNs5OntologyEntity(plan, normalizeNs5OntologyEntity(detail, 'Plano', journeys), ctx({
    moduleName: 'comandaRestaurante5',
    actors: [
      { actorId: 'recepcao', kind: 'internal', origin: 'named', title: 'Reception', description: 'Enrolls.' },
    ],
    journeys,
  }));
}

void test('Plano with namespace and no act fails WITHOUT_WRITER; affects counts as a writer', () => {
  const locate = journey('recepcao', [step('consultarPlanos', 'locate', 'Plano')]);
  const failing = gatePlano(undefined, [locate]);
  assert.equal(failing.ok, false);
  assert.ok(failing.issues.some(issue => issue.code === 'NS5_ONTOLOGY_ENTITY_WITHOUT_WRITER' && /Plano/.test(issue.message)));
  assert.match(failing.issues.find(issue => issue.code === 'NS5_ONTOLOGY_ENTITY_WITHOUT_WRITER')!.message, /maintenance: 'crud'/);
  assert.match(failing.issues.find(issue => issue.code === 'NS5_ONTOLOGY_ENTITY_WITHOUT_WRITER')!.message, /act step/);

  const onlyAffects = journey('recepcao', [{
    ...step('matricular', 'act', 'Matricula'),
    affects: ['Plano'],
  }]);
  const affectsGate = gatePlano(undefined, [onlyAffects]);
  assert.equal(affectsGate.ok, true, affectsGate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(affectsGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_ENTITY_WITHOUT_WRITER'), false);
});

void test('Plano maintenance crud passes; Aluno empty-namespace mdm without act is not a writer defect', () => {
  const locate = journey('recepcao', [step('consultarPlanos', 'locate', 'Plano')]);
  const passing = gatePlano('crud', [locate]);
  assert.equal(passing.ok, true, passing.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));

  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Gym fees',
    entities: [mdmPlan('Aluno', 'Person', 'person', 'id')],
    relationships: [],
  }, 'comandaRestaurante5');
  const aluno = validateNs5OntologyEntity(plan, emptyMdmDetail('Aluno'), ctx({
    moduleName: 'comandaRestaurante5',
    journeys: [locate],
  }));
  assert.equal(aluno.ok, true, aluno.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('normalize drops crud when an act writes the entity or it has lifecycle', () => {
  const withAct = gatePlano('crud', [journey('recepcao', [step('criarPlano', 'act', 'Plano')])]);
  assert.equal(withAct.ok, true, withAct.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(withAct.issues.some(issue => issue.code === 'NS5_ONTOLOGY_CRUD_WITH_ACT'), false);

  const locate = [journey('recepcao', [step('consultarPlanos', 'locate', 'Plano')])];
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Gym fees',
    entities: [planoPlan('crud')],
    relationships: [],
  }, 'comandaRestaurante5', locate);
  assert.equal(plan.entities[0].maintenance, 'crud');
  const withLifecycle = normalizeNs5OntologyEntity({
    ...planoDetail(),
    maintenance: 'crud',
    lifecycleStates: [{ state: 'active', reachedBy: 'actor' }],
    transitions: [{ transitionId: 'activate', from: ['active'], to: 'active', by: ['recepcao'], description: 'Keep.' }],
  }, 'Plano', locate);
  assert.equal(withLifecycle.maintenance, undefined);
  assert.equal(withLifecycle.normalizations?.[0]?.kind, 'dropCrud');
  const lifecycleGate = validateNs5OntologyEntity(plan, withLifecycle, ctx({
    moduleName: 'comandaRestaurante5',
    actors: [{ actorId: 'recepcao', kind: 'internal', origin: 'named', title: 'Reception', description: 'Enrolls.' }],
    journeys: locate,
  }));
  assert.ok(lifecycleGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_ENTITY_WITHOUT_WRITER'));
  assert.equal(lifecycleGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_CRUD_WITH_LIFECYCLE'), false);
});

void test('real ItemCardapio has no crud; an act that affects it is the writer', () => {
  assert.equal(planEntity('comandaRestaurante5', 'ItemCardapio').maintenance, undefined);
  const journeys = loadNs5Journeys('comandaRestaurante5');
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [planEntity('comandaRestaurante5', 'ItemCardapio')],
    relationships: [],
  }, 'comandaRestaurante5', journeys);
  const detail = normalizeNs5OntologyEntity(realDetail('comandaRestaurante5', 'ItemCardapio'), 'ItemCardapio', journeys);
  const gate = validateNs5OntologyEntity(plan, detail, ctx({
    moduleName: 'comandaRestaurante5',
    journeys,
  }));
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('live mensalidadesAcademia plan with crud on every entity: normalize drops five, gate passes', () => {
  const draft = loadNs5FixtureJson<unknown>('steps/ontology30/fixtures', 'mensalidadesAcademia-plan-draft.json');
  const journeys = [
    journey('recepcao', [step('registrarAluno', 'act', 'Aluno')]),
    journey('recepcao', [step('registrarPlano', 'act', 'Plano')]),
    journey('recepcao', [step('matricular', 'act', 'Matricula')]),
    journey('recepcao', [step('gerarMensalidades', 'act', 'Mensalidade')]),
    journey('recepcao', [step('registrarPagamento', 'act', 'Pagamento')]),
    journey('gerencia', [
      step('verPainel', 'locate', 'PainelGerencial'),
      step('lerPainel', 'inspect', 'PainelGerencial'),
    ]),
  ];
  const plan = normalizeNs5OntologyPlan(draft, 'mensalidadesAcademia', journeys);
  assert.equal(plan.normalizations?.length, 5);
  assert.deepEqual(
    (plan.normalizations || []).map(item => item.entityId).sort(),
    ['Aluno', 'Matricula', 'Mensalidade', 'Pagamento', 'Plano'],
  );
  assert.ok((plan.normalizations || []).every(item => item.kind === 'dropCrud'));
  for (const id of ['Aluno', 'Plano', 'Matricula', 'Mensalidade', 'Pagamento']) {
    assert.equal(plan.entities.find(entity => entity.entityId === id)?.maintenance, undefined);
  }
  assert.equal(plan.entities.find(entity => entity.entityId === 'PainelGerencial')?.maintenance, 'crud');
  const gate = validateNs5OntologyPlan(plan, ctx({ moduleName: 'mensalidadesAcademia', journeys }));
  assert.equal(gate.ok, true, gate.issues.filter(issue => issue.severity === 'error').map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});
