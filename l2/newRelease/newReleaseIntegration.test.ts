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
  assert.match(source, /NEW_RELEASE_TOBE_UPDATED_EVENT/);
  assert.match(source, /_versionValue\s*=\s*this\._module\?\.tobeChanges\s*\?\s*2\s*:\s*1/);
});

test('new release index exposes the shared edit seam and completed functional tabs', () => {
  const index = readFileSync(new URL('./widgets/index.ts', import.meta.url), 'utf8');
  const contract = readFileSync(new URL('./editContract.ts', import.meta.url), 'utf8');

  assert.match(index, /NEW_RELEASE_CHANGED_EVENT/);
  assert.match(index, /saveTobeArtifact/);
  assert.match(index, /discardTobe/);
  assert.match(index, /tabForArtifactPath/);
  assert.match(index, /new-release--widgets--ontology-102035/);
  assert.match(index, /new-release--widgets--journeys-102035/);
  assert.match(index, /new-release--widgets--access-102035/);
  assert.match(index, /new-release--widgets--rules-102035/);
  assert.match(index, /new-release--widgets--workflows-102035/);
  assert.match(index, /new-release--widgets--integration-102035/);
  assert.match(contract, /interface NewReleaseEditableTab/);
  assert.match(contract, /'journeys'/);
  assert.match(contract, /'access'/);
  assert.match(contract, /'workflows'/);
  assert.match(contract, /'integration'/);
});
