/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/journeys20/agentNs5Journeys.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/agentNewSolution/helpers/ns4WorkerTools.js';
import { ownerStepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import { loadNs5FixtureJson, NS5_REAL_MODULES } from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import type { Ns5ModuleActor } from '/_102035_/l2/solution/types.js';
import { buildNs5JourneysHumanPrompt } from '/_102035_/l2/agentNewSolution5/steps/journeys20/agentNs5Journeys.js';
import {
  buildNs5JourneyIndex,
  buildNs5JourneysTool,
  countNs5DecideSteps,
  hashNs5Journey,
  normalizeNs5JourneysPayload,
  type Ns5JourneyDraft,
} from '/_102035_/l2/agentNewSolution5/steps/journeys20/contracts.js';
import {
  applyNs5InferredActorDrop,
  formatNs5JourneyGate,
  ns5DropInferredActorDecisionId,
  NS5_JOURNEY_DROP_CHOICE,
  validateNs5Journeys,
} from '/_102035_/l2/agentNewSolution5/steps/journeys20/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function loadSchema(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(HERE, '../../schemas/journey.schema.json'), 'utf8'),
  ) as Record<string, unknown>;
}

const ACTORS: Ns5ModuleActor[] = [
  { actorId: 'garcom', kind: 'internal', origin: 'named', title: 'Waiter', description: 'Opens the table order.' },
  { actorId: 'caixa', kind: 'internal', origin: 'named', title: 'Cashier', description: 'Closes the order.' },
];

const CLIENT: Ns5ModuleActor = {
  actorId: 'cliente',
  kind: 'external',
  origin: 'named',
  title: 'Customer',
  description: 'Approves the budget on the portal.',
};

function actStep(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    stepId: 'closeOrder',
    kind: 'act',
    entity: 'Comanda',
    title: 'Close the order.',
    description: 'The order is closed.',
    ...overrides,
  };
}

function validJourney(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const businessOverrides = (overrides.business || {}) as Record<string, unknown>;
  return {
    journeyId: 'fecharComanda',
    business: {
      actorRef: 'caixa',
      title: 'Close the order',
      goal: 'Take payment and free the table.',
      entry: { mode: 'contextOrLookup' },
      steps: [
        {
          stepId: 'locateComanda',
          kind: 'locate',
          entity: 'Comanda',
          title: 'Find the open order.',
          description: 'The open order is identified.',
        },
        actStep({ affects: ['Mesa'] }),
      ],
      outcome: {
        statement: 'The order is closed and the table is free.',
        evidence: ['Payment is recorded.', 'The table is free.'],
      },
      ...businessOverrides,
    },
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== 'business')),
  };
}

function drafts(payload: unknown): Ns5JourneyDraft[] {
  return normalizeNs5JourneysPayload(payload).journeys;
}

void test('journeys20 tool schema is provider-clean', () => {
  const tool = buildNs5JourneysTool(loadSchema(), createNs4FlexibleWorkerTool);
  assert.equal(tool.function.name, 'submitNs5Journeys');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
});

void test('real journeys20 drafts of both runs pass the gate', () => {
  const actorsByModule: Record<string, Ns5ModuleActor[]> = {
    comandaRestaurante5: ACTORS,
    ordenServicio5: [
      { actorId: 'recepcionista', kind: 'internal', origin: 'named', title: 'Reception', description: 'Receives devices.' },
      { actorId: 'tecnico', kind: 'internal', origin: 'named', title: 'Technician', description: 'Diagnoses and repairs.' },
      CLIENT,
    ],
  };
  for (const moduleName of NS5_REAL_MODULES) {
    const draft = loadNs5FixtureJson<{ journeys: unknown[] }>('steps/journeys20/fixtures', `${moduleName}-draft.json`);
    const journeys = drafts(draft);
    const gate = validateNs5Journeys(journeys, { actors: actorsByModule[moduleName], moduleName });
    assert.equal(gate.ok, true, `${moduleName}: ${gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n')}`);
    assert.equal(journeys.every(journey => !('useRules' in journey.business)), true, moduleName);
  }
  const comanda = drafts(loadNs5FixtureJson('steps/journeys20/fixtures', 'comandaRestaurante5-draft.json'));
  assert.equal(countNs5DecideSteps(comanda), 0);
  const orden = drafts(loadNs5FixtureJson('steps/journeys20/fixtures', 'ordenServicio5-draft.json'));
  assert.equal(countNs5DecideSteps(orden), 1);
  const decide = orden.flatMap(journey => journey.business.steps).find(step => step.kind === 'decide');
  assert.equal(decide?.stepId, 'decidirRespuestaPresupuesto');
});

