/// <mls fileReference="_102035_/l2/newRelease/helpers/changeOrigins.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { clearChangeOrigins, originForChange, readChangeOrigins, recordManualChangeOrigin, type ChangeOrigin } from './changeOrigins.js';

test('last exact operation owns a diff; older operations are counted', () => {
  const operations: ChangeOrigin[] = [
    { source: 'prompt', at: '2026-11-02T10:00:00.000Z', request: 'primeiro', taskId: 'task1', changes: [{ file: 'rules.defs.ts', jsonPath: '$.rules.a' }] },
    { source: 'manual', at: '2026-11-02T10:01:00.000Z', changes: [{ file: 'rules.defs.ts', jsonPath: '$.rules.a' }] },
  ];
  assert.deepEqual(originForChange(operations, 'rules.defs.ts', '$.rules.a'), { operation: operations[1], earlier: 1 });
  assert.equal(originForChange(operations, 'rules.defs.ts', '$.rules.b'), null);
  assert.equal(originForChange(operations, 'access.defs.ts', '$.rules.a'), null);
});

test('manual operation stores exact diff paths, then partial and full discard clear them', async () => {
  const previous = (globalThis as any).mls;
  const files: Record<string, any> = {};
  const contents = new Map<string, string>();
  const key = (info: any) => `${info.project}:${info.level}:${info.folder}:${info.shortName}${info.extension}`;
  (globalThis as any).mls = { stor: {
    files,
    getKeyToFile: key,
    addOrUpdateFile: async (info: any) => {
      const file = { ...info, status: 'new', getValueInfo: async () => ({ content: contents.get(key(info)) || '' }), getContent: async () => contents.get(key(info)) || '' };
      files[key(info)] = file;
      return file;
    },
    localStor: {
      setContent: async (file: any, value: { content: string }) => { contents.set(key(file), value.content); },
      deleteFile: async (file: any) => { delete files[key(file)]; contents.delete(key(file)); },
    },
  } };
  try {
    await recordManualChangeOrigin(102047, 'fixture', 'rules.defs.ts', { rules: { a: 'old', b: 'same' } }, { rules: { a: 'new', b: 'same' } }, new Date('2026-11-02T10:00:00.000Z'));
    await recordManualChangeOrigin(102047, 'fixture', 'access.defs.ts', { grants: [] }, { grants: [{ grantId: 'g1' }] }, new Date('2026-11-02T10:01:00.000Z'));
    const operations = await readChangeOrigins(102047, 'fixture');
    assert.deepEqual(operations.map(row => row.changes), [
      [{ file: 'rules.defs.ts', jsonPath: '$.rules.a' }],
      [{ file: 'access.defs.ts', jsonPath: '$.grants[grantId=g1]' }],
    ]);
    await clearChangeOrigins(102047, 'fixture', 'rules.defs.ts');
    assert.deepEqual((await readChangeOrigins(102047, 'fixture')).map(row => row.changes[0].file), ['access.defs.ts']);
    await clearChangeOrigins(102047, 'fixture');
    assert.deepEqual(await readChangeOrigins(102047, 'fixture'), []);
  } finally { (globalThis as any).mls = previous; }
});
