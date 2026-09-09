/// <mls fileReference="_102035_/l2/agentNewSolution/steps/e2/inferredActor.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { Ns4BusinessActor } from '/_102035_/l2/agentNewSolution/steps/e1/contracts.js';
import { normalizeNs4E2Review } from '/_102035_/l2/agentNewSolution/steps/e2/contracts.js';
import {
  applyNs4E2InferredActorDecisions,
  ns4E2DropInferredActorDecisionId,
  ns4E2DroppedInferredActorIds,
  ns4E2KeepInferredActorDecisionId,
  ns4E2SystemActorKeptDecisionId,
  NS4_E2_DROP_INFERRED_ACTOR_CHOICE,
  NS4_E2_KEEP_INFERRED_ACTOR_CHOICE,
  validateNs4E2Review,
} from '/_102035_/l2/agentNewSolution/steps/e2/gate.js';

const HERE = new URL('.', import.meta.url);

function loadCase(name: string): { actors: Ns4BusinessActor[]; review: ReturnType<typeof normalizeNs4E2Review> } {
  const raw = JSON.parse(readFileSync(new URL(`fixtures/${name}`, HERE), 'utf8'));
  return { actors: raw.actors, review: normalizeNs4E2Review(raw.review) };
}

test('ce07: inferred external client with no steps is dropped', () => {
  const { actors, review } = loadCase('ce07-inferred-client.json');
  const resolved = applyNs4E2InferredActorDecisions(review, actors);
  assert.equal(resolved.journeys.some(journey => journey.business.actorRef === 'client'), false);
  assert.deepEqual(ns4E2DroppedInferredActorIds(resolved), ['client']);
  const decision = resolved.systemDecisions.find(item => item.decisionId === ns4E2DropInferredActorDecisionId('client'));
  assert.ok(decision);
  assert.equal(decision.chosen, NS4_E2_DROP_INFERRED_ACTOR_CHOICE);
  assert.ok(decision.alternatives.includes(NS4_E2_KEEP_INFERRED_ACTOR_CHOICE));
  assert.equal(decision.decidedBy, 'system');
  assert.doesNotMatch(decision.question, /[À-ÿ]/);
  assert.equal(validateNs4E2Review(resolved).ok, true);
});

test('ce05: named external client with exclusive steps stays', () => {
  const { actors, review } = loadCase('ce05-named-external.json');
  const resolved = applyNs4E2InferredActorDecisions(review, actors);
  assert.equal(resolved.journeys.some(journey => journey.business.actorRef === 'client'), true);
  assert.deepEqual(ns4E2DroppedInferredActorIds(resolved), []);
  assert.equal(resolved.systemDecisions.some(item => item.decisionId === ns4E2DropInferredActorDecisionId('client')), false);
  assert.equal(resolved.systemDecisions.some(item => item.decisionId === ns4E2KeepInferredActorDecisionId('client')), false);
});

test('ce08: inferred candidate whose steps the recruiter also performs is dropped', () => {
  const { actors, review } = loadCase('ce08-inferred-candidate.json');
  assert.equal(validateNs4E2Review(review).issues.some(issue => issue.code === 'NS4_E2_TWIN_JOURNEYS'), true);
  const resolved = applyNs4E2InferredActorDecisions(review, actors);
  assert.equal(resolved.journeys.some(journey => journey.business.actorRef === 'candidate'), false);
  assert.equal(resolved.journeys.some(journey => journey.journeyId === 'applyForRole'), false);
  assert.equal(resolved.features.some(feature => feature.featureId === 'apply'), false);
  assert.deepEqual(ns4E2DroppedInferredActorIds(resolved), ['candidate']);
  assert.equal(validateNs4E2Review(resolved).issues.some(issue => issue.code === 'NS4_E2_TWIN_JOURNEYS'), false);
  assert.equal(validateNs4E2Review(resolved).ok, true);
});

test('inferred external with an exclusive step is kept as a registrar', () => {
  const { actors, review } = loadCase('ce08-inferred-candidate.json');
  review.journeys[1].business.steps.push({
    stepId: 'uploadPortfolio', kind: 'act', entity: 'Portfolio',
    title: 'Upload a portfolio.', description: 'The portfolio is stored.', featureRefs: ['apply'],
  });
  const resolved = applyNs4E2InferredActorDecisions(review, actors);
  assert.equal(resolved.journeys.some(journey => journey.business.actorRef === 'candidate'), true);
  assert.deepEqual(ns4E2DroppedInferredActorIds(resolved), []);
  const decision = resolved.systemDecisions.find(item => item.decisionId === ns4E2KeepInferredActorDecisionId('candidate'));
  assert.ok(decision);
  assert.equal(decision.chosen, NS4_E2_KEEP_INFERRED_ACTOR_CHOICE);
});

test('kind system is exempt from drop even with no exclusive step', () => {
  const actors: Ns4BusinessActor[] = [
    { actorId: 'clerk', title: 'Clerk', kind: 'internal', origin: 'named', expectedOutcome: 'Post.' },
    { actorId: 'originModule', title: 'Origin module', kind: 'system', origin: 'inferred', expectedOutcome: 'Receive a charge.' },
  ];
  const review = normalizeNs4E2Review({
    planId: 'e2-review', moduleName: 'receivables', userLanguage: 'en', title: 'Review', reviewRound: 1,
    journeys: [{
      journeyId: 'postCharge', policyDecisions: [],
      business: {
        actorRef: 'clerk', title: 'Post a charge', goal: 'Record a charge.',
        entry: { mode: 'coldStart' },
        steps: [{ stepId: 'createCharge', kind: 'act', entity: 'Charge', title: 'Create.', description: 'The charge exists.', featureRefs: ['post'] }],
        outcome: { statement: 'A charge exists.', evidence: ['The charge is visible.'] },
        useRules: [],
      },
    }],
    features: [{ featureId: 'post', title: 'Post', priority: 'now', journeyStepRefs: ['postCharge.createCharge'] }],
    systemDecisions: [],
  });
  const resolved = applyNs4E2InferredActorDecisions(review, actors);
  assert.equal(resolved.journeys.length, 1);
  const decision = resolved.systemDecisions.find(item => item.decisionId === ns4E2SystemActorKeptDecisionId('originModule'));
  assert.ok(decision);
  assert.equal(decision.chosen, NS4_E2_KEEP_INFERRED_ACTOR_CHOICE);
  assert.equal(resolved.systemDecisions.some(item => item.decisionId === ns4E2DropInferredActorDecisionId('originModule')), false);
});

test('touched inferred-actor files stay English in comments and identifiers', () => {
  const files = [
    fileURLToPath(new URL('./gate.ts', import.meta.url)),
    fileURLToPath(new URL('../e1/contracts.ts', import.meta.url)),
    fileURLToPath(new URL('../e8/modelGate.ts', import.meta.url)),
  ];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /portuguese\s*\?/, file);
    for (const line of source.split('\n')) {
      const trimmed = line.trim();
      const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('<!--');
      if (!isComment) continue;
      assert.doesNotMatch(line, /[À-ÿ]/, `${file}: ${trimmed}`);
    }
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/`(?:\\.|[^`])*`/g, '')
      .replace(/'(?:\\.|[^'\\])*'/g, '')
      .replace(/"(?:\\.|[^"\\])*"/g, '');
    assert.doesNotMatch(stripped, /[À-ÿ]/, file);
  }
});