void test('normalize + gate accept a valid payload without decide', () => {
  const journeys = drafts({ schemaVersion: '2026-09-10-ns5-journey-v1', journeys: [validJourney()] });
  const gate = validateNs5Journeys(journeys, { actors: ACTORS });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(countNs5DecideSteps(journeys), 0);
});

void test('gate accepts a locate then inspect consultation journey', () => {
  const journeys = drafts({
    journeys: [{
      journeyId: 'consultarMisOrdenes',
      business: {
        actorRef: 'cliente',
        title: 'Consult my orders',
        goal: 'See the status of own orders.',
        entry: { mode: 'coldStart' },
        steps: [
          { stepId: 'localizarMisOrdenes', kind: 'locate', entity: 'OrdenServicio', title: 'Find.', description: 'Own orders are listed.' },
          { stepId: 'consultarDetalleDeMiOrden', kind: 'inspect', entity: 'OrdenServicio', title: 'Read.', description: 'Allowed facts are visible.' },
        ],
        outcome: { statement: 'The customer knows the allowed facts.', evidence: ['Status is visible.'] },
      },
    }],
  });
  const gate = validateNs5Journeys(journeys, { actors: [...ACTORS, CLIENT] });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(journeys[0].business.steps.some(step => step.kind === 'act' || step.kind === 'decide'), false);
});

void test('gate rejects affects that repeat the step entity', () => {
  const journeys = drafts({
    journeys: [validJourney({
      business: {
        actorRef: 'caixa',
        title: 'Close the order',
        goal: 'Take payment.',
        entry: { mode: 'coldStart' },
        steps: [actStep({ affects: ['Comanda'] })],
        outcome: { statement: 'Closed.', evidence: ['Closed.'] },
      },
    })],
  });
  const gate = validateNs5Journeys(journeys, { actors: ACTORS });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_JOURNEY_STEP_AFFECTS_ENTITY'));
});

void test('gate rejects an unknown actorRef', () => {
  const journeys = drafts({
    journeys: [validJourney({
      business: {
        actorRef: 'ghost',
        title: 'Close the order',
        goal: 'Take payment.',
        entry: { mode: 'coldStart' },
        steps: [actStep()],
        outcome: { statement: 'Closed.', evidence: ['Closed.'] },
      },
    })],
  });
  const gate = validateNs5Journeys(journeys, { actors: ACTORS });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_JOURNEY_ACTOR_UNKNOWN'));
});

void test('gate rejects twin journeys for the same actor and operations', () => {
  const twin = validJourney({ journeyId: 'fecharComandaAgain' });
  const journeys = drafts({ journeys: [validJourney(), twin] });
  const gate = validateNs5Journeys(journeys, { actors: ACTORS });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_JOURNEY_TWIN'));
});

void test('inferred external actor without an exclusive step is dropped', () => {
  const inferred: Ns5ModuleActor = {
    actorId: 'cliente',
    kind: 'external',
    origin: 'inferred',
    title: 'Customer',
    description: 'Brings the ticket.',
  };
  const journeys = drafts({
    journeys: [
      validJourney(),
      validJourney({
        journeyId: 'pagarComanda',
        business: {
          actorRef: 'cliente',
          title: 'Pay',
          goal: 'Pay the order.',
          entry: { mode: 'coldStart' },
          steps: [actStep({ stepId: 'closeOrder', entity: 'Comanda', affects: ['Mesa'] })],
          outcome: { statement: 'Paid.', evidence: ['Paid.'] },
        },
      }),
    ],
  });
  const actors = [...ACTORS, inferred];
  const before = validateNs5Journeys(journeys, { actors });
  assert.equal(before.ok, true, before.issues.map(issue => issue.code).join(', '));
  const dropped = applyNs5InferredActorDrop(journeys, actors);
  assert.deepEqual(dropped.droppedActorIds, ['cliente']);
  assert.equal(dropped.journeys.some(journey => journey.business.actorRef === 'cliente'), false);
  assert.equal(dropped.actors.some(actor => actor.actorId === 'cliente'), false);
  assert.equal(dropped.systemDecisions[0]?.decisionId, ns5DropInferredActorDecisionId('cliente'));
  assert.equal(dropped.systemDecisions[0]?.chosen, NS5_JOURNEY_DROP_CHOICE);
  const after = validateNs5Journeys(dropped.journeys, { actors: dropped.actors });
  assert.equal(after.ok, true, after.issues.map(issue => issue.code).join(', '));
});

