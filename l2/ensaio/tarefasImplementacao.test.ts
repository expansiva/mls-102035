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
import { createRecordedLlm } from '/_102035_/l2/solution/testing/recordedLlm.js';
import { installAgentResources, installProjectFile } from './agentResources.js';
import { runUntilDone } from './hostSimulado.js';
import { createAgent as createNewReleaseL1 } from '/_102021_/l2/agentNewReleaseL1/agentNewReleaseL1.js';
import { setModuleRoot } from '/_102035_/l2/solution/fs.js';
import { installMlsStub } from '../../../test/mlsStub.js';

const PROJECT = 102047;
export const MODULE = 'tarefas';
const FIXTURE = new URL('../newRelease/fixtures/ensaio/tarefas/', import.meta.url);

interface MemFile {
  project: number; level: number; folder: string; shortName: string; extension: string;
  status: string; versionRef: string; content: string;
  getContent: () => Promise<string>;
  getValueInfo: () => Promise<{ content: string }>;
}

const keyOf = (file: { project?: number; level?: number; folder?: string; shortName?: string; extension?: string }): string =>
  `${file.project}|${file.level}|${file.folder}|${file.shortName}|${file.extension}`;

/** `shortName` and `extension` the way the Studio splits a file name: `.defs.ts` and `.test.ts` are one extension. */
function split(name: string): { shortName: string; extension: string } {
  for (const extension of ['.defs.ts', '.test.ts', '.ts', '.json', '.txt', '.md']) {
    if (name.endsWith(extension)) return { shortName: name.slice(0, -extension.length), extension };
  }
  throw new Error(`Unknown extension in the fixture: ${name}`);
}

export function installTarefas(): { files: Record<string, MemFile>; texts: () => Record<string, string>; restore: () => void } {
  installMlsStub({ actualProject: PROJECT });
  const host = (globalThis as unknown as { mls: { stor: Record<string, unknown> } }).mls;
  const files: Record<string, MemFile> = {};
  const add = (level: number, folder: string, shortName: string, extension: string, content: string, project = PROJECT): MemFile => {
    const file: MemFile = {
      project, level, folder, shortName, extension, status: 'unchanged', versionRef: '1', content,
      getContent() { return Promise.resolve(this.content); },
      getValueInfo() { return Promise.resolve({ content: this.content }); },
    };
    files[keyOf(file)] = file;
    return file;
  };
  const load = (dir: URL, level: number, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) load(new URL(`${entry.name}/`, dir), level, `${prefix}/${entry.name}`);
      else {
        const { shortName, extension } = split(entry.name);
        add(level, prefix, shortName, extension, readFileSync(new URL(entry.name, dir), 'utf8'));
      }
    }
  };
  load(new URL('l4/', FIXTURE), 4, MODULE);
  load(new URL('l1/', FIXTURE), 1, MODULE);
  load(new URL('l2/', FIXTURE), 2, MODULE);
  add(4, `${MODULE}/pool/l4`, 'changeEffort', '.json', readFileSync(new URL('changeEffortSoRegra.json', FIXTURE), 'utf8'));
  Object.assign(host.stor, {
    files, getKeyToFile: keyOf,
    addOrUpdateFile: async (params: MemFile) => files[keyOf(params)] ?? add(params.level, params.folder, params.shortName, params.extension, '', params.project),
    localStor: {
      setContent: async (file: MemFile, info: { content: string }) => { file.content = info.content; if (file.status === 'unchanged') file.status = 'changed'; },
      deleteFile: async (file: MemFile) => { file.status = 'deleted'; },
      listFolder: () => [],
    },
  });
  const path = (file: MemFile) => `l${file.level}/${file.folder}/${file.shortName}${file.extension}`;
  return {
    files,
    texts: () => Object.fromEntries(Object.values(files).filter(file => file.status !== 'deleted').map(file => [path(file), file.content])),
    restore: () => setModuleRoot(MODULE, null),
  };
}

export async function runReal(command: string): Promise<string> {
  const agent = createNewReleaseL1();
  const meta = { agentName: 'agentNewReleaseL1' } as Parameters<NonNullable<typeof agent.beforePromptImplicit>>[0];
  const context = { message: { threadId: 'thread-ensaio', senderId: 'ensaio', content: command, createAt: 'm1', orderAt: '' }, isTest: true } as mls.msg.ExecutionContext;
  const intents = await agent.beforePromptImplicit!(meta, context, command);
  const step = intents.find(intent => intent.type === 'add-step');
  return step && step.type === 'add-step' && 'result' in step.step ? String(step.step.result) : '';
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
    await assert.rejects(run(), /^Error: recordedLlm\.missing:agentDefsL1\/resolve25-worker-r0\/[0-9a-f]{16}$/u);
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

void test('tarefas, rule only: the REAL agentNewReleaseL2 refuses "nothing to apply" when the accepted effort asks for no L2 work, and calls no model', async () => {
  const stor = installTarefas();
  try {
    const asked: string[] = [];
    const llm = createRecordedLlm({ mode: 'record', call: async request => { asked.push(request.humanPrompt.slice(0, 40)); return '{}'; }, store: { read: () => null, write: () => undefined } });
    const command = `@@agentNewReleaseL2 ${MODULE}`;
    const context = { message: { threadId: 'thread-ensaio', senderId: 'ensaio', content: command, createAt: 'm1', orderAt: '' }, isTest: true } as mls.msg.ExecutionContext;
    const result = await runUntilDone(agentNewReleaseL2, context, {}, [], llm);
    const answer = result.intents.flatMap(intent => intent.type === 'add-message-ai' ? intent.request.inputAI : []).map(item => String(item.content)).join('\n');
    assert.match(answer, /refused: nothing to apply/u);
    assert.deepEqual(asked, []);
  } finally { stor.restore(); }
});

// An effort that materializes a page makes agentNewReleaseL2 schedule agentDefsL2 and agentMaterializeL2, whose pages50 and bff55
// steps call the model: that is the recorded pass (s3).
void test('tarefas, rule only: the comparison of the creation run with the saved copy (/compare)', { todo: 'with a stand-in model the creation run writes no L1 defs, so /compare has nothing to compare: it needs the recorded answers of the real model (s3, by collabmsg --record-dir)' }, () => {
  assert.fail('not exercised');
});
