/// <mls fileReference="_102035_/l2/newRelease/widgets/journeysModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ns5JourneyArtifact, Ns5JourneyIndexArtifact, Ns5OntologyEntityArtifact } from '../../solution/types.js';
import { journeyStepGroups, validNewJourneyStepId, journeyTransitions, moveJourney, moveJourneyStep, orderedJourneys, syncJourneyIndex } from './journeysModel.js';

const journey = (journeyId: string, actorRef = 'buyer'): Ns5JourneyArtifact => ({
  schemaVersion: '2026-09-10-ns5-journey-v1', journeyId,
  business: { actorRef, title: journeyId, goal: `Goal ${journeyId}`, entry: { mode: 'coldStart' }, steps: [
    { stepId: 'first', kind: 'locate', entity: 'Order', title: 'First', description: 'First result' },
    { stepId: 'second', kind: 'inspect', entity: 'Order', title: 'Second', description: 'Second result' },
  ], outcome: { statement: 'Done', evidence: ['Record'] } }, businessHash: 'sha256:test',
});

const index: Ns5JourneyIndexArtifact = {
  schemaVersion: '2026-09-10-ns5-journey-v1', moduleName: 'orders', systemDecisions: [], journeys: [
    { journeyId: 'one', actorRef: 'buyer', title: 'one' }, { journeyId: 'two', actorRef: 'seller', title: 'two' },
  ],
};

test('journeys follow index order and reordering preserves their identity', () => {
  assert.deepEqual(orderedJourneys(index, [journey('two'), journey('one')]).map(item => item.journeyId), ['one', 'two']);
  assert.deepEqual(moveJourney(index, 'two', 'one').journeys.map(item => item.journeyId), ['two', 'one']);
});

test('editing one journey synchronizes only its catalogue row and can reorder steps', () => {
  const changed = { ...journey('one', 'manager'), business: { ...journey('one', 'manager').business, title: 'Approve order' } };
  const synced = syncJourneyIndex(index, changed);
  assert.deepEqual(synced.journeys[0], { journeyId: 'one', actorRef: 'manager', title: 'Approve order' });
  assert.deepEqual(synced.journeys[1], index.journeys[1]);
  assert.deepEqual(moveJourneyStep(changed, 'second', 'first').business.steps.map(step => step.stepId), ['second', 'first']);
});

test('transition options expose all exits but enable only transitions assigned to the actor', () => {
  const entity = {
    entityId: 'Order', transitions: [
      { transitionId: 'approve', from: ['open'], to: 'approved', by: ['buyer'], description: 'Approve' },
      { transitionId: 'expire', from: ['open'], to: 'expired', by: 'time', description: 'Expire' },
    ],
  } as Ns5OntologyEntityArtifact;
  assert.deepEqual(journeyTransitions([entity], 'Order', 'buyer').map(item => [item.transitionId, item.eligible]), [
    ['approve', true], ['expire', false],
  ]);
});

test('new step identities require lowerCamel and uniqueness without changing the journey', () => {
  const source = journey('one');
  const before = structuredClone(source);
  for (const id of ['', 'First', 'has space', 'has-dash', 'first']) assert.equal(validNewJourneyStepId(source, id), false, id);
  assert.equal(validNewJourneyStepId(source, 'reviewOrder2'), true);
  assert.deepEqual(source, before);
});

test('legacy steps remain sequential and explicit decision branches share one visual level', () => {
  const source = journey('one');
  assert.deepEqual(journeyStepGroups(source).map(group => [group.step.stepId, group.branches.length]), [['first', 0], ['second', 0]]);
  source.business.steps[0].kind = 'decide';
  source.business.steps[1].decisionRef = 'first';
  source.business.steps.push({ ...source.business.steps[1], stepId: 'other' });
  const groups = journeyStepGroups(source);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].branches.map(step => step.stepId), ['second', 'other']);
});
