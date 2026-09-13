/// <mls fileReference="_102035_/l2/newRelease/newReleaseIntegration.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('behavior service opens the module index through the right-side detail contract', () => {
  const source = readFileSync(new URL('../../../mls-102020/l2/aura/services/serviceBehavior.ts', import.meta.url), 'utf8');
  assert.match(source, /PluginDetails/);
  assert.match(source, /new-release--widgets--index-102035/);
  assert.match(source, /shortName:\s*'l2\/newRelease\/widgets\/index'/);
  assert.match(source, /announceNewReleaseContext/);
  assert.match(source, /listEligibleProjects/);
});
