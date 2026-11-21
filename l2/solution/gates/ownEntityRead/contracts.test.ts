/// <mls fileReference="_102035_/l2/solution/gates/ownEntityRead/contracts.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import test from 'node:test';
import { checkOwnEntityReads, type OwnEntityReadConnectionRow, type OwnEntityReadEntityRow, type OwnEntityReadStepRow } from '/_102035_/l2/solution/gates/ownEntityRead/contracts.js';

const entities: OwnEntityReadEntityRow[] = [
  { entityId: 'Agent', kind: 'external' },
  { entityId: 'AgentDraft', kind: 'entity' },
  { entityId: 'RepositoryEntry', kind: 'entity', writer: 'inbound' },
  { entityId: 'OrganizationUser', kind: 'role' },
];
const step = (over: Partial<OwnEntityReadStepRow>): OwnEntityReadStepRow => ({ journeyId: 'j', stepId: 's', kind: 'inspect', entityId: 'AgentDraft', ...over });
const call = (over: Partial<OwnEntityReadConnectionRow>): OwnEntityReadConnectionRow => ({
  connectionId: 'cm', operationId: 'listAgents', direction: 'call', effect: 'list', usedBy: ['j.s'], ...over,
});

test('a step that reads a table of the module and is in the usedBy of a reading call is one issue on that row', () => {
  const issues = checkOwnEntityReads([step({})], entities, [call({})]);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].path, 'integration.connections[0].usedBy');
  assert.match(issues[0].message, /j\.s reads AgentDraft.*cm\.listAgents.*Remove j\.s from that usedBy/);
});

test('reading an external entity, or acting on the table (create), is not charged', () => {
  assert.deepEqual(checkOwnEntityReads([step({ entityId: 'Agent' })], entities, [call({})]), []);
  assert.deepEqual(checkOwnEntityReads([step({ kind: 'act' })], entities, [call({ effect: 'create' })]), []);
  assert.deepEqual(checkOwnEntityReads([step({ kind: 'act' })], entities, [call({})]), []);
});

test('a projection of what the outside tells the module (writer inbound) is read through the call by design', () => {
  assert.deepEqual(checkOwnEntityReads([step({ entityId: 'RepositoryEntry' })], entities, [call({})]), []);
});

test('an MDM role and a serve row are not charged', () => {
  assert.deepEqual(checkOwnEntityReads([step({ entityId: 'OrganizationUser' })], entities, [call({})]), []);
  assert.deepEqual(checkOwnEntityReads([step({})], entities, [call({ direction: 'serve' })]), []);
});