void test('kind system stays even with no exclusive step', () => {
  const system: Ns5ModuleActor = {
    actorId: 'originModule',
    kind: 'system',
    origin: 'inferred',
    title: 'Origin module',
    description: 'Receives a charge.',
  };
  const journeys = drafts({ journeys: [validJourney()] });
  const dropped = applyNs5InferredActorDrop(journeys, [...ACTORS, system]);
  assert.equal(dropped.droppedActorIds.length, 0);
  assert.equal(dropped.actors.some(actor => actor.actorId === 'originModule'), true);
  assert.equal(dropped.systemDecisions.length, 0);
});

void test('named external with exclusive decide is kept', () => {
  const orden = loadNs5FixtureJson<{ journeys: unknown[] }>('steps/journeys20/fixtures', 'ordenServicio5-draft.json');
  const clienteJourney = drafts(orden).find(journey => journey.business.actorRef === 'cliente');
  assert.ok(clienteJourney);
  const journeys = drafts({
    journeys: [
      validJourney({
        journeyId: 'abrirOrden',
        business: {
          actorRef: 'caixa',
          title: 'Open',
          goal: 'Open an order.',
          entry: { mode: 'coldStart' },
          steps: [actStep({ entity: 'ServiceOrder', stepId: 'createOrder' })],
          outcome: { statement: 'Opened.', evidence: ['Opened.'] },
        },
      }),
      clienteJourney,
    ],
  });
  const dropped = applyNs5InferredActorDrop(journeys, [...ACTORS, CLIENT]);
  assert.equal(dropped.droppedActorIds.length, 0);
  assert.equal(dropped.journeys.some(journey => journey.business.actorRef === 'cliente'), true);
});

void test('normalize drops handoffTo except on handoff; mixed payload keeps the receiver', () => {
  const mixed = drafts({
    journeys: [validJourney({
      business: {
        actorRef: 'garcom',
        title: 'Hand off',
        goal: 'Pass the order to the cashier.',
        entry: { mode: 'coldStart' },
        steps: [
          actStep({ stepId: 'launchItem', entity: 'ItemComanda', handoffTo: 'garcom' }),
          {
            stepId: 'passToCashier',
            kind: 'handoff',
            entity: 'Comanda',
            title: 'Pass to cashier.',
            description: 'The cashier receives the open order.',
            handoffTo: 'caixa',
          },
        ],
        outcome: { statement: 'Handed off.', evidence: ['Cashier has the order.'] },
      },
    })],
  });
  assert.equal('handoffTo' in mixed[0].business.steps[0], false);
  assert.equal(mixed[0].business.steps[1].handoffTo, 'caixa');
  assert.equal(validateNs5Journeys(mixed, { actors: ACTORS }).ok, true);

  const selfLabel = drafts({
    journeys: [validJourney({
      business: {
        actorRef: 'caixa',
        title: 'Close',
        goal: 'Close.',
        entry: { mode: 'coldStart' },
        steps: [actStep({ handoffTo: 'caixa' })],
        outcome: { statement: 'Closed.', evidence: ['Closed.'] },
      },
    })],
  });
  assert.equal('handoffTo' in selfLabel[0].business.steps[0], false);
  assert.equal(validateNs5Journeys(selfLabel, { actors: ACTORS }).ok, true);
});

