/// <mls fileReference="_102035_/l2/agentNewSolution5/promptMarkers.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STEPS_ROOT = path.join(HERE, 'steps');

function promptFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...promptFiles(full));
    else if (/^prompt.*\.md$/i.test(entry.name)) out.push(full);
  }
  return out;
}

void test('every step prompt.md declares modelType and x-tool-strict', () => {
  const files = promptFiles(STEPS_ROOT);
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const rel = path.relative(HERE, file);
    assert.match(source, /<!--\s*modelType:\s*\w+\s*-->/, `${rel} missing modelType`);
    assert.match(source, /<!--\s*x-tool-strict:\s*true\s*-->/, `${rel} missing x-tool-strict`);
  }
});
