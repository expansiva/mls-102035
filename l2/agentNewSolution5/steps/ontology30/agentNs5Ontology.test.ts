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
import type { Ns5ModuleActor } from '/_102035_/l2/solution/types.js';
import {
  buildNs5OntologyBindingsHumanPrompt,
  buildNs5OntologyPlanHumanPrompt,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/agentNs5Ontology.js';
import {
  assembleNs5Ontology,
  buildNs5OntologyBindingsTool,
  buildNs5OntologyEntityTool,
  buildNs5OntologyPlanTool,
  normalizeNs5OntologyBindings,
  normalizeNs5OntologyEntity,
  normalizeNs5OntologyPlan,
  type Ns5OntologyBindingsDraft,
  type Ns5OntologyEntityDraft,
  type Ns5OntologyPlanDraft,
  type Ns5OntologyPlanEntity,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';
import {
  validateNs5OntologyBindings,
  validateNs5OntologyEntity,
  validateNs5OntologyPlan,
  type Ns5OntologyGateContext,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

interface EntityFixture {
  derivedFrom: string;
  plan: Ns5OntologyPlanEntity;
  detail: Ns5OntologyEntityDraft;
}

function loadSchema(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(HERE, '../../schemas', name), 'utf8')) as Record<string, unknown>;
}

function loadEntityFixture(name: string): EntityFixture {
  return JSON.parse(readFileSync(path.join(HERE, 'fixtures', name), 'utf8')) as EntityFixture;
}

function loadBindingsFixture(): { derivedFrom: string; bindings: Ns5OntologyBindingsDraft['bindings'] } {
  return JSON.parse(readFileSync(path.join(HERE, 'fixtures/comandaRestaurante2-bindings.json'), 'utf8')) as {
    derivedFrom: string;
    bindings: Ns5OntologyBindingsDraft['bindings'];
  };
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

void test('derived Customer is mdm Person with empty fields and passes the gate', () => {
  const fixture = loadEntityFixture('Customer.json');
  assert.match(fixture.derivedFrom, /Customer\.defs\.ts$/);
  assert.equal(fixture.plan.kind, 'mdm');
  assert.equal(fixture.plan.mdmSubtype, 'Person');
  assert.deepEqual(fixture.detail.fields, []);
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Service orders',
    entities: [fixture.plan],
    relationships: [],
  }, 'ordenServicio2');
  const detail = normalizeNs5OntologyEntity(fixture.detail, 'Customer');
  const gate = validateNs5OntologyEntity(plan, detail, ctx({
    moduleName: 'ordenServicio2',
    journeys: [{ business: { ...FECHAR.business, steps: [{ ...FECHAR.business.steps[0], entity: 'Customer' }] } }],
  }));
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('derived ItemCardapio keeps namespace fields and level-1 displayField', () => {
  const fixture = loadEntityFixture('ItemCardapio.json');
  assert.match(fixture.derivedFrom, /ItemCardapio\.defs\.ts$/);
  assert.equal(fixture.plan.mdmSubtype, 'Product');
  assert.equal(fixture.detail.fields.some(field => field.fieldId === 'precoVigente'), true);
  assert.equal(fixture.detail.fields.some(field => field.fieldId === 'itemCardapioId'), false);
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [fixture.plan],
    relationships: [],
  }, 'comandaRestaurante3');
  const gate = validateNs5OntologyEntity(plan, normalizeNs5OntologyEntity(fixture.detail, 'ItemCardapio'), ctx({
    moduleName: 'comandaRestaurante3',
    journeys: [{ business: { ...FECHAR.business, steps: [{ ...FECHAR.business.steps[0], entity: 'ItemCardapio' }] } }],
  }));
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('derived Comanda keeps details.total and fecharComanda by caixa', () => {
  const fixture = loadEntityFixture('Comanda.json');
  assert.match(fixture.derivedFrom, /Comanda\.defs\.ts$/);
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [fixture.plan],
    relationships: [],
  }, 'comandaRestaurante5');
  const detail = normalizeNs5OntologyEntity(fixture.detail, 'Comanda');
  assert.equal(detail.details?.total.includes('itens'), true);
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
  const fixture = loadEntityFixture('Customer.json');
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Service orders',
    entities: [fixture.plan],
    relationships: [],
  }, 'ordenServicio2');
  const detail = normalizeNs5OntologyEntity({
    ...fixture.detail,
    fields: [idField('Customer', 'customerId')],
  }, 'Customer');
  const gate = validateNs5OntologyEntity(plan, detail, ctx({ moduleName: 'ordenServicio2' }));
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
  const fixture = loadEntityFixture('Customer.json');
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Service orders',
    entities: [fixture.plan],
    relationships: [],
  }, 'ordenServicio2');
  const detail = normalizeNs5OntologyEntity({
    ...fixture.detail,
    lifecycleStates: [{ state: 'active', reachedBy: 'actor' }],
  }, 'Customer');
  const gate = validateNs5OntologyEntity(plan, detail, ctx({ moduleName: 'ordenServicio2' }));
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_MDM_LIFECYCLE'));
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
      { fieldId: 'status', title: 'Status', type: 'string', required: true, enum: ['open', 'closed'], description: 'Status.' },
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
  const fixture = loadEntityFixture('Comanda.json');
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [fixture.plan],
    relationships: [],
  }, 'comandaRestaurante5');
  const detail = normalizeNs5OntologyEntity({
    ...fixture.detail,
    lifecycleStates: [
      ...fixture.detail.lifecycleStates,
      { state: 'cancelled', reachedBy: 'actor' },
    ],
    fields: fixture.detail.fields.map(field => field.fieldId === 'status'
      ? { ...field, enum: ['open', 'closed', 'cancelled'] }
      : field),
  }, 'Comanda');
  const gate = validateNs5OntologyEntity(plan, detail, ctx());
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_STATE_UNREACHABLE'));
});

