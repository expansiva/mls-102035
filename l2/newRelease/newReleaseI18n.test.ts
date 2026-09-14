/// <mls fileReference="_102035_/l2/newRelease/newReleaseI18n.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createNewReleaseTranslator, newReleaseI18nCandidates } from './helpers/i18n.js';

test('i18n prioritizes client, master, base language, then master-US', () => {
  assert.deepEqual(newReleaseI18nCandidates(102047, 'pt-BR'), [
    '/_102047_/l2/newRelease/i18n/pt-BR.json',
    '/_102035_/l2/newRelease/i18n/pt-BR.json',
    '/_102047_/l2/newRelease/i18n/pt.json',
    '/_102035_/l2/newRelease/i18n/pt.json',
    '/_102035_/l2/newRelease/i18n/en-US.json',
  ]);
});

test('translator falls through bundles, interpolates and exposes a missing key', () => {
  const t = createNewReleaseTranslator([
    { 'tab.general': 'Resumo' },
    { 'tab.general': 'Overview', greeting: 'Hello {{name}}' },
  ]);
  assert.equal(t('tab.general'), 'Resumo');
  assert.equal(t('greeting', { name: 'Ada' }), 'Hello Ada');
  assert.equal(t('missing.key'), 'missing.key');
});

test('every widget keeps visible copy in external message bundles', () => {
  const widgetSources = [
    'widgets/index.ts',
    'widgets/general.ts',
    'widgets/journeys.ts',
    'widgets/ontology.ts',
    'widgets/access.ts',
    'widgets/rules.ts',
    'widgets/workflows.ts',
    'widgets/integration.ts',
  ]
    .map(path => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/^\/\/\/.*$/gm, ''));
  for (const source of widgetSources) {
    assert.doesNotMatch(source, /(?<!=)>[ \t]*\p{L}[^<${}\n]*</u);
  }
  const pt = JSON.parse(readFileSync(new URL('i18n/pt-BR.json', import.meta.url), 'utf8'));
  const en = JSON.parse(readFileSync(new URL('i18n/en-US.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(pt).sort(), Object.keys(en).sort());
});
