/// <mls fileReference="_102035_/l2/solution/candidate/tobeDiff.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { sha256Tobe, tobeDiff } from '/_102035_/l2/solution/candidate/tobeDiff.js';

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

test('connections compare by connection and operation pair despite insertion and reorder', () => {
  const first = { connectionId: 'system', operationId: 'read', description: 'Same' };
  const second = { connectionId: 'system', operationId: 'write', description: 'Old' };
  const added = { connectionId: 'other', operationId: 'read', description: 'Added' };
  assert.deepEqual(tobeDiff({ connections: [first, second] }, { connections: [added, { ...second, description: 'New' }, first] }), [
    { jsonPath: '$.connections[connectionId=system][operationId=write].description', before: 'Old', after: 'New' },
    { jsonPath: '$.connections[connectionId=other][operationId=read]', after: added },
  ]);
  assert.ok(tobeDiff({ other: [first, second] }, { other: [second, first] })
    .some(entry => entry.jsonPath === '$.other[0].operationId[removed=read]'));
});

test('stable sha ignores object key ordering', async () => {
  assert.equal(await sha256Tobe({ b: 2, a: 1 }), await sha256Tobe({ a: 1, b: 2 }));
});

