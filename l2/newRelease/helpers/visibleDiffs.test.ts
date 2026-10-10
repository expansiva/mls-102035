/// <mls fileReference="_102035_/l2/newRelease/helpers/visibleDiffs.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { tobeDiff } from '/_102035_/l2/solution/candidate/tobeDiff.js';
import type { NewReleaseTobeDiff } from '/_102035_/l2/newRelease/tobe.js';
import { visibleDiffs } from './visibleDiffs.js';

test('description and technical hash edit counts as one journey change without mutating the structural diff', () => {
  const diffs: NewReleaseTobeDiff[] = [{
    path: 'journeys/book.defs.ts',
    entries: tobeDiff({ description: 'Before', businessHash: 'old' }, { description: 'After', businessHash: 'new' }),
  }];
  const original = structuredClone(diffs);
  const visible = visibleDiffs(diffs, 'journeys');
  assert.equal(visible.reduce((total, diff) => total + diff.entries.length, 0), 1);
  assert.equal(visible[0].entries[0].jsonPath, '$.description');
  assert.deepEqual(visibleDiffs(diffs, 'rules'), []);
  assert.deepEqual(diffs, original);
  assert.notEqual(visible[0], diffs[0]);
  assert.notEqual(visible[0].entries, diffs[0].entries);
});

test('review aggregates business changes across tabs and removes hash-only and empty groups', () => {
  const diffs: NewReleaseTobeDiff[] = [
    { path: 'journeys/book.defs.ts', entries: [{ jsonPath: '$.description', before: 'Before', after: 'After' }] },
    { path: 'rules.defs.ts', entries: [{ jsonPath: '$.details.businessHash', before: 'a', after: 'b' }] },
    { path: 'module.defs.ts', entries: [{ jsonPath: '$.businessHash', before: 'old', after: 'new' }] },
    { path: 'access.defs.ts', entries: [] },
  ];
  const original = structuredClone(diffs);
  assert.deepEqual(visibleDiffs(diffs, 'review'), diffs.slice(0, 2));
  assert.deepEqual(visibleDiffs(diffs, 'rules'), [diffs[1]]);
  assert.deepEqual(visibleDiffs(diffs, 'general'), []);
  assert.deepEqual(diffs, original);
});
