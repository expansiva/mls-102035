/// <mls fileReference="_102035_/l2/newRelease/helpers/agentCommandRunner.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeNewReleaseRequest, runNewReleaseRequest, runNewReleaseCommand, taskResultTexts, newReleaseTaskCost } from './agentCommandRunner.js';
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

test('task cost sums reported nested interactions and leaves missing cost unknown', () => {
  const value = task('done');
  assert.equal(newReleaseTaskCost(value), null);
  value.iaCompressed = { nextSteps: [{ type: 'agent', interaction: { cost: .12, payload: [
    { type: 'agent', interaction: { cost: .08, payload: [] }, nextSteps: [] },
  ] }, nextSteps: [{ type: 'result', nextSteps: [] }] }], longMemory: {}, queueBackEnd: [], queueFrontEnd: [] } as any;
  assert.equal(newReleaseTaskCost(value), .2);
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
  assert.deepEqual(summarizeNewReleaseRequest([...intermediate, JSON.stringify({ written: false, question: 'Which actor?', summary: 'Question: Which actor?' })], 'done'),
    { key: 'request.question', values: { question: 'Which actor?' }, retry: true, summary: 'Question: Which actor?' });
  assert.deepEqual(summarizeNewReleaseRequest([JSON.stringify({ written: false, reason: 'Gate refused', issues: [] })], 'done'),
    { key: 'request.refused', values: { reason: 'Gate refused' }, retry: true });
});

test('successful prompt exposes assumptions as a list without repeating their summary line', () => {
  const results = [
    JSON.stringify({ triage: { valid: true, assumptions: ['actor: team member'] } }),
    JSON.stringify({ written: true, files: ['journeys/view.defs.ts'], summary: 'Journey added\nAssumed: actor: team member; scope: own\nReview the interface in L3.' }),
  ];
  assert.deepEqual(summarizeNewReleaseRequest(results, 'done'), {
    key: 'request.success', values: { count: 1 }, retry: false,
    assumptions: ['actor: team member', 'scope: own'],
    summary: 'Journey added\nReview the interface in L3.',
  });
  assert.deepEqual(summarizeNewReleaseRequest([
    JSON.stringify({ triage: { valid: true, assumptions: [] } }),
    JSON.stringify({ written: true, files: ['access.defs.ts'], summary: 'Acesso atualizado\nAssumi: campo visível ao ator' }),
  ], 'done'), {
    key: 'request.success', values: { count: 1 }, retry: false,
    assumptions: ['campo visível ao ator'], summary: 'Acesso atualizado',
  });
});

test('l4_p4_100: the triage predictions are not shown as assumptions; only the producer line is', () => {
  assert.deepEqual(summarizeNewReleaseRequest([
    JSON.stringify({ triage: { valid: true, assumptions: ['a tela é uma jornada nova'] } }),
    JSON.stringify({ written: true, files: ['journeys/view.defs.ts'], summary: 'Alterada: minhasTarefas' }),
  ], 'done'), { key: 'request.success', values: { count: 1 }, retry: false, summary: 'Alterada: minhasTarefas' });
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


test('a text request uses the module thread id and does not invent one', async () => {
  const outcome = await runNewReleaseCommand('agentNewReleasePrompt', JSON.stringify({ moduleName: 'comanda', request: 'marcar pronto' }), () => {}, {
    userId: () => 'user', project: 102047,
    moduleThread: async (project, moduleName) => {
      assert.deepEqual([project, moduleName], [102047, 'comanda']);
      return { threadId: 'thread-comanda' };
    },
    context: (threadId, senderId, content) => ({ isTest: true, task: undefined, message: { threadId, senderId, content, createAt: '', orderAt: '' } }),
    execute: async (_agent, context) => {
      assert.equal(context.message.threadId, 'thread-comanda');
      context.task = task('done');
    },
  });
  assert.equal(outcome.task.status, 'done');
});

test('a language command uses the module thread from its payload', async () => {
  const payload = JSON.stringify([{ languages: [{ code: 'fr', name: 'French' }], projectId: 102047, moduleName: 'ordenServicio5' }]);
  await runNewReleaseCommand('agentAddLanguage', payload, () => {}, {
    userId: () => 'user',
    moduleThread: async (project, moduleName) => {
      assert.deepEqual([project, moduleName], [102047, 'ordenServicio5']);
      return { threadId: 'thread-orden' };
    },
    context: (threadId, senderId, content) => ({ isTest: true, task: undefined, message: { threadId, senderId, content, createAt: '', orderAt: '' } }),
    execute: async (_agent, context) => { assert.equal(context.message.threadId, 'thread-orden'); context.task = task('done'); },
  });
});

test('a membership refusal from the server stays visible and does not start another thread', async () => {
  let threads = 0;
  await assert.rejects(runNewReleaseRequest('comanda', 'marcar', () => {}, {
    userId: () => 'user',
    thread: async () => { threads += 1; return { threadId: 'stored' }; },
    context: (threadId, senderId, content) => ({ isTest: true, task: undefined, message: { threadId, senderId, content, createAt: '', orderAt: '' } }),
    execute: async () => { throw new Error('User is not a member of this thread'); },
  }), /new-release\.thread_forbidden:User is not a member of this thread/);
  assert.equal(threads, 1);
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


test('request states come only from the final written result and reject invalid entries', () => {
  const changed = { path: 'journeys/existing.defs.ts', state: 'changed' };
  const added = { path: 'journeys/new.defs.ts', state: 'added' };
  const removed = { path: 'journeys/old.defs.ts', state: 'removed' };
  const summary = summarizeNewReleaseRequest([
    JSON.stringify({ fileStates: [{ path: 'intermediate', state: 'added' }] }),
    JSON.stringify({ written: false, fileStates: [{ path: 'refused', state: 'changed' }] }),
    JSON.stringify({ written: true, files: [changed.path, added.path, removed.path], fileStates: [changed, added, removed,
      null, {}, { path: 42, state: 'added' }, { path: 'invalid', state: 'kept' }] }),
  ], 'done');
  assert.deepEqual(summary, { key: 'request.success', values: { count: 3 }, retry: false, fileStates: [changed, added, removed] });
});

test('producer summary is kept for a written request and a clarification', () => {
  const written = summarizeNewReleaseRequest([JSON.stringify({ written: true, files: ['rules.defs.ts'], summary: 'descontoNaoExcedeSubtotal mudou' })], 'done');
  assert.equal(written.summary, 'descontoNaoExcedeSubtotal mudou');
  const question = summarizeNewReleaseRequest([JSON.stringify({ question: 'Quem marca o prato como pronto?', summary: 'Quem marca o prato como pronto?', written: false })], 'paused');
  assert.equal(question.summary, 'Quem marca o prato como pronto?');
  assert.equal(question.retry, true);
});
