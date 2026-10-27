/// <mls fileReference="_102035_/l2/newRelease/widgets/commonModel.test.ts" enhancement="_blank" />
import test from 'node:test';
import assert from 'node:assert/strict';
import { textTree, filterTextTree, hasDraftChanges } from './commonModel.js';

test('text search retains ancestors and combines with artifact filter', () => {
  const roots = [textTree('journeys', { one: { title: 'Open order' }, two: { title: 'Close order' } }), textTree('actors', { title: 'Open access' })];
  const filtered = filterTextTree(roots, 'OPEN', 'journeys');
  assert.equal(filtered.length, 1);
  assert.deepEqual(filtered[0].children.map(child => child.label), ['one']);
  assert.equal(roots[0].children.length, 2);
  assert.deepEqual(filterTextTree(roots, 'missing'), []);
});

test('unsaved state ignores object key order and reversed edits, preserving list order', () => {
  const initial = { title: 'One', nested: { a: true, b: 2 } };
  assert.equal(hasDraftChanges(initial, { nested: { b: 2, a: true }, title: 'One' }), false);
  assert.equal(hasDraftChanges(initial, { ...initial, title: 'Two' }), true);
  assert.equal(hasDraftChanges(['one', 'two'], ['two', 'one']), true);
});

test('save notification waits for persistence and forwards refusal to the editor', async () => {
  const { announceNewReleaseChange, NEW_RELEASE_CHANGED_EVENT } = await import('../editContract.js');
  const target = new EventTarget();
  let complete: ((error?: unknown) => void) | undefined;
  target.addEventListener(NEW_RELEASE_CHANGED_EVENT, event => {
    event.preventDefault();
    complete = (event as CustomEvent<{ complete: (error?: unknown) => void }>).detail.complete;
  });
  let finished = false;
  const save = announceNewReleaseChange(target, { path: 'rules.defs.ts', jsonPath: '$', value: {} });
  void save.then(() => { finished = true; }, () => { finished = true; });
  await Promise.resolve();
  assert.equal(finished, false);
  const refused = assert.rejects(save, /Candidate rejected/);
  complete?.(new Error('Candidate rejected'));
  await refused;
  assert.equal(finished, true);
});
