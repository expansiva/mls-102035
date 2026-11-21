/// <mls fileReference="_102035_/l2/solution/lifecycleInitial.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import test from 'node:test';
import { ns5InitialState, ns5InitialStateIssues } from '/_102035_/l2/solution/lifecycleInitial.js';

const draft = {
  entityId: 'AgentDraft',
  lifecycleStates: [{ state: 'preparing' }, { state: 'ready' }, { state: 'refused' }, { state: 'activated' }, { state: 'discarded' }],
  transitions: [{ to: 'activated' }, { to: 'discarded' }],
};
const simple = {
  entityId: 'Tarefa',
  lifecycleStates: [{ state: 'aFazer' }, { state: 'feita' }],
  transitions: [{ to: 'feita' }],
};

test('the only state no transition enters is the initial state, derived', () => {
  assert.deepEqual(ns5InitialState(simple), { state: 'aFazer', source: 'derived', withoutEntry: ['aFazer'] });
  assert.deepEqual(ns5InitialStateIssues([simple]), []);
});

test('several states with no entering transition and no initialState is ambiguous and an error naming them', () => {
  const initial = ns5InitialState(draft);
  assert.equal(initial.source, 'ambiguous');
  assert.equal(initial.state, undefined);
  assert.deepEqual(initial.withoutEntry, ['preparing', 'ready', 'refused']);
  const issues = ns5InitialStateIssues([draft]);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].path, 'ontology.AgentDraft.initialState');
  assert.match(issues[0].message, /preparing, ready, refused/);
});

test('an explicit initialState wins and clears the ambiguity', () => {
  const chosen = { ...draft, initialState: 'preparing' };
  assert.deepEqual(ns5InitialState(chosen).state, 'preparing');
  assert.equal(ns5InitialState(chosen).source, 'explicit');
  assert.deepEqual(ns5InitialStateIssues([chosen]), []);
});

test('an initialState that is no state of the entity is an error', () => {
  const issues = ns5InitialStateIssues([{ ...draft, initialState: 'waiting' }]);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /waiting.*not one of its lifecycleStates/);
});

test('an entity with no lifecycle, or whose states form a cycle, is not charged', () => {
  assert.deepEqual(ns5InitialState({ entityId: 'Tool' }), { source: 'none', withoutEntry: [] });
  const cycle = { entityId: 'Tool', lifecycleStates: [{ state: 'available' }, { state: 'removed' }], transitions: [{ to: 'removed' }, { to: 'available' }] };
  assert.equal(ns5InitialState(cycle).source, 'none');
  assert.deepEqual(ns5InitialStateIssues([cycle]), []);
});