void test('live self-label payload (4 journeys, 17/17 non-handoff handoffTo) passes after normalize', () => {
  const fixture = JSON.parse(
    readFileSync(path.join(HERE, 'fixtures', 'comandaRestaurante5-handoffTo-self-label.json'), 'utf8'),
  ) as { derivedFrom: string; journeys: Array<{ business: { actorRef: string; steps: Array<{ kind: string; handoffTo?: string }> } }> };
  assert.match(fixture.derivedFrom, /journeys20-draft\.json$/);
  const labeled = fixture.journeys.flatMap(journey =>
    journey.business.steps.filter(step => step.kind !== 'handoff' && step.handoffTo === journey.business.actorRef),
  );
  assert.equal(fixture.journeys.length, 4);
  assert.equal(labeled.length, 17);
  const journeys = drafts(fixture);
  const leftover = journeys.flatMap(journey =>
    journey.business.steps.filter(step => step.kind !== 'handoff' && step.handoffTo),
  );
  assert.equal(leftover.length, 0);
  const gate = validateNs5Journeys(journeys, { actors: ACTORS });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(gate.issues.some(issue => issue.code === 'NS5_JOURNEY_HANDOFF_TO_KIND'), false);
});

void test('gate still requires a valid handoffTo on a handoff step', () => {
  const missing = drafts({
    journeys: [validJourney({
      business: {
        actorRef: 'garcom',
        title: 'Hand off',
        goal: 'Pass the order.',
        entry: { mode: 'coldStart' },
        steps: [
          actStep({ stepId: 'launchItem', entity: 'ItemComanda' }),
          {
            stepId: 'passToCashier',
            kind: 'handoff',
            entity: 'Comanda',
            title: 'Pass to cashier.',
            description: 'The cashier receives the open order.',
          },
        ],
        outcome: { statement: 'Handed off.', evidence: ['Cashier has the order.'] },
      },
    })],
  });
  const missingGate = validateNs5Journeys(missing, { actors: ACTORS });
  assert.ok(missingGate.issues.some(issue => issue.code === 'NS5_JOURNEY_HANDOFF_TO'));

  const unknown = drafts({
    journeys: [validJourney({
      business: {
        actorRef: 'garcom',
        title: 'Hand off',
        goal: 'Pass the order.',
        entry: { mode: 'coldStart' },
        steps: [
          actStep({ stepId: 'launchItem', entity: 'ItemComanda' }),
          {
            stepId: 'passToCashier',
            kind: 'handoff',
            entity: 'Comanda',
            title: 'Pass to cashier.',
            description: 'The cashier receives the open order.',
            handoffTo: 'ghost',
          },
        ],
        outcome: { statement: 'Handed off.', evidence: ['Cashier has the order.'] },
      },
    })],
  });
  const unknownGate = validateNs5Journeys(unknown, { actors: ACTORS });
  assert.ok(unknownGate.issues.some(issue => issue.code === 'NS5_JOURNEY_HANDOFF_TO_UNKNOWN'));
});

void test('gate still rejects handoffTo on a non-handoff step when normalize is skipped', () => {
  const journeys = drafts({
    journeys: [validJourney({
      business: {
        actorRef: 'caixa',
        title: 'Close',
        goal: 'Close.',
        entry: { mode: 'coldStart' },
        steps: [actStep()],
        outcome: { statement: 'Closed.', evidence: ['Closed.'] },
      },
    })],
  });
  journeys[0].business.steps[0].handoffTo = 'caixa';
  const gate = validateNs5Journeys(journeys, { actors: ACTORS });
  const handoffKind = gate.issues.find(issue => issue.code === 'NS5_JOURNEY_HANDOFF_TO_KIND');
  assert.ok(handoffKind);
  assert.match(handoffKind.message, /closeOrder/);
  assert.match(handoffKind.message, /remove the field handoffTo/);
  const feedback = formatNs5JourneyGate(gate.issues);
  assert.match(feedback, /NS5_JOURNEY_HANDOFF_TO_KIND/);
  assert.match(feedback, /steps\[0\]\.handoffTo/);
  const repairHuman = buildNs5JourneysHumanPrompt({
    sourcePrompt: 'close the order',
    userLanguage: 'en',
    actors: ACTORS,
    gateFeedback: feedback,
  });
  assert.match(repairHuman, /Deterministic repair required/);
  assert.match(repairHuman, /remove the field handoffTo/);
});

