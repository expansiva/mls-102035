/// <mls fileReference="_102035_/l2/solution/gates/accessEntity/contracts.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import test from 'node:test';
import { checkEntityGrants, type EntityGrantRow, type EntityGrantStepRow } from '/_102035_/l2/solution/gates/accessEntity/contracts.js';

const grants: EntityGrantRow[] = [
  { grantId: 'memberOwnConduct', actorId: 'member', entityRefs: ['PersonalConduct'] },
  { grantId: 'adminManage', actorId: 'admin', entityRefs: ['Agent', 'PersonalConductChange'] },
];

function step(over: Partial<EntityGrantStepRow>): EntityGrantStepRow {
  return { journeyId: 'changeMyConduct', stepId: 's', kind: 'inspect', actorId: 'member', entityId: 'PersonalConduct', ...over };
}

test('a step on an entity the actor has a grant for passes', () => {
  assert.deepEqual(checkEntityGrants([step({})], grants), []);
});

test('a step on an entity no grant of the actor lists is one issue naming actor, entity and step', () => {
  const issues = checkEntityGrants([
    step({ stepId: 'readChanges', entityId: 'PersonalConductChange' }),
    step({ stepId: 'recordChange', kind: 'act', entityId: 'PersonalConductChange' }),
  ], grants);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].path, 'access.grants');
  assert.match(issues[0].message, /Actor member works on PersonalConductChange in changeMyConduct\.readChanges/);
});

test('a grant of another actor does not cover the entity', () => {
  assert.equal(checkEntityGrants([step({ actorId: 'member', entityId: 'Agent' })], grants).length, 1);
});

test('a decide step only chooses a branch and needs no grant of its own', () => {
  assert.deepEqual(checkEntityGrants([step({ kind: 'decide', entityId: 'Presupuesto' })], grants), []);
});

test('a step without actor or entity is not charged', () => {
  assert.deepEqual(checkEntityGrants([step({ actorId: '' }), step({ entityId: '' })], grants), []);
});
