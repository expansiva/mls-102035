/// <mls fileReference="_102035_/l2/ensaio/tarefasImplementacao.test.ts" enhancement="_blank" />

/**
 * l4_p4_96, second scenario: the implementation phases on a module generated in full (`tarefas`), after the
 * promotion of an accepted rule-only change. The planners are not run here (that is the `controleEstoque`
 * scenario); the state starts at the accepted effort. Every phase that runs is the REAL agent, no model call.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import * as agentNewReleaseL2 from '/_102020_/l2/agentNewReleaseL2/agentNewReleaseL2.js';
import * as agentMaterializeL2L2 from '/_102020_/l2/agentMaterializeL2/agentMaterializeL2.js';
import * as agentM4EntryL2 from '/_102020_/l2/agentMaterializeL2/steps/entry10/agentM4Entry.js';
import * as agentM4FinalizeL2 from '/_102020_/l2/agentMaterializeL2/steps/finalize70/agentM4Finalize.js';
import * as agentM4InputL2 from '/_102020_/l2/agentMaterializeL2/steps/input20/agentM4Input.js';
import * as agentM4PagesL2 from '/_102020_/l2/agentMaterializeL2/steps/pages50/agentM4Pages.js';
import * as agentM4PagesPageL2 from '/_102020_/l2/agentMaterializeL2/steps/pages50/agentM4PagesPage.js';
import * as agentM4ReviewL2 from '/_102020_/l2/agentMaterializeL2/steps/review55/agentM4Review.js';
import * as agentM4ReviewPageL2 from '/_102020_/l2/agentMaterializeL2/steps/review55/agentM4ReviewPage.js';
import * as agentM4ChainPageL2 from '/_102020_/l2/agentMaterializeL2/steps/shared40/agentM4ChainPage.js';
import * as agentM4SharedL2 from '/_102020_/l2/agentMaterializeL2/steps/shared40/agentM4Shared.js';
import * as agentM4SharedPageL2 from '/_102020_/l2/agentMaterializeL2/steps/shared40/agentM4SharedPage.js';
import { planNewReleaseL2 } from '/_102020_/l2/agentNewReleaseL2/helpers/plan.js';
import * as agentMaterializeL1 from '/_102021_/l2/agentMaterializeL1/agentMaterializeL1.js';
import * as agentM12Controllers from '/_102021_/l2/agentMaterializeL1/steps/controllers30/agentM12Controllers.js';
import * as agentM12Domain from '/_102021_/l2/agentMaterializeL1/steps/domain10/agentM12Domain.js';
import * as agentM12Finalize from '/_102021_/l2/agentMaterializeL1/steps/finalize80/agentM12Finalize.js';
import * as agentM12Persistence from '/_102021_/l2/agentMaterializeL1/steps/persistence20/agentM12Persistence.js';
import * as agentM12Register from '/_102021_/l2/agentMaterializeL1/steps/register70/agentM12Register.js';
import * as agentM12RequestService from '/_102021_/l2/agentMaterializeL1/steps/requests50/agentM12RequestService.js';
import * as agentM12Requests from '/_102021_/l2/agentMaterializeL1/steps/requests50/agentM12Requests.js';
import * as agentM12SeedRowUnit from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRowUnit.js';
import * as agentM12SeedRows from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRows.js';
import * as agentM12Tests from '/_102021_/l2/agentMaterializeL1/steps/tests60/agentM12Tests.js';
import * as agentM12TestsPage from '/_102021_/l2/agentMaterializeL1/steps/tests60/agentM12TestsPage.js';
import * as agentM12UsecaseUnit from '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12UsecaseUnit.js';
import * as agentM12Usecases from '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12Usecases.js';
import * as agentM12WorkflowUnit from '/_102021_/l2/agentMaterializeL1/steps/workflows45/agentM12WorkflowUnit.js';
import * as agentM12Workflows from '/_102021_/l2/agentMaterializeL1/steps/workflows45/agentM12Workflows.js';
import * as agentDefsL1 from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { createRecordedLlm, fileRecordedLlmStore } from '/_102035_/l2/solution/testing/recordedLlm.js';
import { createStudioModel, installStudioCompile } from './studioCompileHost.js';
import { installAgentResources, installProjectFile, installProjectIndexDefs } from './agentResources.js';
import { runUntilDone } from './hostSimulado.js';
import { setModuleRoot } from '/_102035_/l2/solution/fs.js';
import { installMlsStub } from '../../../test/mlsStub.js';

import { FIXTURE, MODULE, PROJECT, installTarefasOn, runReal } from './tarefasStor.js';

function installTarefas() {
  installMlsStub({ actualProject: PROJECT });
  return installTarefasOn();
}

void test('tarefas, rule only: the fixture is the generated module and the accepted effort', () => {
  const stor = installTarefas();
  try {
    const texts = stor.texts();
    assert.equal(Object.keys(texts).filter(path => path.startsWith('l4/tarefas/')).length, 53 + 1, 'l4: 53 files and the accepted effort');
    assert.equal(Object.keys(texts).filter(path => path.startsWith('l1/tarefas/')).length, 252);
    for (const path of ['l4/tarefas/pool/l2/web/menu.json', 'l4/tarefas/pool/l2/web/backend.json', 'l4/tarefas/pool/l2/web/effort.json', 'l4/tarefas/pool/l1/web/needs.json']) {
      assert.ok(texts[path], `${path} is one of the four files the initial generation leaves`);
    }
    assert.match(texts['l4/tarefas/rules.defs.ts'], /"nomeListaUnico"/u);
  } finally { stor.restore(); }
});

void test('tarefas, rule only: the REAL agentNewReleaseL1 runs postprocess and prepare and finishes done', async () => {
  const stor = installTarefas();
  try {
    const text = await runReal(`@@agentNewReleaseL1 ${MODULE}`);
    assert.match(text, /^done: /u, text.slice(0, 400));
    assert.ok(stor.texts()['l4/tarefas/pool/l1/web/postprocess.json'], 'the postprocess record is written');
    const after = Object.keys(stor.texts());
    assert.ok(after.some(path => path.startsWith('l1/tarefas_old/')), 'prepare moved l1/tarefas aside');
    assert.equal(after.some(path => path.startsWith('l1/tarefas/')), false, 'prepare left no file at l1/tarefas');
  } finally { stor.restore(); }
});

void test('tarefas, rule only: after prepare, /compare says there is no creation run to compare yet', async () => {
  const stor = installTarefas();
  try {
    assert.match(await runReal(`@@agentNewReleaseL1 ${MODULE}`), /^done: /u);
    const text = await runReal(`@@agentNewReleaseL1 ${MODULE} /compare`);
    // The creation run (agentDefsL1 /run) has not happened, so there is no generator report: the refusal says so.
    assert.match(text, /^(failed|refused): .*(report|run)/iu, text.slice(0, 300));
  } finally { stor.restore(); }
});

/** The files the creation run reads by Studio path: the agent's own prompts and the MDM files of the engine project. */
async function installCreationRunResources(): Promise<void> {
  await installAgentResources(102021, 'agentDefsL1');
  await installProjectFile(102034, 1, 'mdm/defs', 'platformDetailKeys', '.ts');
  for (const name of ['mdm', 'tdm', 'ddm']) await installProjectFile(102034, 4, 'ontology', name, '.defs.ts');
}

