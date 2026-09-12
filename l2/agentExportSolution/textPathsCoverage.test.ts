/// <mls fileReference="_102035_/l2/agentExportSolution/textPathsCoverage.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseNs4ClassicDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import { textPathsForArtifact, uncoveredNonAscii } from '/_102035_/l2/agentNewSolution/helpers/ns4TextPaths.js';

const FIXTURE = fileURLToPath(new URL('./fixtures/ordenServicioEs/', import.meta.url));

function listDefs(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const relative = prefix ? `${prefix}/${name}` : name;
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) {
      if (name === 'pipeline') continue;
      out.push(...listDefs(abs, relative));
      continue;
    }
    if (name.endsWith('.defs.ts')) out.push(relative);
  }
  return out;
}

test('every non-ASCII string in the es fixture sits under a textPath', () => {
  const files = listDefs(FIXTURE);
  assert.ok(files.includes('module.defs.ts'));
  assert.ok(files.includes('rules/rules.defs.ts'));
  const leaks: string[] = [];
  let hits = 0;
  for (const relative of files) {
    const source = readFileSync(join(FIXTURE, relative), 'utf8');
    const artifact = parseNs4ClassicDefsSource<unknown>(source);
    if (!artifact || typeof artifact !== 'object') continue;
    const paths = textPathsForArtifact(relative, artifact);
    const uncovered = uncoveredNonAscii(artifact, paths);
    hits += 1;
    for (const hit of uncovered) leaks.push(`${relative}:${hit.path} = ${JSON.stringify(hit.value)}`);
  }
  assert.ok(hits >= 8, `expected a complete module fixture, parsed ${hits} artifacts`);
  if (leaks.length) assert.fail(`non-ASCII strings outside textPaths:\n${leaks.join('\n')}`);
});
