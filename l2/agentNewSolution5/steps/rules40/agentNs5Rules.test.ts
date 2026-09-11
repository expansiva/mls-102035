/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/rules40/agentNs5Rules.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/agentNewSolution/helpers/ns4WorkerTools.js';
import { ownerStepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import type { Ns5JourneyArtifact, Ns5OntologyEntityArtifact, Ns5Rule } from '/_102035_/l2/solution/types.js';
import { buildNs5RulesHumanPrompt } from '/_102035_/l2/agentNewSolution5/steps/rules40/agentNs5Rules.js';
import {
  buildNs5RulesArtifact,
  buildNs5RulesTool,
  collectNs5RulesRefCatalog,
  normalizeNs5RulesPayload,
  type Ns5RulesEntityView,
} from '/_102035_/l2/agentNewSolution5/steps/rules40/contracts.js';
import {
  formatNs5RulesGate,
  validateNs5Rules,
} from '/_102035_/l2/agentNewSolution5/steps/rules40/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

interface DerivedRulesFixture {
  derivedFrom: string;
  rules: Ns5Rule[];
}

function loadSchema(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(HERE, '../../schemas/rules.schema.json'), 'utf8'),
  ) as Record<string, unknown>;
}

function loadDerived(name: string): DerivedRulesFixture {
  return JSON.parse(readFileSync(path.join(HERE, 'fixtures', name), 'utf8')) as DerivedRulesFixture;
}

function entity(
  entityId: string,
  fields: string[],
  extras: {
    details?: Record<string, string>;
    idField?: string;
    transitions?: Array<{ transitionId: string; by: string[] | 'system' | 'time' }>;
  } = {},
): Ns5RulesEntityView {
  return {
    entityId,
    fields: fields.map(fieldId => ({ fieldId })),
    ...(extras.details ? { details: extras.details } : {}),
    ...(extras.idField ? { storage: { idField: extras.idField } } : {}),
    transitions: extras.transitions || [],
  };
}

function journeys(...ids: string[]): Array<{ journeyId: string }> {
  return ids.map(journeyId => ({ journeyId }));
}

const COMANDA_ENTITIES: Ns5RulesEntityView[] = [
  entity('Comanda', ['comandaId', 'comandaNumber', 'status', 'discountAmount', 'paymentMethod'], {
    details: { total: 'Sum of active items at close.' },
    idField: 'comandaId',
    transitions: [{ transitionId: 'fecharComanda', by: ['caixa'] }],
  }),
  entity('ItemComanda', ['itemComandaId', 'comandaId', 'status'], {
    idField: 'itemComandaId',
    transitions: [{ transitionId: 'cancelarItem', by: ['garcom'] }],
  }),
  entity('ItemCardapio', ['precoVigente'], { idField: 'itemCardapioId' }),
  entity('Mesa', [], { idField: 'mesaId' }),
];

const COMANDA_JOURNEYS = journeys(
  'abrirComanda',
  'lancarItemNaComanda',
  'cancelarItemDaComanda',
  'fecharComanda',
);

const ORDEN_ENTITIES: Ns5RulesEntityView[] = [
  entity('ServiceOrder', ['serviceOrderId', 'status'], {
    idField: 'serviceOrderId',
    transitions: [
      { transitionId: 'publishBudget', by: ['tecnico'] },
      { transitionId: 'approveBudget', by: ['cliente'] },
      { transitionId: 'rejectBudget', by: ['cliente'] },
      { transitionId: 'markServiceOrderReady', by: ['tecnico'] },
      { transitionId: 'completeServiceOrder', by: ['recepcionista'] },
    ],
  }),
  entity('Customer', [], { idField: 'customerId' }),
  entity('Device', [], { idField: 'deviceId' }),
  entity('Diagnosis', [], { idField: 'diagnosisId' }),
  entity('ServicePart', [], { idField: 'servicePartId' }),
  entity('RepairRecord', [], { idField: 'repairRecordId' }),
];