async function creationRun(llm: ReturnType<typeof createRecordedLlm>) {
  assert.match(await runReal(`@@agentNewReleaseL1 ${MODULE}`), /^done: /u);
  await installCreationRunResources();
  const command = `@@agentDefsL1 ${MODULE} /run`;
  const context = { message: { threadId: 'thread-ensaio', senderId: 'ensaio', content: command, createAt: 'm1', orderAt: '' }, isTest: true } as mls.msg.ExecutionContext;
  return { context, run: () => runUntilDone(agentDefsL1, context, {}, [], llm) };
}

void test('tarefas, rule only: agentDefsL1 /run reaches its first model call in replay and names the recording that is missing, without calling the model', async () => {
  const stor = installTarefas();
  try {
    const llm = createRecordedLlm({ mode: 'replay', store: { read: () => null, write: () => { throw new Error('replay does not record'); } } });
    const { run } = await creationRun(llm);
    await assert.rejects(run(), /^Error: recordedLlm\.missing:agentDefsL1\/resolve25-fanout-item\/[0-9a-f]{16}$/u);
  } finally { stor.restore(); }
});

void test('tarefas, rule only: the fan-out host runs the whole agentDefsL1 /run graph to done with a stand-in model (no real call)', async () => {
  const stor = installTarefas();
  try {
    const asked: string[] = [];
    const saved = new Map<string, string>();
    const llm = createRecordedLlm({
      mode: 'record',
      call: async request => { asked.push(request.humanPrompt.slice(0, 40)); return '{}'; },
      store: { read: key => saved.get(key) ?? null, write: (key, raw) => { saved.set(key, raw); } },
    });
    const { context, run } = await creationRun(llm);
    const result = await run();
    assert.equal(context.task?.status, 'done');
    for (const plan of ['entry10', 'input20', 'resolve25', 'persistence40', 'usecases50', 'controllers60', 'support70', 'finalize80']) {
      assert.ok(result.executedPlans.includes(plan), `${plan} ran`);
    }
    assert.ok(result.executedPlans.some(plan => /^resolve25-worker-/u.test(plan)), 'the fan-out made one worker per unit');
    assert.ok(asked.length > 0 && [...saved.keys()].every(key => key.startsWith('agentDefsL1/')), 'every model call of the run was recorded by agent/step/hash');
  } finally { stor.restore(); }
});