void test('journeys20 prompt omits handoffTo except on handoff', () => {
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /Omit `handoffTo` on every other `kind`/);
  assert.match(prompt, /placeholders — use only ids that exist in the module/);
  assert.match(prompt, /"kind": "act"/);
  assert.match(prompt, /"kind": "handoff"/);
  assert.match(prompt, /only locates and inspects/);
  assert.doesNotMatch(prompt, /Every journey has at least one `act` or `decide`/);
  assert.doesNotMatch(prompt, /comanda|garcom|waiter|stock|quantity/i);
  assert.doesNotMatch(prompt, /invite|verify e-mail|login index/i);
});

void test('act creates and transitionRef are exclusive; non-act drops them', () => {
  const both = drafts({
    journeys: [validJourney({
      business: {
        actorRef: 'caixa',
        title: 'Close',
        goal: 'Close.',
        entry: { mode: 'coldStart' },
        steps: [actStep({ creates: true, transitionRef: 'closeOrder' })],
        outcome: { statement: 'Closed.', evidence: ['Closed.'] },
      },
    })],
  });
  assert.equal(both[0].business.steps[0].creates, true);
  assert.equal(both[0].business.steps[0].transitionRef, 'closeOrder');
  const bothGate = validateNs5Journeys(both, { actors: ACTORS });
  assert.ok(bothGate.issues.some(issue => issue.code === 'NS5_JOURNEY_ACT_INTENT_BOTH'));

  const locate = drafts({
    journeys: [validJourney({
      business: {
        actorRef: 'caixa',
        title: 'Close',
        goal: 'Close.',
        entry: { mode: 'coldStart' },
        steps: [{
          stepId: 'findOrder',
          kind: 'locate',
          entity: 'Comanda',
          title: 'Find.',
          description: 'Found.',
          creates: true,
          transitionRef: 'closeOrder',
        }],
        outcome: { statement: 'Found.', evidence: ['Found.'] },
      },
    })],
  });
  assert.equal(locate[0].business.steps[0].creates, undefined);
  assert.equal(locate[0].business.steps[0].transitionRef, undefined);
  locate[0].business.steps[0].creates = true;
  const kindGate = validateNs5Journeys(locate, { actors: ACTORS });
  assert.ok(kindGate.issues.some(issue => issue.code === 'NS5_JOURNEY_ACT_INTENT_KIND'));

  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /creates: true/);
  assert.match(prompt, /transitionRef/);
  assert.match(prompt, /at most one of `creates` or `transitionRef`/);
});

void test('hashNs5Journey is stable across object key order', async () => {
  const left = await hashNs5Journey(drafts({ journeys: [validJourney()] })[0]);
  const right = await hashNs5Journey(drafts({ journeys: [validJourney()] })[0]);
  assert.equal(left.businessHash, right.businessHash);
  assert.match(left.businessHash, /^sha256:[a-f0-9]{64}$/);
  const index = buildNs5JourneyIndex('comandaRestaurante5', [left], []);
  assert.equal(index.journeys[0]?.journeyId, 'fecharComanda');
  assert.equal(index.systemDecisions.length, 0);
});

void test('ownerStepId maps journeys20 repair planIds', () => {
  assert.equal(ownerStepId('journeys20'), 'journeys20');
  assert.equal(ownerStepId('journeys20-repair-1'), 'journeys20');
  assert.equal(ownerStepId('journeys20-done'), '');
});

void test('persistArtifacts reconciles journey defs against the index', () => {
  const source = readFileSync(path.join(HERE, 'agentNs5Journeys.ts'), 'utf8');
  const persist = source.slice(source.indexOf('async function persistArtifacts'));
  assert.match(persist, /reconcileModuleDefs\(\s*moduleName,\s*'journeys'/);
  assert.match(persist, /removedOrphans/);
});

void test('human prompt carries the source request and module actors', () => {
  const human = buildNs5JourneysHumanPrompt({
    sourcePrompt: 'modulo comandaRestaurante, portugues. perfis: garcom e caixa.',
    userLanguage: 'pt',
    actors: ACTORS,
  });
  assert.match(human, /Source request/);
  assert.match(human, /garcom \(internal, named\)/);
  assert.match(human, /caixa \(internal, named\)/);
});
