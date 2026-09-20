/// <mls fileReference="_102035_/l2/newRelease/newReleaseI18n.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createNewReleaseTranslator,
  loadNewReleaseMessages,
  newReleaseI18nCandidates,
  newReleaseI18nFileFromUrl,
  readNewReleaseI18nFromStor,
  type NewReleaseI18nFile,
  type NewReleaseMessages,
} from './helpers/i18n.js';

const MASTER_PT = '/_102035_/l2/newRelease/i18n/pt-BR.json';
const PROJECT_PT = '/_102047_/l2/newRelease/i18n/pt-BR.json';
const MASTER_PT_BASE = '/_102035_/l2/newRelease/i18n/pt.json';
const MASTER_EN = '/_102035_/l2/newRelease/i18n/en-US.json';

function keyOf(file: NewReleaseI18nFile): string {
  return `${file.project}_${file.level}_${file.folder}/${file.shortName}${file.extension}`;
}

function httpMap(map: Record<string, unknown>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!(url in map)) return { ok: false, json: async () => ({}) } as Response;
    const body = map[url];
    if (body === 'THROW') throw new SyntaxError('invalid json');
    return { ok: true, json: async () => body } as Response;
  }) as typeof fetch;
}

function storMap(map: Record<string, NewReleaseMessages | null | 'THROW'>): (file: NewReleaseI18nFile) => Promise<NewReleaseMessages | null> {
  return async file => {
    const url = `/_${file.project}_/l2/${file.folder}/${file.shortName}${file.extension}`;
    if (!(url in map)) return null;
    const value = map[url];
    if (value === 'THROW') throw new Error('invalid stor');
    return value;
  };
}

async function translatorFor(
  project: number,
  language: string,
  stor: Record<string, NewReleaseMessages | null | 'THROW'>,
  http: Record<string, unknown>,
) {
  const bundles = await loadNewReleaseMessages(project, language, {
    readStor: storMap(stor),
    fetcher: httpMap(http),
  });
  return createNewReleaseTranslator(bundles);
}

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
    'widgets/review.ts',
  ]
    .map(path => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/^\/\/\/.*$/gm, ''));
  for (const source of widgetSources) {
    assert.doesNotMatch(source, /(?<!=)>[ \t]*\p{L}[^<${}\n]*</u);
  }
  const pt = JSON.parse(readFileSync(new URL('i18n/pt-BR.json', import.meta.url), 'utf8'));
  const en = JSON.parse(readFileSync(new URL('i18n/en-US.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(pt).sort(), Object.keys(en).sort());
});

test('candidate URL maps to the Studio stor file of the same catalog', () => {
  assert.deepEqual(newReleaseI18nFileFromUrl(MASTER_PT), {
    project: 102035,
    level: 2,
    folder: 'newRelease/i18n',
    shortName: 'pt-BR',
    extension: '.json',
  });
  assert.equal(keyOf(newReleaseI18nFileFromUrl(MASTER_PT)!), '102035_2_newRelease/i18n/pt-BR.json');
});

test('current master stor with an old static URL translates tab.review and review.title', async () => {
  const t = await translatorFor(102047, 'pt-BR', {
    [MASTER_PT]: {
      'tab.review': 'Revisão',
      'review.title': 'Menu que o ator vai ver',
      'tab.general': 'Resumo atual',
    },
  }, {
    [MASTER_PT]: { 'tab.general': 'Resumo antigo', 'tab.access': 'Matriz de acesso' },
  });
  assert.equal(t('tab.review'), 'Revisão');
  assert.equal(t('review.title'), 'Menu que o ator vai ver');
  assert.equal(t('tab.general'), 'Resumo atual');
  assert.equal(t('tab.access'), 'Matriz de acesso');
});

test('project override stor stays ahead of master stor and HTTP', async () => {
  const t = await translatorFor(102047, 'pt-BR', {
    [PROJECT_PT]: { 'tab.general': 'Cliente' },
    [MASTER_PT]: { 'tab.general': 'Master', 'tab.review': 'Revisão' },
  }, {
    [PROJECT_PT]: { 'tab.general': 'HTTP cliente' },
    [MASTER_PT]: { 'tab.general': 'HTTP master' },
  });
  assert.equal(t('tab.general'), 'Cliente');
  assert.equal(t('tab.review'), 'Revisão');
});

test('HTTP fills the candidate when stor is missing', async () => {
  const t = await translatorFor(102047, 'pt-BR', {}, {
    [MASTER_PT]: { 'tab.review': 'Revisão HTTP', 'review.title': 'Menu HTTP' },
  });
  assert.equal(t('tab.review'), 'Revisão HTTP');
  assert.equal(t('review.title'), 'Menu HTTP');
});

test('base language and English follow the candidate chain', async () => {
  const t = await translatorFor(102047, 'pt-BR', {
    [MASTER_PT_BASE]: { 'tab.general': 'Geral' },
  }, {
    [MASTER_EN]: { 'tab.general': 'Overview', greeting: 'Hello' },
  });
  assert.equal(t('tab.general'), 'Geral');
  assert.equal(t('greeting'), 'Hello');
});

test('invalid stor or HTTP JSON is skipped without breaking the tab', async () => {
  const t = await translatorFor(102047, 'pt-BR', {
    [PROJECT_PT]: 'THROW',
    [MASTER_PT]: null,
  }, {
    [PROJECT_PT]: 'THROW',
    [MASTER_PT]: ['not', 'an', 'object'],
    [MASTER_EN]: { 'tab.review': 'Review' },
  });
  assert.equal(t('tab.review'), 'Review');
  assert.equal(t('missing.key'), 'missing.key');
});

test('Studio getValueInfo content:null falls through to getContent', async () => {
  const file = newReleaseI18nFileFromUrl(MASTER_PT)!;
  const record = {
    status: 'nochange',
    getValueInfo: async () => ({ content: null }),
    getContent: async () => JSON.stringify({
      'tab.review': 'Revisão',
      'review.title': 'Menu que o ator vai ver',
    }),
  };
  const previous = (globalThis as unknown as { mls?: unknown }).mls;
  (globalThis as unknown as { mls: unknown }).mls = {
    stor: {
      files: { [keyOf(file)]: record },
      getKeyToFile: keyOf,
    },
  };
  try {
    const bundles = await loadNewReleaseMessages(102047, 'pt-BR', {
      fetcher: httpMap({ [MASTER_PT]: { 'tab.general': 'Resumo antigo' } }),
    });
    const t = createNewReleaseTranslator(bundles);
    assert.equal(t('tab.review'), 'Revisão');
    assert.equal(t('review.title'), 'Menu que o ator vai ver');
    assert.equal(t('tab.general'), 'Resumo antigo');
    assert.deepEqual(await readNewReleaseI18nFromStor(file), {
      'tab.review': 'Revisão',
      'review.title': 'Menu que o ator vai ver',
    });
  } finally {
    (globalThis as unknown as { mls?: unknown }).mls = previous;
  }
});
