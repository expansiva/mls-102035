/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plImplemented.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePlInvocation } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { plImplementedText, type PlImplementedDependencies } from '/_102035_/l2/agentPlannerL4/helpers/plImplemented.js';
import type { L4ImplementationPhase, L4ImplementationRecord } from '/_102035_/l2/solution/candidate/moduleImplementation.js';

function withModule<T>(work: () => Promise<T>): Promise<T> {
  const previous = (globalThis as any).mls;
  (globalThis as any).mls = { actualProject: 102035, stor: { files: {
    k: { project: 102035, level: 4, folder: 'telegram', shortName: 'module', extension: '.defs.ts', status: 'unchanged' },
  } } };
  return work().finally(() => { (globalThis as any).mls = previous; });
}

const merged = { create: [], regenerateDefs: [], materialize: [{ project: '102021', kind: 'entity', id: 'x', path: 'p' }], remove: [], runAgents: [], abend: [] };
const record = (phases: L4ImplementationPhase[] = []): L4ImplementationRecord => ({
  schemaVersion: '2026-10-08-nr-module-implementation-v1', changeId: 'c1', revisionId: 'r1', acceptedBy: 'u', acceptedAt: 'now',
  hashes: {}, merged: merged as never, phases,
});
const done = (index: number): L4ImplementationPhase => ({ name: `runAgents:${index}`, agent: 'a', command: 'c', attempt: 1, taskId: 't', threadId: 'th', messageId: 'm', status: 'done', startedAt: 's' });

function deps(current: L4ImplementationRecord | null, calls: string[]): PlImplementedDependencies {
  return {
    ownerId: 'dono', now: () => 'T', project: 102035,
    read: async () => current,
    active: async () => ({ changeId: 'c1', baseId: 'b1', activeRevisionId: 'r1' }) as never,
    diff: async () => [{ path: 'l1/x', status: 'changed', level: 1 }] as never,
    write: (async (_p: number, _m: string, work: (rec: L4ImplementationRecord, save: (phase: L4ImplementationPhase) => Promise<void>) => Promise<unknown>) =>
      work(current!, async phase => { calls.push(`save:${phase.name}:${phase.status}:${phase.report}`); current!.phases.push(phase); })) as never,
    compact: (async () => { calls.push('compact'); }) as never,
    complete: (async (_p: number, _m: string, _c: string, _r: string, by: string) => { calls.push(`complete:${by}`); }) as never,
  };
}

void test('l4_p4_177: /implemented and /confirm are their own mode of the invocation', () => {
  const parsed = parsePlInvocation('@@agentPlannerL4 telegram /implemented /confirm');
  assert.equal(parsed.implemented, true);
  assert.equal(parsed.confirm, true);
  assert.equal(parsed.module, 'telegram');
  const listed = parsePlInvocation('@@agentPlannerL4 telegram /implemented');
  assert.equal(listed.implemented, true);
  assert.equal(listed.confirm, false);
  assert.equal(parsePlInvocation('@@agentPlannerL4 telegram /apply').implemented, false);
});

void test('l4_p4_177: without /confirm it lists the pending commands and writes nothing', () => withModule(async () => {
  const calls: string[] = [];
  const text = await plImplementedText('telegram', false, deps(record([done(0)]), calls));
  assert.match(text, /^pending: \{"moduleName":"telegram","changeId":"c1","commands":\[\{"index":1,/);
  assert.match(text, /@@agentPlannerL4 telegram \/implemented \/confirm/);
  assert.deepEqual(calls, []);
}));

void test('l4_p4_177: /confirm records each pending command as done by the operator, then compact, complete, in the screen order', () => withModule(async () => {
  const calls: string[] = [];
  const current = record([done(0)]);
  const text = await plImplementedText('telegram', true, deps(current, calls));
  assert.match(text, /^implemented: \{"moduleName":"telegram".*"confirmedBy":"dono".*"completed":true/);
  const saves = calls.filter(call => call.startsWith('save:'));
  assert.equal(saves.length, 4);
  assert.match(saves[0], /^save:runAgents:1:done:recorded by command \(dono\)/);
  assert.deepEqual(calls.filter(call => !call.startsWith('save:')), ['compact', 'complete:dono']);
  assert.ok(calls.indexOf('compact') > calls.lastIndexOf(saves[saves.length - 1]));
  assert.deepEqual(current.phases.find(phase => phase.name === 'runAgents:1')?.changedDefs, [{ path: 'l1/x', status: 'changed', level: 1 }]);
}));

void test('l4_p4_177: refusals: no applied change, no commands, an unresolved phase, nobody to confirm, a module that does not exist', () => withModule(async () => {
  assert.equal(await plImplementedText('telegram', true, deps(null, [])), 'refused: l4.implemented_no_applied_change');
  const none = record(); none.merged = { ...merged, materialize: [] } as never;
  assert.equal(await plImplementedText('telegram', true, deps(none, [])), 'refused: l4.implemented_nothing_pending');
  const failed = record([{ ...done(0), status: 'failed' }]);
  assert.match(await plImplementedText('telegram', true, deps(failed, [])), /^refused: l4\.implemented_phase_unresolved: runAgents:0 is failed/);
  const calls: string[] = [];
  const noOwner = { ...deps(record(), calls), ownerId: '', localUserId: () => null };
  assert.match(await plImplementedText('telegram', true, noOwner), /^refused: it was not possible to know who confirms/);
  assert.deepEqual(calls, []);
  assert.match(await plImplementedText('semModulo', true, deps(record(), [])), /^refused: module "semModulo" does not exist/);
}));
