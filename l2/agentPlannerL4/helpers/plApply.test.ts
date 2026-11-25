/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plApply.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePlInvocation } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { plApplyText } from '/_102035_/l2/agentPlannerL4/helpers/plApply.js';

void test('l4_p4_164: /apply is its own mode of the invocation and plans nothing else', () => {
  const parsed = parsePlInvocation('@@agentPlannerL4 telegram /apply');
  assert.equal(parsed.apply, true);
  assert.equal(parsed.module, 'telegram');
  assert.equal(parsed.candidate, '');
  assert.equal(parsePlInvocation('@@agentPlannerL4 telegram /candidate').apply, false);
  assert.equal(parsePlInvocation('@@agentPlannerL4 telegram').apply, false);
});

void test('l4_p4_164: /apply answers applied or refused with the reason, and refuses a module that does not exist', async () => {
  const previous = (globalThis as any).mls;
  (globalThis as any).mls = { actualProject: 102035, stor: { files: {
    k: { project: 102035, level: 4, folder: 'telegram', shortName: 'module', extension: '.defs.ts', status: 'unchanged' },
  } } };
  try {
    const applied = await plApplyText('telegram', {
      userId: async () => 'wagner@example.test',
      apply: async (_project, moduleName, acceptedBy) => ({ changeId: 'c1', revisionId: 'r1', baseId: 'b1', acceptedBy, pendingCommands: 0, completed: true, moduleName } as never),
    });
    assert.match(applied, /^applied: \{"moduleName":"telegram".*"acceptedBy":"wagner@example.test"/);
    const refused = await plApplyText('telegram', {
      userId: async () => 'wagner@example.test',
      apply: async () => { throw new Error('l4.implementation_blocked'); },
    });
    assert.equal(refused, 'refused: l4.implementation_blocked');
    assert.match(await plApplyText('semModulo', { userId: async () => 'x' }), /^refused: module "semModulo" does not exist/);
  } finally { (globalThis as any).mls = previous; }
});
