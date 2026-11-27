/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plLanguages.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePlInvocation } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { plLanguagesText, type PlLanguagesDependencies } from '/_102035_/l2/agentPlannerL4/helpers/plLanguages.js';
import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

function withModule<T>(work: () => Promise<T>): Promise<T> {
  const previous = (globalThis as any).mls;
  (globalThis as any).mls = { actualProject: 102035, stor: { files: {
    k: { project: 102035, level: 4, folder: 'telegram', shortName: 'module', extension: '.defs.ts', status: 'unchanged' },
  } } };
  return work().finally(() => { (globalThis as any).mls = previous; });
}

const published = { productLanguages: ['en'], defaultLanguage: 'en' } as Ns5ModuleArtifact;

function deps(calls: unknown[], current: Ns5ModuleArtifact | null = published, fail = ''): PlLanguagesDependencies {
  return {
    project: 102035,
    known: code => ['en', 'pt-BR', 'es'].includes(code),
    readModule: async () => current,
    save: (async (_p: number, _m: string, languages: unknown, expected: unknown) => {
      if (fail) throw new Error(fail);
      calls.push({ languages, expected });
      return null;
    }) as never,
  };
}

void test('l4_p4_198: /languages is its own mode of the invocation and plans nothing', () => {
  const parsed = parsePlInvocation('@@agentPlannerL4 telegram /languages en,pt-BR default=en');
  assert.deepEqual(parsed.languages, { codes: ['en', 'pt-BR'], defaultLanguage: 'en' });
  assert.equal(parsed.module, 'telegram');
  assert.equal(parsePlInvocation('@@agentPlannerL4 telegram /languages pt-BR').languages?.defaultLanguage, '');
  assert.equal(parsePlInvocation('@@agentPlannerL4 telegram /apply').languages, null);
});

void test('l4_p4_198: /languages saves the metadata the way the screen does, with no active change expected', async () => {
  await withModule(async () => {
    const calls: unknown[] = [];
    const text = await plLanguagesText('telegram', ['en', 'pt-BR'], 'en', deps(calls));
    assert.match(text, /^languages: telegram productLanguages=en,pt-BR defaultLanguage=en/u);
    assert.deepEqual(calls, [{ languages: { productLanguages: ['en', 'pt-BR'], defaultLanguage: 'en' }, expected: { changeId: null, revisionId: null } }]);
    const kept: unknown[] = [];
    await plLanguagesText('telegram', ['en', 'pt-BR'], '', deps(kept));
    assert.equal((kept[0] as { languages: { defaultLanguage: string } }).languages.defaultLanguage, 'en');
  });
});

void test('l4_p4_198: /languages refuses what the screen refuses and says why', async () => {
  await withModule(async () => {
    const calls: unknown[] = [];
    assert.match(await plLanguagesText('nope', ['en'], '', deps(calls)), /^refused: module "nope"/u);
    assert.match(await plLanguagesText('telegram', [], '', deps(calls)), /^refused: l4\.languages_none/u);
    assert.match(await plLanguagesText('telegram', ['en', 'xx'], '', deps(calls)), /^refused: l4\.languages_unknown_code: xx/u);
    assert.equal(await plLanguagesText('telegram', ['en'], 'en', deps(calls, published, 'general.languagesConflict')), 'refused: general.languagesConflict');
    assert.equal(await plLanguagesText('telegram', ['en'], 'es', deps(calls, published, 'general.languagesInvalid')), 'refused: general.languagesInvalid');
    assert.deepEqual(calls, []);
  });
});
