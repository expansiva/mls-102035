/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/organizationI18nGuard.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const files = [
  fileURLToPath(new URL('./organizationTypes.ts', import.meta.url)),
  fileURLToPath(new URL('./level1Catalog.ts', import.meta.url)),
  fileURLToPath(new URL('./registryGate.ts', import.meta.url)),
  fileURLToPath(new URL('./organizationRegistry.ts', import.meta.url)),
  fileURLToPath(new URL('./organizationContext.ts', import.meta.url)),
  fileURLToPath(new URL('./ns4Fs.ts', import.meta.url)),
  fileURLToPath(new URL('../types.ts', import.meta.url)),
  fileURLToPath(new URL('./ns4TextPaths.ts', import.meta.url)),
  fileURLToPath(new URL('./ns4TextPaths.test.ts', import.meta.url)),
  fileURLToPath(new URL('../steps/e1/agentNs4E1.ts', import.meta.url)),
  fileURLToPath(new URL('../steps/e4/agentNs4E4.ts', import.meta.url)),
  fileURLToPath(new URL('../steps/e4b/contracts.ts', import.meta.url)),
  fileURLToPath(new URL('../steps/e4b/gate.ts', import.meta.url)),
  fileURLToPath(new URL('../steps/e4b/agentNs4E4B.ts', import.meta.url)),
  fileURLToPath(new URL('../steps/e4b/prompt.md', import.meta.url)),
  fileURLToPath(new URL('../steps/e4/prompt.md', import.meta.url)),
  fileURLToPath(new URL('../steps/e4/promptEntity.md', import.meta.url)),
  fileURLToPath(new URL('../steps/e6/agentNs4E6.ts', import.meta.url)),
  fileURLToPath(new URL('../steps/e6/prompt.md', import.meta.url)),
  fileURLToPath(new URL('../steps/e6/contracts.ts', import.meta.url)),
  fileURLToPath(new URL('../steps/e10/agentNs4E10.ts', import.meta.url)),
  fileURLToPath(new URL('../../../l4/organization/readme.md', import.meta.url)),
];

test('n03 touched files stay English in comments and identifiers', () => {
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /portuguese\s*\?/, file);
    for (const line of source.split('\n')) {
      const trimmed = line.trim();
      const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('<!--');
      if (!isComment) continue;
      assert.doesNotMatch(line, /[À-ÿ]/, `${file}: ${trimmed}`);
    }
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/`(?:\\.|[^`])*`/g, '')
      .replace(/'(?:\\.|[^'\\])*'/g, '')
      .replace(/"(?:\\.|[^"\\])*"/g, '');
    assert.doesNotMatch(stripped, /[À-ÿ]/, file);
  }
});