/** The answers of the real model for the rule-only change, recorded by `collabmsg send --record-dir` on 04/11. */
const RECORDED = new URL('recorded/soRegra', FIXTURE).pathname;

/** The replay model on the recorded answers. Every fallback match goes to the diagnostics of the test, with the key that was asked. */
function recordedReplay(log: (line: string) => void) {
  const missing: string[] = [];
  const used: string[] = [];
  const files = fileRecordedLlmStore(RECORDED, use => { used.push(use.kind); log(`recordedLlm fallback ${use.kind}: ${use.key} -> ${use.file.slice(RECORDED.length + 1)}`); });
  const llm = createRecordedLlm({ mode: 'replay', store: { read: (key, request) => { const raw = files.read(key, request); if (raw === null) missing.push(key); return raw; }, write: () => { throw new Error('replay does not record'); } } });
  return { llm, missing, used };
}

void test('tarefas, rule only: agentDefsL1 /run REPLAYS the recorded answers of the real model to done, with no missing recording', async t => {
  const stor = installTarefas();
  try {
    const { llm, missing, used } = recordedReplay(line => t.diagnostic(line));
    const { context, run } = await creationRun(llm);
    const result = await run();
    assert.deepEqual(missing, [], 'every model request of the run has a recording');
    assert.deepEqual(used, [], 'every recording matched the exact key: no fallback was used');
    assert.equal(context.task?.status, 'done');
    assert.ok(result.executedPlans.some(plan => /^resolve25-worker-/u.test(plan)), 'the fan-out ran');
  } finally { stor.restore(); }
});

void test('tarefas, rule only: the whole L1 chain on the recorded answers: prepare, creation run, /compare and agentMaterializeL1 (the real agents, replay)', async t => {
  const stor = installTarefas();
  try {
    const { llm, missing, used } = recordedReplay(line => t.diagnostic(line));
    const { context, run } = await creationRun(llm);
    await run();
    assert.equal(context.task?.status, 'done', 'agentDefsL1 /run');
    const compared = await runReal(`@@agentNewReleaseL1 ${MODULE} /compare`);
    assert.match(compared, /^done: /u, `/compare: ${compared.slice(0, 300)}`);
    await installAgentResources(102021, 'agentMaterializeL1');
    const command = '@@agentMaterializeL1 ' + JSON.stringify({ scope: MODULE });
    const materialize = { message: { threadId: 'thread-ensaio', senderId: 'ensaio', content: command, createAt: 'm2', orderAt: '' }, isTest: true } as mls.msg.ExecutionContext;
    const result = await runUntilDone(agentMaterializeL1, materialize, {}, [
      agentM12Controllers, agentM12Domain, agentM12Finalize, agentM12Persistence, agentM12Register, agentM12RequestService, agentM12Requests, agentM12SeedRowUnit, agentM12SeedRows, agentM12Tests, agentM12TestsPage, agentM12UsecaseUnit, agentM12Usecases, agentM12WorkflowUnit, agentM12Workflows
    ], llm);
    assert.equal(materialize.task?.status, 'done', 'agentMaterializeL1');
    assert.equal(result.executedPlans.length >= 10, true);
    assert.deepEqual(missing, [], 'every model request of the chain has a recording');
    assert.deepEqual(used, [], 'every recording matched the exact key: no fallback was used');
  } finally { stor.restore(); }
});

