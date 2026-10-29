/// <mls fileReference="_102035_/l2/newRelease/helpers/agentCommandRunner.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeNewReleaseRequest, runNewReleaseRequest, runNewReleaseCommand, taskResultTexts } from './agentCommandRunner.js';
import type { TaskData } from '/_102036_/l2/shared/interfaces.js';
const task = (status: TaskData['status']): TaskData => ({ PK: 'task/#one', SK: 'metadata', title: '', owner: 'user', team: null,
  status, last_updated: 0, last_update_log: null, messageid_created: 'thread/canonical' });
test('request dispatches exact prompt once and observes the canonical task until done', async () => {
  const calls: string[] = [];
  const outcome = await runNewReleaseRequest('agendaClinica', 'Change "title"', value => { calls.push(value.status); }, {
    userId: () => 'user', thread: async () => ({ threadId: 'thread' }),
    context: (threadId, senderId, content) => ({ isTest: true, task: undefined,
      message: { threadId, senderId, content, createAt: 'temporary', orderAt: '' } }),
    execute: async (agent, context) => {
      assert.equal(agent, 'agentNewReleasePrompt');
      assert.deepEqual(JSON.parse(context.message.content.slice('@@agentNewReleasePrompt '.length)), { moduleName: 'agendaClinica', request: 'Change "title"' });
      context.task = task('in progress');
    },
    task: async (user, id, message) => {
      assert.deepEqual([user, id, message], ['user', 'one', 'thread/canonical']);
      return task('done');
    }, wait: async () => {},
  });
  assert.deepEqual(calls, ['in progress', 'done']);
  assert.equal(outcome.task.status, 'done');
});
test('canonical nested results and clarification are preserved for display', () => {
  const value = task('paused');
  value.iaCompressed = { nextSteps: [{ type: 'agent', nextSteps: [
    { type: 'result', result: '{"written":false,"reason":"No change"}', nextSteps: [] },
    { type: 'clarification', json: 'Which actor?', nextSteps: [] },
  ] }], longMemory: {}, queueBackEnd: [], queueFrontEnd: [] } as any;
  assert.deepEqual(taskResultTexts(value), ['{"written":false,"reason":"No change"}', 'Which actor?']);
});
test('a paused request returns the question without dispatching a second task', async () => {
  let calls = 0;
  const outcome = await runNewReleaseRequest('agendaClinica', 'Change', () => {}, {
    userId: () => 'user', thread: async () => ({ threadId: 'thread' }),
    context: (threadId, senderId, content) => ({ isTest: true, task: undefined,
      message: { threadId, senderId, content, createAt: '', orderAt: '' } }),
    execute: async (_agent, context) => { calls++; context.task = { ...task('paused'), last_update_log: 'Which actor?' }; },
  });
  assert.equal(calls, 1);
  assert.equal(outcome.task.status, 'paused');
  assert.equal(outcome.task.last_update_log, 'Which actor?');
});


test('request display skips producer indexes, proposals and gates and summarizes only final outcomes', () => {
  const intermediate = [JSON.stringify({ module: { sourcePrompt: 'Do not display' }, entities: [] }), JSON.stringify({ edits: [{ secret: 'proposal' }] }), JSON.stringify({ triage: { valid: true } })];
  assert.deepEqual(summarizeNewReleaseRequest([...intermediate, JSON.stringify({ written: true, files: ['one', 'two'], report: { checks: [] } })], 'done'),
    { key: 'request.success', values: { count: 2 }, retry: false });
  assert.deepEqual(summarizeNewReleaseRequest([...intermediate, JSON.stringify({ triage: { valid: false, reason: null, clarification: 'Which actor?' } })], 'done'),
    { key: 'request.question', values: { question: 'Which actor?' }, retry: true });
  assert.deepEqual(summarizeNewReleaseRequest([JSON.stringify({ written: false, reason: 'Gate refused', issues: [] })], 'done'),
    { key: 'request.refused', values: { reason: 'Gate refused' }, retry: true });
});

test('empty request never resolves a thread or invokes an agent', async () => {
  let calls = 0;
  await assert.rejects(runNewReleaseRequest('agendaClinica', '  ', () => {}, { thread: async () => { calls++; return { threadId: 'thread' }; }, execute: async () => { calls++; } }), /request_empty/);
  assert.equal(calls, 0);
});


test('entry refusal in the producer plain-text status result remains visible', () => {
  assert.deepEqual(summarizeNewReleaseRequest(['Invalid module name.'], 'done'),
    { key: 'request.refused', values: { reason: 'Invalid module name.' }, retry: true });
});


test('language commands dispatch the existing scoped array protocol and preserve failure status', async () => {
  for (const agent of ['agentAddLanguage', 'agentRemoveLanguage'] as const) {
    const payload = JSON.stringify([{ languages: [{ code: 'fr', name: 'French' }], projectId: 102047, moduleName: 'ordenServicio5' }]);
    const outcome = await runNewReleaseCommand(agent, payload, () => {}, {
      userId: () => 'user', thread: async () => ({ threadId: 'thread' }),
      context: (threadId, senderId, content) => ({ isTest: true, task: undefined, message: { threadId, senderId, content, createAt: '', orderAt: '' } }),
      execute: async (name, context) => { assert.equal(name, agent); assert.equal(context.message.content, '@@' + agent + ' ' + payload); context.task = task('failed'); },
    });
    assert.equal(outcome.task.status, 'failed');
  }
});


test('identity resolution is awaited and its original failure propagates before dispatch', async () => {
  const failure = new Error('collab_messages_user_unavailable: cm offline');
  await assert.rejects(runNewReleaseRequest('fixture', 'Change title', () => {}, {
    userId: async () => { throw failure; },
    thread: async () => { assert.fail('must not create a conversation without identity'); },
  }), error => error === failure);
  await runNewReleaseRequest('fixture', 'Change title', () => {}, {
    userId: async () => 'resolved-user', thread: async () => ({ threadId: 'thread' }),
    context: (threadId, senderId, content) => {
      assert.equal(senderId, 'resolved-user');
      return { isTest: true, message: { threadId, senderId, content, createAt: '', orderAt: '' } };
    },
    execute: async (_agent, context) => { context.task = task('done'); },
  });
});
