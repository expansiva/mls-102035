/// <mls fileReference="_102035_/l2/solution/testing/promptHeaders.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const L2 = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const MODEL_TYPE = /^[A-Za-z0-9]+$/;

function walkPromptMd(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkPromptMd(full, out);
    else if (name === 'prompt.md') out.push(full);
  }
  return out;
}

void test('prompt.md modelType on line 1 is a single token', () => {
  const offenders: string[] = [];
  for (const file of walkPromptMd(L2)) {
    const rel = relative(L2, file).split('\\').join('/');
    const line1 = readFileSync(file, 'utf8').split('\n')[0] ?? '';
    const marker = 'modelType:';
    const at = line1.indexOf(marker);
    if (at < 0) continue;
    const close = line1.indexOf('-->', at);
    const value = (close < 0 ? line1.slice(at + marker.length) : line1.slice(at + marker.length, close)).trim();
    if (!MODEL_TYPE.test(value)) offenders.push(`${rel}: ${value}`);
  }
  assert.deepEqual(offenders, [], offenders.join('\n'));
});
