/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plAdopt.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePlInvocation } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { plAdoptText } from '/_102035_/l2/agentPlannerL4/helpers/plAdopt.js';

void test('l4_p4_165: /adopt is its own mode of the invocation', () => {
  const parsed = parsePlInvocation('@@agentPlannerL4 telegram /adopt');
  assert.equal(parsed.adopt, true);
  assert.equal(parsed.apply, false);
  assert.equal(parsed.module, 'telegram');
  assert.equal(parsePlInvocation('@@agentPlannerL4 telegram /apply').adopt, false);
  assert.equal(parsePlInvocation('@@agentPlannerL4 telegram').adopt, false);
});

void test('l4_p4_165: /adopt answers adopted or refused with the reason, and refuses a module that does not exist', async () => {
  const previous = (globalThis as any).mls;
  (globalThis as any).mls = { actualProject: 102035, stor: { files: {
    k: { project: 102035, level: 4, folder: 'telegram', shortName: 'module', extension: '.defs.ts', status: 'unchanged' },
  } } };
  try {
    const adopted = await plAdoptText('telegram', { adopt: async (_p, moduleName) => ({ changeId: 'c', inputRevisionId: 'i', outputRevisionId: 'review-x', outputSnapshotHash: 'h', alreadyAdopted: false, moduleName } as never) });
    assert.match(adopted, /^adopted: \{"moduleName":"telegram".*"outputRevisionId":"review-x"/);
    assert.equal(await plAdoptText('telegram', { adopt: async () => { throw new Error('l4.result_stale'); } }), 'refused: l4.result_stale');
    assert.match(await plAdoptText('semModulo'), /^refused: module "semModulo" does not exist/);
  } finally { (globalThis as any).mls = previous; }
});
