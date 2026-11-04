/// <mls fileReference="_102035_/l2/ensaio/studioCompileHost.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { compileWithDeclaration } from '/_102020_/l2/agentMaterializeL2/helpers/studioDeclaration.js';
import { studioCompileAvailable } from '/_102035_/l2/solution/studioCompile.js';
import { installMlsStub } from '../../../test/mlsStub.js';
import { createStudioModel, installStudioCompile } from './studioCompileHost.js';

function file(content: string) {
  const entry = {
    project: 102047, level: 2, folder: 'tarefas/web/desktop/page11', shortName: 'rehearsalProbe', extension: '.ts', content, status: 'unchanged', versionRef: '1',
    getContent: () => Promise.resolve(entry.content), getValueInfo: () => Promise.resolve({ content: entry.content }),
    getOrCreateModel: () => createStudioModel(entry),
  };
  const key = `${entry.project}|${entry.level}|${entry.folder}|${entry.shortName}|${entry.extension}`;
  (globalThis as unknown as { mls: { stor: { files: Record<string, unknown>; getKeyToFile: unknown } } }).mls.stor.getKeyToFile = (info: typeof entry) => `${info.project}|${info.level}|${info.folder}|${info.shortName}|${info.extension}`;
  (globalThis as unknown as { mls: { stor: { files: Record<string, unknown> } } }).mls.stor.files[key] = entry;
  return entry;
}

void test('the rehearsal compiler is the typescript of mls-base: a clean source gives its declaration, a wrong one gives the diagnostic', async () => {
  installMlsStub({ actualProject: 102047 });
  installStudioCompile();
  assert.equal(studioCompileAvailable(), true);
  const good = file('export const answer: number = 42;\n');
  const clean = await compileWithDeclaration(good, good.content);
  assert.deepEqual(clean.errors, []);
  assert.match(clean.declaration ?? '', /answer: number/u);
  const bad = file("export const answer: number = 'forty two';\n");
  const broken = await compileWithDeclaration(bad, bad.content);
  assert.ok(broken.errors.some(error => /TS2322/u.test(error)), broken.errors.join('\n'));
  assert.equal(broken.declaration, null);
});