void test('tarefas, rule only: the REAL agentMaterializeL1 runs its ten steps in the fan-out host and finishes done, with no model call', async () => {
  const stor = installTarefas();
  try {
    await installAgentResources(102021, 'agentMaterializeL1');
    const asked: string[] = [];
    const llm = createRecordedLlm({ mode: 'record', call: async request => { asked.push(request.humanPrompt.slice(0, 40)); return '{}'; }, store: { read: () => null, write: () => undefined } });
    const command = '@@agentMaterializeL1 ' + JSON.stringify({ scope: MODULE });
    const context = { message: { threadId: 'thread-ensaio', senderId: 'ensaio', content: command, createAt: 'm1', orderAt: '' }, isTest: true } as mls.msg.ExecutionContext;
    const result = await runUntilDone(agentMaterializeL1, context, {}, [
      agentM12Controllers, agentM12Domain, agentM12Finalize, agentM12Persistence, agentM12Register, agentM12RequestService, agentM12Requests, agentM12SeedRowUnit, agentM12SeedRows, agentM12Tests, agentM12TestsPage, agentM12UsecaseUnit, agentM12Usecases, agentM12WorkflowUnit, agentM12Workflows
    ], llm);
    assert.equal(context.task?.status, 'done');
    assert.deepEqual(result.executedPlans.map(plan => plan.replace(`-${MODULE}`, '')),
      ['domain10', 'persistence20', 'seedRows25', 'usecases40', 'workflows45', 'requests50', 'controllers30', 'tests60', 'register70', 'finalize80']);
    assert.deepEqual(asked, [], 'the module is already materialized: nothing asks the model');
  } finally { stor.restore(); }
});

void test('tarefas, rule only: the L2 plan of the REAL effort has the page to materialize; the same effort without the L2 page is "nothing to apply"', () => {
  const effort = JSON.parse(readFileSync(new URL('changeEffortSoRegra.json', FIXTURE), 'utf8')) as { perItem: Array<{ answers: Array<{ master: { kind: string }; materialize: unknown[] }> }>; merged: { materialize: Array<{ project: string }> } };
  const plan = planNewReleaseL2(effort, '102020');
  assert.ok(plan.ok, JSON.stringify(plan));
  assert.deepEqual(plan.ok && { mode: plan.mode, pages: plan.pages }, { mode: 'materialize', pages: ['listas_tarefas'] });
  const l1Only = structuredClone(effort);
  for (const answer of l1Only.perItem[0].answers) if (answer.master.kind === 'l2') answer.materialize = [];
  l1Only.merged.materialize = l1Only.merged.materialize.filter(unit => unit.project !== '102020');
  const refused = planNewReleaseL2(l1Only, '102020');
  assert.deepEqual(refused, { ok: false, reason: 'nothing to apply' });
});

void test('tarefas, rule only: the REAL agentNewReleaseL2 with the real effort runs agentMaterializeL2 for the page on the recorded answers', async t => {
  const stor = installTarefas();
  try {
    installStudioCompile();
    await installAgentResources(102020, 'agentMaterializeL2');
    await installProjectFile(102034, 1, 'mdm/defs', 'ontology', '.ts');
    await installProjectIndexDefs(102040, 2, 'molecules');
    await installProjectIndexDefs(102020, 2, 'aura/molecules/skills', 'usage', '.ts');
    const { llm, missing, used } = recordedReplay(line => t.diagnostic(line));
    const command = `@@agentNewReleaseL2 ${MODULE}`;
    const context = { message: { threadId: 'thread-ensaio', senderId: 'ensaio', content: command, createAt: 'm1', orderAt: '' }, isTest: true } as mls.msg.ExecutionContext;
    const result = await runUntilDone(agentNewReleaseL2, context, {}, [agentMaterializeL2L2, agentM4EntryL2, agentM4FinalizeL2, agentM4InputL2, agentM4PagesL2, agentM4PagesPageL2, agentM4ReviewL2, agentM4ReviewPageL2, agentM4ChainPageL2, agentM4SharedL2, agentM4SharedPageL2], llm);
    const failed = result.steps.flatMap(step => step.status === 'failed' && step.type === 'agent' ? [`${step.planning?.planId}: ${JSON.stringify(step.interaction?.trace).slice(0, 400)}`] : []);
    assert.deepEqual(failed, [], 'no step failed');
    assert.equal(context.task?.status, 'done');
    assert.deepEqual(missing, [], 'every model request has a recording');
    assert.deepEqual(used, [], 'every recording matched the exact key: no fallback was used');
    assert.ok(result.executedPlans.some(plan => /^pages50/u.test(plan)), `the page was materialized: ${result.executedPlans.join(',')}`);
  } finally { stor.restore(); }
});

// An effort that materializes a page makes agentNewReleaseL2 schedule agentDefsL2 and agentMaterializeL2, whose pages50 and bff55
// steps call the model: that is the recorded pass (s3).
