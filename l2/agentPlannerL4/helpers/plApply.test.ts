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
  const applyOk = async (_project: number, moduleName: string, acceptedBy: string) => ({ changeId: 'c1', revisionId: 'r1', baseId: 'b1', acceptedBy, pendingCommands: 0, completed: true, moduleName } as never);
  try {
    const applied = await plApplyText('telegram', { ownerId: 'owner-1', localUserId: () => 'local-1', apply: applyOk });
    assert.match(applied, /^applied: \{"moduleName":"telegram".*"acceptedBy":"owner-1"/);
    const refused = await plApplyText('telegram', {
      ownerId: 'owner-1',
      apply: async () => { throw new Error('l4.implementation_blocked'); },
    });
    assert.equal(refused, 'refused: l4.implementation_blocked');
    assert.match(await plApplyText('semModulo', { ownerId: 'x' }), /^refused: module "semModulo" does not exist/);
  } finally { (globalThis as any).mls = previous; }
});

void test('l4_p4_164: who accepts is the owner of the command, else the local user id, else nobody (refused, nothing applied)', async () => {
  const previous = (globalThis as any).mls;
  (globalThis as any).mls = { actualProject: 102035, stor: { files: {
    k: { project: 102035, level: 4, folder: 'telegram', shortName: 'module', extension: '.defs.ts', status: 'unchanged' },
  } } };
  const calls: string[] = [];
  const apply = async (_project: number, moduleName: string, acceptedBy: string) => { calls.push(acceptedBy); return { changeId: 'c', revisionId: 'r', baseId: 'b', acceptedBy, pendingCommands: 0, completed: true, moduleName } as never; };
  try {
    assert.match(await plApplyText('telegram', { ownerId: 'dono', localUserId: () => 'local', apply }), /"acceptedBy":"dono"/);
    assert.match(await plApplyText('telegram', { localUserId: () => 'local', apply }), /"acceptedBy":"local"/);
    const none = await plApplyText('telegram', { localUserId: () => null, apply });
    assert.match(none, /^refused: it was not possible to know who accepts/);
    assert.deepEqual(calls, ['dono', 'local']);
  } finally { (globalThis as any).mls = previous; }
});