void test('time state with an arriving transition fails', () => {
  const fixture = loadEntityFixture('Comanda.json');
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [fixture.plan],
    relationships: [],
  }, 'comandaRestaurante5');
  const detail = normalizeNs5OntologyEntity({
    ...fixture.detail,
    lifecycleStates: [
      { state: 'open', reachedBy: 'actor' },
      { state: 'overdue', reachedBy: 'time' },
    ],
    fields: fixture.detail.fields.map(field => field.fieldId === 'status'
      ? { ...field, enum: ['open', 'overdue'] }
      : field),
    transitions: [{ transitionId: 'expire', from: ['open'], to: 'overdue', by: 'time', description: 'Expires.' }],
  }, 'Comanda');
  const gate = validateNs5OntologyEntity(plan, detail, ctx());
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_TIME_TRANSITION'));
});

void test('transition by unknown actor fails', () => {
  const fixture = loadEntityFixture('Comanda.json');
  const plan = normalizeNs5OntologyPlan({
    businessDomain: 'Restaurant orders',
    entities: [fixture.plan],
    relationships: [],
  }, 'comandaRestaurante5');
  const detail = normalizeNs5OntologyEntity({
    ...fixture.detail,
    transitions: [{ transitionId: 'fecharComanda', from: ['open'], to: 'closed', by: ['ghost'], description: 'Close.' }],
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
  const comanda = loadEntityFixture('Comanda.json');
  const extra = corePlan('TipPolicy', 'tipPolicyId', 'tipPolicyId');
  const plan: Ns5OntologyPlanDraft = {
    moduleName: 'comandaRestaurante5',
    businessDomain: 'Restaurant orders',
    entities: [mesa, comanda.plan, extra],
    relationships: [],
  };
  const mesaGate = validateNs5OntologyEntity(plan, emptyMdmDetail('Mesa'), ctx());
  assert.equal(mesaGate.ok, true, mesaGate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(mesaGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_JOURNEY_ENTITY' || issue.code === 'NS5_ONTOLOGY_ENTITY_UNCITED'), false);
  assert.deepEqual(mesaGate.uncitedEntities, []);

  const comandaGate = validateNs5OntologyEntity(plan, normalizeNs5OntologyEntity(comanda.detail, 'Comanda'), ctx());
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
  const fixture = loadBindingsFixture();
  assert.match(fixture.derivedFrom, /comandaRestaurante2-e4-mdm-empty-fields/);
  const comanda = loadEntityFixture('Comanda.json');
  const cardapio = loadEntityFixture('ItemCardapio.json');
  const mesa = mdmPlan('Mesa', 'Location', 'none', 'mesaId');
  const itemComanda = corePlan('ItemComanda', 'itemComandaId', 'itemComandaId');
  const pagamento = corePlan('Pagamento', 'pagamentoId', 'pagamentoId');
  const plan: Ns5OntologyPlanDraft = {
    moduleName: 'comandaRestaurante5',
    businessDomain: 'Restaurant orders',
    entities: [
      { ...mesa, storage: { ...mesa.storage, mdmType: 'comandaRestaurante5.Mesa' } },
      { ...cardapio.plan, storage: { ...cardapio.plan.storage, mdmType: 'comandaRestaurante5.ItemCardapio' } },
      comanda.plan,
      itemComanda,
      pagamento,
    ],
    relationships: [
      { relationshipId: 'comandaBelongsToMesa', fromEntity: 'Comanda', toEntity: 'Mesa', type: 'manyToOne', required: true, persistence: { mode: 'crossStoreReference' } },
      { relationshipId: 'itemComandaBelongsToComanda', fromEntity: 'ItemComanda', toEntity: 'Comanda', type: 'manyToOne', required: true, persistence: { mode: 'moduleReference' } },
      { relationshipId: 'itemComandaReferencesItemCardapio', fromEntity: 'ItemComanda', toEntity: 'ItemCardapio', type: 'manyToOne', required: true, persistence: { mode: 'crossStoreReference' } },
      { relationshipId: 'pagamentoClosesComanda', fromEntity: 'Pagamento', toEntity: 'Comanda', type: 'manyToOne', required: true, persistence: { mode: 'moduleReference' } },
    ],
  };
  const details: Ns5OntologyEntityDraft[] = [
    emptyMdmDetail('Mesa'),
    normalizeNs5OntologyEntity(cardapio.detail, 'ItemCardapio'),
    normalizeNs5OntologyEntity(comanda.detail, 'Comanda'),
    {
      entityId: 'ItemComanda',
      fields: [
        idField('ItemComanda', 'itemComandaId'),
        { fieldId: 'comandaId', title: 'Comanda', type: 'uuid', required: true, description: 'Parent order.' },
        { fieldId: 'itemCardapioId', title: 'Menu item', type: 'uuid', required: true, description: 'Selected product.' },
      ],
      lifecycleStates: [],
      transitions: [],
    },
    {
      entityId: 'Pagamento',
      fields: [
        idField('Pagamento', 'pagamentoId'),
        { fieldId: 'comandaId', title: 'Comanda', type: 'uuid', required: true, description: 'Closed order.' },
      ],
      lifecycleStates: [],
      transitions: [],
    },
  ];
  const journeys = [{
    business: {
      ...FECHAR.business,
      steps: [
        ...FECHAR.business.steps,
        { stepId: 'lancar', kind: 'act' as const, entity: 'ItemComanda', title: 'Add', description: 'Added.' },
        { stepId: 'pagar', kind: 'act' as const, entity: 'Pagamento', title: 'Pay', description: 'Paid.' },
        { stepId: 'cardapio', kind: 'locate' as const, entity: 'ItemCardapio', title: 'Pick', description: 'Picked.' },
      ],
    },
  }];
  const good = validateNs5OntologyBindings(plan, details, normalizeNs5OntologyBindings(fixture), ctx({ journeys }));
  assert.equal(good.ok, true, good.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));

  const emptyTo = normalizeNs5OntologyBindings({
    bindings: fixture.bindings.map(binding => binding.relationshipId === 'comandaBelongsToMesa'
      ? { ...binding, realization: { ...binding.realization, to: { entityId: 'Mesa', fieldIds: [] } } }
      : binding),
  });
  const emptyGate = validateNs5OntologyBindings(plan, details, emptyTo, ctx({ journeys }));
  assert.equal(emptyGate.ok, false);
  assert.ok(emptyGate.issues.some(issue => issue.code === 'NS5_ONTOLOGY_RELATIONSHIP_FIELDS_REQUIRED'));

  const wrongId = normalizeNs5OntologyBindings({
    bindings: fixture.bindings.map(binding => binding.relationshipId === 'comandaBelongsToMesa'
      ? { ...binding, realization: { ...binding.realization, to: { entityId: 'Mesa', fieldIds: ['name'] } } }
      : binding),
  });
  const wrongGate = validateNs5OntologyBindings(plan, details, wrongId, ctx({ journeys }));
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

void test('normalize accepts details as an array and as a record', () => {
  const fromArray = normalizeNs5OntologyEntity({
    entityId: 'Comanda',
    fields: [],
    details: [{ name: 'total', description: 'Sum of active items.' }],
    lifecycleStates: [],
    transitions: [],
  }, 'Comanda');
  assert.deepEqual(fromArray.details, { total: 'Sum of active items.' });
  const fromRecord = normalizeNs5OntologyEntity({
    entityId: 'Comanda',
    fields: [],
    details: { total: 'Sum of active items.' },
    lifecycleStates: [],
    transitions: [],
  }, 'Comanda');
  assert.deepEqual(fromRecord.details, { total: 'Sum of active items.' });
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

void test('ownerStepId keeps ontology fan-out on the ontology30 hook and ignores the done-anchor', () => {
  assert.equal(ownerStepId('ontology30-entities-0'), 'ontology30');
  assert.equal(ownerStepId('ontology30-bindings-repair-1'), 'ontology30');
  assert.equal(ownerStepId('ontology30-finalize-0'), 'ontology30');
  assert.equal(ownerStepId('ontology30-done'), '');
  assert.equal(ns5OntologyEntitySelector('entity:Customer'), 'Customer');
  assert.equal(typeof NS5_STEP_HOOKS.ontology30?.beforePromptStep, 'function');
  assert.equal(typeof hooksFor('', 'entity:Mesa')?.beforePromptStep, 'function');
});
