/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plSeal.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePlInvocation } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { plSealText, type PlSealDependencies } from '/_102035_/l2/agentPlannerL4/helpers/plSeal.js';

function withModule<T>(work: () => Promise<T>): Promise<T> {
  const previous = (globalThis as any).mls;
  (globalThis as any).mls = { actualProject: 102035, stor: { files: {
    k: { project: 102035, level: 4, folder: 'telegram', shortName: 'module', extension: '.defs.ts', status: 'unchanged' },
  } } };
  return work().finally(() => { (globalThis as any).mls = previous; });
}

function deps(calls: unknown[], change: unknown, fail = ''): PlSealDependencies {
  return {
    project: 102035,
    active: (async () => change) as never,
    seal: (async (...args: unknown[]) => {
      if (fail) throw new Error(fail);
      calls.push(args);
      return { revisionId: 'r2', changedPaths: ['a', 'b'] };
    }) as never,
  };
}

void test('l4_p4_198: /seal is its own mode of the invocation and plans nothing', () => {
  const parsed = parsePlInvocation('@@agentPlannerL4 telegram /seal');
  assert.equal(parsed.seal, true);
  assert.equal(parsed.module, 'telegram');
  assert.equal(parsePlInvocation('@@agentPlannerL4 telegram /apply').seal, false);
});

void test('l4_p4_198: /seal seals the active revision with the request text left as it is, and refuses without a change', async () => {
  await withModule(async () => {
    const calls: unknown[] = [];
    const text = await plSealText('telegram', deps(calls, { changeId: 'c1', activeRevisionId: 'r1' }));
    assert.match(text, /^sealed: telegram change c1 revision r2 \(was r1\), 2 changed path/u);
    assert.deepEqual(calls, [[102035, 'telegram', 'r1']]);
    assert.equal(await plSealText('telegram', deps(calls, null)), 'refused: l4.seal_no_active_change');
    assert.equal(await plSealText('telegram', deps(calls, { changeId: 'c1', activeRevisionId: 'r1' }, 'L4 revision conflict: reload before saving.')), 'refused: L4 revision conflict: reload before saving.');
    assert.match(await plSealText('nope', deps(calls, null)), /^refused: module "nope"/u);
    assert.equal(calls.length, 1);
  });
});
