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

test('workflow and integration editors preserve the artifact value in every select option', () => {
  for (const file of ['./widgets/workflows.ts', './widgets/integration.ts']) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    const options = [...source.matchAll(/<option\b[^>]*>/g)].map(match => match[0]);
    assert.ok(options.length > 0, `${file} must render select options`);
    assert.deepEqual(options.filter(option => !option.includes('?selected=')), [], `${file} has an option without explicit selected state`);
  }
});

test('module navigation and complex views expose equivalent keyboard and text paths', () => {
  const index = readFileSync(new URL('./widgets/index.ts', import.meta.url), 'utf8');
  const ontology = readFileSync(new URL('./widgets/ontology.ts', import.meta.url), 'utf8');
  const access = readFileSync(new URL('./widgets/access.ts', import.meta.url), 'utf8');
  const journeys = readFileSync(new URL('./widgets/journeys.ts', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('./widgets/index.less', import.meta.url), 'utf8');

  assert.match(index, /role="tablist"/);
  assert.match(index, /role="tab"/);
  assert.match(index, /role="tabpanel"/);
  assert.match(index, /ArrowRight/);
  assert.match(index, /ArrowLeft/);
  assert.match(index, /aria-controls/);
  assert.match(ontology, /ontology\.graphAlternative/);
  assert.match(ontology, /role="img"/);
  assert.match(access, /access\.matrixCell/);
  assert.match(journeys, /journeys\.moveUp/);
  assert.match(journeys, /journeys\.moveDown/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /:focus-visible/);
});

test('save feedback is immediate and stale tobe warnings remain outside individual tabs', () => {
  const index = readFileSync(new URL('./widgets/index.ts', import.meta.url), 'utf8');
  assert.ok(index.indexOf('this.changing = true') < index.indexOf('this.mutationQueue = this.mutationQueue.then'));
  assert.match(index, /nr-index__stale/);
  assert.match(index, /this\.renderTabs\(\)[\s\S]*this\.renderTobeStatus\(\)[\s\S]*this\.renderTabContent\(\)/);
  assert.match(index, /aria-live="polite"/);
});
