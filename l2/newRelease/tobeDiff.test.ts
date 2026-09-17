/// <mls fileReference="_102035_/l2/newRelease/tobeDiff.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { sha256Tobe, tobeDiff } from './tobeDiff.js';

test('diff compares identified array members by id and ignores reorder', () => {
  const asis = { rules: [{ ruleId: 'first', description: 'A' }, { ruleId: 'second', description: 'B' }] };
  const tobe = { rules: [{ ruleId: 'second', description: 'Changed' }, { ruleId: 'first', description: 'A' }] };
  assert.deepEqual(tobeDiff(asis, tobe), [{
    jsonPath: '$.rules[ruleId=second].description',
    before: 'B',
    after: 'Changed',
  }]);
});

test('diff represents identifier replacement as remove and add, never rename', () => {
  const diff = tobeDiff({ journeyId: 'oldJourney' }, { journeyId: 'newJourney' });
  assert.equal(diff.length, 2);
  assert.ok(diff.some(item => item.jsonPath.includes('removed=oldJourney') && item.before === 'oldJourney'));
  assert.ok(diff.some(item => item.jsonPath.includes('added=newJourney') && item.after === 'newJourney'));
  assert.equal(diff.some(item => item.jsonPath === '$.journeyId'), false);
});

test('stable sha ignores object key ordering', async () => {
  assert.equal(await sha256Tobe({ b: 2, a: 1 }), await sha256Tobe({ a: 1, b: 2 }));
});

