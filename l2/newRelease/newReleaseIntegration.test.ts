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
  assert.match(source, /listReadableProjects/);
  assert.match(source, /actualProject > 0 && !this\._eligibleProjects\.includes\(actualProject\)/);
  assert.match(source, /this\._projectEligible \? html`/);
  assert.match(source, /class="nr-service__compatibility" role="status"/);
  assert.doesNotMatch(source, /this\._projects\.length === 0/);
  assert.match(source, /if \(!hadContext && this\._context\(\)\) await this\._openModuleBlueprint\(\)/);
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

test('fine-tuned layout keeps context left and prioritizes editable module settings', () => {
  const service = readFileSync(new URL('../../../mls-102020/l2/aura/services/serviceBehavior.ts', import.meta.url), 'utf8');
  const serviceStyles = readFileSync(new URL('../../../mls-102020/l2/aura/services/serviceBehavior.less', import.meta.url), 'utf8');
  const index = readFileSync(new URL('./widgets/index.ts', import.meta.url), 'utf8');
  const general = readFileSync(new URL('./widgets/general.ts', import.meta.url), 'utf8');

  assert.match(service, /moduleMapDescription/);
  assert.doesNotMatch(service, /module\.sourcePrompt/);
  assert.doesNotMatch(service, /nr-service__languages/);
  assert.match(serviceStyles, /gap:\s*22px/);
  assert.match(serviceStyles, /nr-service__knobs::before/);
  assert.match(serviceStyles, /nr-service__knob\.is-selected > button::after/);

  assert.doesNotMatch(index, /nr-index__hero/);
  assert.match(index, /editableVersion\s*=\s*this\.version\s*===\s*'asis'\s*\|\|\s*this\.version\s*===\s*'tobe'/);
  assert.match(index, /editableVersion\s*\?\s*html`[\s\S]*nr-index__footer/);

  const languagePosition = general.indexOf('${this.renderLanguagePanel(module)}');
  const metricsPosition = general.indexOf('class="nr-general__metrics"');
  const advancedPosition = general.indexOf('general.advancedTitle');
  const processPosition = general.indexOf('general.processTitle');
  assert.ok(languagePosition < metricsPosition && metricsPosition < advancedPosition && advancedPosition < processPosition);
  assert.match(general, /<details class="nr-general__group">/);
  assert.doesNotMatch(general, /<details class="nr-general__group"\s+open/);
});

test('v3 ontology dense sections and object fields are collapsed details with visible counts', () => {
  const ontology = readFileSync(new URL('./widgets/ontology.ts', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('./widgets/ontology.less', import.meta.url), 'utf8');

  assert.equal((ontology.match(/<details class="nr-ontology__section nr-v3__section nr-v3__collapsible-section">/g) || []).length, 4);
  assert.doesNotMatch(ontology, /nr-v3__collapsible-section"\s+open/);
  assert.match(ontology, /<details class="nr-v3__tree-node is-branch">/);
  assert.doesNotMatch(ontology, /nr-v3__tree-node is-branch"\s+\?open=/);
  assert.match(ontology, /ontologyNodeLeafCount\(node\.children\)/);
  assert.match(ontology, /ontology\.v3\.innerFields/);
  assert.match(styles, /nr-v3__section-summary::before/);
  assert.match(styles, /nr-v3__tree-node\[open\][^\n]*rotate\(90deg\)/);
  assert.match(ontology, /class="nr-v3__entity-accordion"/);
  assert.match(ontology, /<details class=\$\{className\} \?open=\$\{isOpen\}>/);
  assert.match(ontology, /selectV3EntityAndScroll\(entity\.entityId, event\.currentTarget as HTMLElement\)/);
  assert.match(ontology, /window\.setTimeout\(resolve, 800\)/);
  assert.match(ontology, /summary\.scrollIntoView\(\{/);
  assert.match(ontology, /token !== this\.v3ScrollToken/);
  assert.doesNotMatch(ontology, /<aside>\$\{this\.v3Views\.map/);
  assert.match(styles, /grid-template-rows:\s*0fr/);
  assert.match(styles, /nr-v3__entity-panel\[open\][^\n]*grid-template-rows:\s*1fr/);
  assert.match(styles, /grid-template-rows \.8s cubic-bezier/);
  assert.match(styles, /scroll-margin-top:\s*1rem/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});

test('presentation environment badge is hidden while Studio is active', () => {
  const shell = readFileSync(new URL('../../../mls-102033/l2/shared/shell.ts', import.meta.url), 'utf8');
  assert.match(shell, /getElementById\('collab-env-badge'\)/);
  assert.match(shell, /environmentBadge\.hidden\s*=\s*this\.studioModeOn/);
});
