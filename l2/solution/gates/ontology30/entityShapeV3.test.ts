/// <mls fileReference="_102035_/l2/solution/gates/ontology30/entityShapeV3.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { entityShapeIssuesV3 } from '/_102035_/l2/solution/gates/ontology30/entityShapeV3.js';
import { scanNs4ClassicJsonObject } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';

const timeSeries = {
  schemaVersion: '3.0', entityId: 'botReading', kind: 'timeSeries',
  storage: { target: 'postgres', table: 'bot_reading', kind: 'timeSeries', retentionDays: 30, timeField: 'writtenAt' },
  record: { fields: { botId: { type: 'text' }, writtenAt: { type: 'datetime' } } },
  uniqueKeys: [['botId', 'writtenAt']],
};

test('a correct timeSeries entity has no deviation', () => {
  assert.deepEqual(entityShapeIssuesV3(timeSeries), []);
});

test('uniqueKeys inside storage is refused with its path', () => {
  const entity = { ...timeSeries, storage: { ...timeSeries.storage, uniqueKeys: [['botId', 'writtenAt']] } };
  assert.deepEqual(entityShapeIssuesV3(entity).map(item => item.path), ['storage.uniqueKeys']);
});

test('a unique key element with fields/when is refused', () => {
  const entity = { ...timeSeries, uniqueKeys: [{ fields: ['botId'], when: 'x' }] };
  assert.deepEqual(entityShapeIssuesV3(entity).map(item => item.path), ['uniqueKeys[0]']);
});

test('unknown keys are refused at entity, field, transition and relationship levels', () => {
  const entity = {
    ...timeSeries, extra: 1,
    record: { fields: { botId: { type: 'text', bogus: true } } },
    transitions: [{ transitionId: 't', from: 'a', to: 'b', nope: 1 }],
    relationships: { owner: { entity: 'x', cardinality: 'one', zzz: 1 } },
  };
  const paths = entityShapeIssuesV3(entity).map(item => item.path).sort();
  assert.ok(paths.includes('extra'));
  assert.ok(paths.includes('record.fields.botId.bogus'));
  assert.ok(paths.includes('transitions[0].nope'));
  assert.ok(paths.includes('relationships.owner.zzz'));
});

test('never throws on non-objects', () => {
  for (const value of [null, undefined, 3, 'x', []]) assert.deepEqual(entityShapeIssuesV3(value), []);
});

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) walk(path, out);
    else if (/[\\/]ontology[\\/][^\\/]+\.defs\.ts$/u.test(path) && !path.endsWith('index.defs.ts')) out.push(path);
  }
  return out;
}

test('the entities of the 102035 fixtures have no deviation', () => {
  const root = new URL('../../fixtures/', import.meta.url).pathname;
  const files = walk(root);
  assert.ok(files.length > 0);
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const bounds = scanNs4ClassicJsonObject(src);
    if (!bounds) continue;
    const value = JSON.parse(src.slice(bounds.start, bounds.end));
    assert.deepEqual(entityShapeIssuesV3(value), [], file);
  }
});