const ORDEN_JOURNEYS = journeys(
  'abrirOrdenServicio',
  'prepararPresupuestoServicio',
  'consultarYDecidirPresupuesto',
  'repararAparato',
  'entregarAparato',
);

function validRule(overrides: Partial<Ns5Rule> = {}): Record<string, unknown> {
  return {
    ruleId: 'discountWithinTotal',
    title: 'Discount within total',
    description: 'The optional discount cannot exceed the total of active items.',
    appliesTo: {
      entityRefs: ['Comanda'],
      fieldRefs: ['Comanda.details.total'],
      transitionRefs: ['Comanda.fecharComanda'],
      journeyRefs: ['fecharComanda'],
    },
    ...overrides,
  };
}

function drafts(payload: unknown): Ns5Rule[] {
  return normalizeNs5RulesPayload(payload).rules;
}

void test('rules40 tool schema is provider-clean', () => {
  const tool = buildNs5RulesTool(loadSchema(), createNs4FlexibleWorkerTool);
  assert.equal(tool.function.name, 'submitNs5Rules');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
});

void test('derived comandaRestaurante3 fixture keeps seven rules and passes the gate', () => {
  const fixture = loadDerived('comandaRestaurante3-rules.json');
  assert.match(fixture.derivedFrom, /comandaRestaurante3\/rules\/rules\.defs\.ts$/);
  assert.equal(fixture.rules.length, 7);
  const discount = fixture.rules.find(rule => rule.ruleId === 'descontoValidoNoFechamento');
  assert.ok(discount);
  assert.ok(
    discount.appliesTo.fieldRefs.includes('Comanda.details.total')
    || discount.appliesTo.fieldRefs.includes('Comanda.discountAmount'),
  );
  assert.ok(discount.appliesTo.transitionRefs.includes('Comanda.fecharComanda'));
  const rules = drafts({ rules: fixture.rules });
  const gate = validateNs5Rules(rules, { entities: COMANDA_ENTITIES, journeys: COMANDA_JOURNEYS });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('derived ordenServicio2 fixture keeps nine rules and passes the gate', () => {
  const fixture = loadDerived('ordenServicio2-rules.json');
  assert.match(fixture.derivedFrom, /ordenServicio2\/rules\/rules\.defs\.ts$/);
  assert.equal(fixture.rules.length, 9);
  const rules = drafts({ rules: fixture.rules });
  const gate = validateNs5Rules(rules, { entities: ORDEN_ENTITIES, journeys: ORDEN_JOURNEYS });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('normalize + gate accept a valid payload including details.total', () => {
  const rules = drafts({ schemaVersion: '2026-09-10-ns5-rules-v1', rules: [validRule()] });
  const gate = validateNs5Rules(rules, { entities: COMANDA_ENTITIES, journeys: COMANDA_JOURNEYS });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.deepEqual(rules[0].appliesTo.fieldRefs, ['Comanda.details.total']);
});

void test('empty catalog is valid when no time transition exists', () => {
  const rules = drafts({ rules: [] });
  const gate = validateNs5Rules(rules, { entities: COMANDA_ENTITIES, journeys: COMANDA_JOURNEYS });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('gate rejects a rule with no appliesTo reference', () => {
  const rules = drafts({
    rules: [validRule({
      appliesTo: { entityRefs: [], fieldRefs: [], transitionRefs: [], journeyRefs: [] },
    })],
  });
  const gate = validateNs5Rules(rules, { entities: COMANDA_ENTITIES, journeys: COMANDA_JOURNEYS });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_RULES_NO_REF'));
});

void test('gate rejects duplicate lowerCamel rule ids', () => {
  const rules = drafts({
    rules: [validRule(), validRule({ title: 'Again', description: 'Same id again.' })],
  });
  const gate = validateNs5Rules(rules, { entities: COMANDA_ENTITIES, journeys: COMANDA_JOURNEYS });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_RULES_ID_DUPLICATE'));
});

void test('gate rejects unknown entity, field, transition and journey refs', () => {
  const rules = drafts({
    rules: [validRule({
      appliesTo: {
        entityRefs: ['Ghost'],
        fieldRefs: ['Comanda.missingField'],
        transitionRefs: ['Comanda.ghostTransition'],
        journeyRefs: ['ghostJourney'],
      },
    })],
  });
  const gate = validateNs5Rules(rules, { entities: COMANDA_ENTITIES, journeys: COMANDA_JOURNEYS });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_RULES_ENTITY_UNKNOWN'));
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_RULES_FIELD_UNKNOWN'));
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_RULES_TRANSITION_UNKNOWN'));
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_RULES_JOURNEY_UNKNOWN'));
});

void test('details name as Entity.name is accepted (the total case)', () => {
  const rules = drafts({
    rules: [validRule({
      appliesTo: {
        entityRefs: ['Comanda'],
        fieldRefs: ['Comanda.total'],
        transitionRefs: [],
        journeyRefs: [],
      },
    })],
  });
  const gate = validateNs5Rules(rules, { entities: COMANDA_ENTITIES, journeys: COMANDA_JOURNEYS });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('mdm identity outside fields[] is a valid field ref', () => {
  const rules = drafts({
    rules: [validRule({
      ruleId: 'mesaHasIdentity',
      title: 'Table identity',
      description: 'A table is identified by its organization record id.',
      appliesTo: {
        entityRefs: ['Mesa'],
        fieldRefs: ['Mesa.mesaId'],
        transitionRefs: [],
        journeyRefs: ['abrirComanda'],
      },
    })],
  });
  const gate = validateNs5Rules(rules, { entities: COMANDA_ENTITIES, journeys: COMANDA_JOURNEYS });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('time transition without a citing rule fails NS5_RULES_TIME_WITHOUT_RULE', () => {
  const entities = [
    entity('Booking', ['bookingId'], {
      transitions: [{ transitionId: 'expireHold', by: 'time' }],
    }),
  ];
  const empty = validateNs5Rules([], { entities, journeys: journeys('holdSeat') });
  assert.equal(empty.ok, false);
  assert.ok(empty.issues.some(issue => issue.code === 'NS5_RULES_TIME_WITHOUT_RULE'));
  const feedback = formatNs5RulesGate(empty.issues);
  assert.match(feedback, /NS5_RULES_TIME_WITHOUT_RULE/);
  assert.match(feedback, /Booking.expireHold/);

  const covered = drafts({
    rules: [{
      ruleId: 'holdExpires',
      title: 'Hold expires',
      description: 'An unpaid hold expires after the allowed window.',
      appliesTo: {
        entityRefs: ['Booking'],
        fieldRefs: [],
        transitionRefs: ['Booking.expireHold'],
        journeyRefs: [],
      },
    }],
  });
  const gate = validateNs5Rules(covered, { entities, journeys: journeys('holdSeat') });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('normalize maps id to ruleId and drops empty refs', () => {
  const rules = drafts({
    rules: [{
      id: 'discountWithinTotal',
      title: 'Discount within total',
      description: 'The discount cannot exceed the total.',
      appliesTo: {
        entityRefs: ['Comanda', 'Comanda', ''],
        fieldRefs: ['Comanda.details.total'],
        transitionRefs: [],
        journeyRefs: ['fecharComanda'],
      },
    }],
  });
  assert.equal(rules[0].ruleId, 'discountWithinTotal');
  assert.deepEqual(rules[0].appliesTo.entityRefs, ['Comanda']);
});

void test('normalize keeps cited journey ids that contain a single-letter word', () => {
  const rules = drafts({
    rules: [validRule({
      appliesTo: {
        entityRefs: ['ServiceOrder'],
        fieldRefs: [],
        transitionRefs: ['ServiceOrder.approveBudget'],
        journeyRefs: ['consultarYDecidirPresupuesto'],
      },
    })],
  });
  assert.equal(rules[0].appliesTo.journeyRefs[0], 'consultarYDecidirPresupuesto');
});

void test('buildNs5RulesArtifact keeps schemaVersion and rule order', () => {
  const rules = drafts({ rules: [validRule()] });
  const artifact = buildNs5RulesArtifact('comandaRestaurante5', rules);
  assert.equal(artifact.schemaVersion, '2026-09-10-ns5-rules-v1');
  assert.equal(artifact.moduleName, 'comandaRestaurante5');
  assert.equal(artifact.rules[0].ruleId, 'discountWithinTotal');
});

void test('ownerStepId maps rules40 repair planIds', () => {
  assert.equal(ownerStepId('rules40'), 'rules40');
  assert.equal(ownerStepId('rules40-repair-1'), 'rules40');
  assert.equal(ownerStepId('rules40-done'), '');
});

void test('human prompt carries source request, journeys, fields, transitions and details', () => {
  const comanda = {
    schemaVersion: '2026-09-10-ns5-ontology-v1',
    moduleName: 'comandaRestaurante5',
    entityId: 'Comanda',
    title: 'Order',
    description: 'Open table order.',
    kind: 'core',
    party: 'none',
    displayField: 'comandaNumber',
    fields: [
      { fieldId: 'status', title: 'Status', type: 'string', required: true, description: 'Open or closed.' },
      { fieldId: 'discountAmount', title: 'Discount', type: 'money', required: false, description: 'Optional discount.' },
    ],
    details: { total: 'Sum of active items.' },
    lifecycleStates: [
      { state: 'open', reachedBy: 'actor' },
      { state: 'closed', reachedBy: 'actor' },
    ],
    transitions: [{
      transitionId: 'fecharComanda',
      from: ['open'],
      to: 'closed',
      by: ['caixa'],
      description: 'Cashier closes the order.',
    }],
    storage: { target: 'moduleDatabase', scope: 'module', idField: 'comandaId' },
  } as Ns5OntologyEntityArtifact;
  const journey = {
    schemaVersion: '2026-09-10-ns5-journey-v1',
    journeyId: 'fecharComanda',
    business: {
      actorRef: 'caixa',
      title: 'Close the order',
      goal: 'Take payment and free the table.',
      entry: { mode: 'contextOrLookup' },
      steps: [
        { stepId: 'close', kind: 'act', entity: 'Comanda', title: 'Close', description: 'The order is closed.' },
      ],
      outcome: { statement: 'Closed.', evidence: ['Closed.'] },
    },
    businessHash: 'sha256:0',
  } as Ns5JourneyArtifact;
  const human = buildNs5RulesHumanPrompt({
    sourcePrompt: 'modulo comanda, portugues. perfis: garcom e caixa.',
    userLanguage: 'pt',
    journeys: [journey],
    entities: [comanda],
  });
  assert.match(human, /Source request/);
  assert.match(human, /fecharComanda \(caixa\)/);
  assert.match(human, /Comanda\.status/);
  assert.match(human, /Comanda\.details\.total/);
  assert.match(human, /Comanda\.fecharComanda/);
  const catalog = collectNs5RulesRefCatalog([comanda], [journey]);
  assert.ok(catalog.fieldRefs.includes('Comanda.details.total'));
  assert.ok(catalog.transitionRefs.includes('Comanda.fecharComanda'));
});

void test('rules40 prompt has no domain examples and keeps appliesTo by id', () => {
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /submitNs5Rules/);
  assert.match(prompt, /appliesTo/);
  assert.match(prompt, /Do not invent a rule that has no basis/);
  assert.match(prompt, /placeholders — use only ids that exist in the module/);
  assert.doesNotMatch(prompt, /comanda|garcom|waiter|stock|quantity|descuento|presupuesto/i);
});
