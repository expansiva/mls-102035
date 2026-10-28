/// <mls fileReference="_102035_/l2/newRelease/newReleaseI18n.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createNewReleaseTranslator, loadNewReleaseMessages } from './helpers/i18n.js';

test('translator falls through bundles, interpolates and exposes a missing key', () => {
  const t = createNewReleaseTranslator([
    { 'tab.general': 'Resumo' },
    { 'tab.general': 'Overview', greeting: 'Hello {{name}}' },
  ]);
  assert.equal(t('tab.general'), 'Resumo');
  assert.equal(t('greeting', { name: 'Ada' }), 'Hello Ada');
  assert.equal(t('missing.key'), 'missing.key');
});

test('every widget keeps visible copy in compiled message bundles', async () => {
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
  const [pt] = await loadNewReleaseMessages(102035, 'pt');
  const [en] = await loadNewReleaseMessages(102035, 'en');
  assert.deepEqual(Object.keys(pt).sort(), Object.keys(en).sort());
});

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...sourceFiles(full));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) files.push(full);
  }
  return files;
}

test('every literal t() key exists in both bundles', async () => {
  const root = fileURLToPath(new URL('.', import.meta.url));
  const [pt] = await loadNewReleaseMessages(102035, 'pt');
  const [en] = await loadNewReleaseMessages(102035, 'en');
  const missing: string[] = [];
  const seen = new Set<string>();
  const pattern = /\bt\(\s*'([A-Za-z0-9_.-]+)'/g;
  for (const file of sourceFiles(root)) {
    const name = file.slice(file.lastIndexOf('/') + 1);
    for (const match of readFileSync(file, 'utf8').matchAll(pattern)) {
      const key = match[1];
      const cite = `${name}: ${key}`;
      if (seen.has(cite)) continue;
      seen.add(cite);
      if (!(key in pt) || !(key in en)) missing.push(cite);
    }
  }
  assert.deepEqual(missing, []);
});

test('gapCount interpolates through the real translator in both bundles', async () => {
  for (const language of ['pt', 'en']) {
    const [messages] = await loadNewReleaseMessages(102035, language);
    const text = createNewReleaseTranslator([messages])('review.backend.testSupport.gapCount', { count: 2 });
    assert.notEqual(text, 'review.backend.testSupport.gapCount');
    assert.match(String(text), /2/);
  }
});

test('mr_12 implementation values interpolate through the real translator in both languages', async () => {
  for (const [language, attemptLabel, countLabel, levelLabel] of [
    ['pt-BR', 'Tentativa', 'Definições alteradas', 'Nível'],
    ['en-US', 'Attempt', 'Changed definitions', 'Level'],
  ]) {
    const [messages] = await loadNewReleaseMessages(102035, language);
    const t = createNewReleaseTranslator([messages]);
    for (const value of [1, 2]) {
      assert.equal(t('review.implementation.attempt', { attempt: value }),
        `${attemptLabel} ${value} ${language === 'pt-BR' ? 'de' : 'of'} 2`);
      assert.equal(t('review.implementation.changedDefs', { count: value }), `${countLabel}: ${value}`);
      assert.equal(t('review.implementation.level', { level: value }), `${levelLabel} ${value}`);
    }
  }
});

test('special i18n block contains parseable conventional catalogs and lowercase locale keys', () => {
  const source = readFileSync(new URL('helpers/i18n.ts', import.meta.url), 'utf8');
  const block = source.split('/// **collab_i18n_start**')[1]?.split('/// **collab_i18n_end**')[0];
  assert.ok(block);
  const result = ts.transpileModule(block, { reportDiagnostics: true });
  assert.deepEqual(result.diagnostics, []);
  const ast = ts.createSourceFile('i18n.ts', block, ts.ScriptTarget.Latest, true);
  const declarations = ast.statements.flatMap(statement => ts.isVariableStatement(statement)
    ? [...statement.declarationList.declarations] : []);
  for (const name of ['message_en', 'message_pt', 'messages']) {
    assert.ok(declarations.some(declaration => declaration.name.getText(ast) === name));
  }
  const locales = declarations.find(declaration => declaration.name.getText(ast) === 'messages')!;
  assert.ok(locales.initializer && ts.isObjectLiteralExpression(locales.initializer));
  assert.deepEqual(locales.initializer.properties.map(property => property.name?.getText(ast)), ['en', 'pt']);
  assert.ok(ast.statements.some(statement => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'MessageType'));
});

test('loading compiled messages selects locale without fetching or accessing MLS storage', async t => {
  const fetcher = t.mock.method(globalThis, 'fetch', async () => { throw new Error('unexpected HTTP'); });
  const previousMls = Object.getOwnPropertyDescriptor(globalThis, 'mls');
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  let storageReads = 0;
  Object.defineProperty(globalThis, 'mls', { configurable: true, get() {
    storageReads++;
    throw new Error('MLS must not be required');
  } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: { lang: '' } } });
  try {
    const [en] = await loadNewReleaseMessages(102035, 'en');
    const [pt] = await loadNewReleaseMessages(102035, 'pt');
    assert.notEqual(en['tab.general'], pt['tab.general']);
    for (const project of [102035, 102047, 102056]) {
      for (const language of ['pt-BR', 'pt', ' PT-br ', 'pt-PT']) {
        assert.deepEqual(await loadNewReleaseMessages(project, language), [pt, en]);
      }
      for (const language of ['en-US', 'en', 'EN-us', 'de-DE', '', 'unknown', 'constructor', '__proto__']) {
        assert.deepEqual(await loadNewReleaseMessages(project, language), [en]);
      }
      assert.deepEqual(await loadNewReleaseMessages(project), [en]);
    }
    assert.equal(fetcher.mock.callCount(), 0);
    assert.equal(storageReads, 0);
  } finally {
    if (previousMls) Object.defineProperty(globalThis, 'mls', previousMls);
    else Reflect.deleteProperty(globalThis, 'mls');
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
