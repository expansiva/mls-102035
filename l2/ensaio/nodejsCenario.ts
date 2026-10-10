/// <mls fileReference="_102035_/l2/ensaio/nodejsCenario.ts" enhancement="_blank" />

import * as plannerL4 from '/_102035_/l2/agentPlannerL4/agentPlannerL4.js';
import * as plannerL2 from '/_102020_/l2/agentPlannerL2/agentPlannerL2.js';
import * as plannerL1 from '/_102021_/l2/agentPlannerL1/agentPlannerL1.js';
import { writeJson } from '../solution/fs.js';
import { implementationPhaseCommand } from '../solution/candidate/moduleImplementation.js';
import type { ImplementationRunnerDependencies } from '../newRelease/helpers/implementationRunner.js';
import type { TaskData } from '/_102036_/l2/shared/interfaces.js';
import NodeModule from 'node:module';
import type { ReviewWorkerClaim } from '../newRelease/helpers/reviewRunWorker.js';
import type { ReviewWorkerProgress } from '../newRelease/helpers/reviewRunWorker.js';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as agentEntry from '/_102035_/l2/agentReviewSolution/agentReviewSolution.js';
import { saveChangeRequest } from '../newRelease/helpers/revisionSelection.js';
import { prepareReviewStartInput } from '../newRelease/helpers/reviewStart.js';
import { readActiveSealedL4Candidate, resolveL4Folders } from '../solution/candidate/moduleRevision.js';
import { candidateRead } from '../solution/candidate/candidateGateway.js';
import { runUntilDone, createMemoryIndexedDb } from './hostSimulado.js';
import { createHubEmMemoria } from './nodejsHubEmMemoria.js';
import { setDescribeEffortImporter } from '/_102035_/l2/solution/effortRegistry.js';

export const FIXTURE = new URL('../newRelease/fixtures/ensaio/controleEstoque/', import.meta.url);
export const PROJECT = 102047;
export const MODULE = 'controleEstoque';

/** Simulated language agent; tasks survive runner recreation. */
export function createSimulatedDefsHost(outcome: 'done' | 'failed' | 'running' = 'done') {
  const dispatched: string[] = [];
  const tasks = new Map<string, TaskData>();
  const pending = new Map<string, () => Promise<void>>();
  const command = '@@agentAddLanguage ' + JSON.stringify([{
    languages: [{ code: 'pt-BR', name: 'pt-BR' }], projectId: PROJECT, moduleName: MODULE,
  }]);
  const expected = implementationPhaseCommand({ agent: 'agentAddLanguage', command }, PROJECT, MODULE);
  let sequence = 0;
  const dependencies: ImplementationRunnerDependencies = {
    userId: () => 'ensaio', thread: async () => ({ threadId: 'thread-defs-ensaio' }),
    context: (threadId, senderId, content) => ({ isTest: true, task: undefined,
      message: { threadId, senderId, content, createAt: `message-${++sequence}`, orderAt: '' } }),
    execute: async (name, context) => {
      assert.equal(name, expected.agent);
      assert.equal(context.message.content, expected.command);
      dispatched.push(context.message.content);
      const id = `defs-${dispatched.length}`;
      const status = outcome;
      const task: TaskData = { PK: `task/#${id}`, SK: 'metadata', title: name, owner: 'ensaio', team: null,
        status: status === 'running' ? 'in progress' : status, last_updated: 0,
        last_update_log: status === 'failed' ? 'Simulated language failure' : null,
        messageid_created: `${context.message.threadId}/${context.message.createAt}` };
      tasks.set(id, task);
      if (status === 'running') pending.set(id, async () => {});
      context.task = task;
    },
    task: async (_user, id, messageId) => {
      const task = tasks.get(id);
      assert.ok(task, `Unknown simulated task ${id}`);
      assert.equal(messageId, task.messageid_created);
      return structuredClone(task);
    },
    message: async () => null,
  };
  return { dependencies, dispatched, command, async complete(id: string) {
    const write = pending.get(id);
    assert.ok(write, `No pending simulated task ${id}`);
    await write();
    tasks.get(id)!.status = 'done';
    pending.delete(id);
  } };
}

function installStorFixture() {
  const files: Record<string, any> = {};
  const contents = new Map<string, string>();
  const sources = new Map<string, string>();
  const keyOf = (info: any) => `${info.project}:${info.level}:${info.folder || ''}:${info.shortName}${info.extension}`;
  const add = (info: any, source = '') => {
    const key = keyOf(info);
    contents.set(key, source);
    return files[key] = {
      ...info, status: 'unchanged', versionRef: '1',
      getContent: async () => contents.get(key) || '',
      getValueInfo: async () => ({ content: contents.get(key) || '' }),
    };
  };
  function load(folder: URL, prefix = '') {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = `${prefix}${entry.name}`;
      if (entry.isDirectory()) load(new URL(`${entry.name}/`, folder), `${path}/`);
      else {
        const source = readFileSync(new URL(entry.name, folder), 'utf8');
        const extension = entry.name.endsWith('.defs.ts') ? '.defs.ts' : '.json';
        const slash = path.lastIndexOf('/');
        add({ project: PROJECT, level: 4, folder: `${MODULE}${slash < 0 ? '' : `/${path.slice(0, slash)}`}`,
          shortName: entry.name.slice(0, -extension.length), extension }, source);
        if (extension === '.defs.ts') sources.set(path, source);
      }
    }
  }
  load(new URL('l4/', FIXTURE));
  for (const [folder, shortName, extension] of [
    ['agentReviewSolution/steps/review20', 'prompt', '.md'],
    ['agentReviewSolution/schemas', 'review20.schema', '.json'],
  ]) {
    add({ project: 102035, level: 2, folder, shortName, extension },
      readFileSync(new URL(`../${folder}/${shortName}${extension}`, import.meta.url), 'utf8'));
  }
  Object.assign(mls, {
    stor: { files, getKeyToFile: keyOf, addOrUpdateFile: async (info: any) => add(info),
      localStor: {
        setContent: async (file: any, value: { content: string }) => {
          contents.set(keyOf(file), value.content); files[keyOf(file)] = file; file.status = 'changed';
        },
        listFolder: (project: number, level: number, folder: string) => Object.values(files).filter(file =>
          file.project === project && file.level === level && (file.folder === folder || file.folder.startsWith(`${folder}/`))),
        deleteFile: async (file: any) => { delete files[keyOf(file)]; contents.delete(keyOf(file)); },
      },
    },
    editor: { models: {}, getKeyModel: () => '' },
    candidateIO: createHubEmMemoria(),
  });
  return sources;
}

/** How's frozen agendaClinica defs, on the in-memory stor. Same trees the master tests read. */
export async function installAgendaClinicaEffortFixture(project = PROJECT): Promise<void> {
  const l2 = new URL('../../../mls-102020/l2/helpers/effort/fixtures/agendaClinica/contracts/', import.meta.url);
  for (const name of readdirSync(l2)) {
    if (!name.endsWith('.defs.txt')) continue;
    const file = await mls.stor.addOrUpdateFile({
      project, level: 2, folder: 'agendaClinica/web/contracts',
      shortName: name.slice(0, -'.defs.txt'.length), extension: '.defs.ts', versionRef: '1',
    });
    assert.ok(file, name);
    await mls.stor.localStor.setContent(file, { content: readFileSync(new URL(name, l2), 'utf8') });
  }
  const l1 = new URL('../../../mls-102021/l2/helpers/effort/fixtures/agendaClinica/', import.meta.url);
  const walk = async (folder: URL, prefix: string) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        await walk(new URL(`${entry.name}/`, folder), `${prefix}${entry.name}/`);
        continue;
      }
      if (!entry.name.endsWith('.defs.txt')) continue;
      const slash = prefix.lastIndexOf('/');
      const file = await mls.stor.addOrUpdateFile({
        project, level: 1,
        folder: `agendaClinica${slash < 0 ? '' : `/${prefix.slice(0, slash)}`}`,
        shortName: entry.name.slice(0, -'.defs.txt'.length), extension: '.defs.ts', versionRef: '1',
      });
      assert.ok(file, `${prefix}${entry.name}`);
      await mls.stor.localStor.setContent(file, { content: readFileSync(new URL(entry.name, folder), 'utf8') });
    }
  };
  await walk(l1, '');
}

/** The rehearsal has no master unless a case installs the real importer. */
const noMasterImporter = async () => {
  throw new Error('no master in ensaio');
};

export async function withReviewScenario(installStub: () => void, run: (scenario: { sources: Map<string, string>; selection: Awaited<ReturnType<typeof saveChangeRequest>>; prepared: Awaited<ReturnType<typeof prepareReviewStartInput>>; before: Awaited<ReturnType<typeof candidateRead>>; command: string; context: mls.msg.ExecutionContext; replay: Awaited<ReturnType<typeof runUntilDone>>; fetchCalls: () => number; progress: ReviewWorkerProgress }) => Promise<void>, prepareSources?: (sources: Map<string, string>) => void) {
  const priorMls = globalThis.mls;
  const priorFetch = globalThis.fetch;
  const browserKeys = ['document', 'window', 'customElements', 'HTMLElement'] as const;
  const browserDescriptors = browserKeys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  Object.assign(globalThis, {
    document: { documentElement: { lang: 'en' },
      createTreeWalker: () => ({ nextNode: () => null, currentNode: null }),
      createElement: (tag: string) => ({ tagName: tag.toUpperCase(), textContent: '' }),
      createComment: () => ({}), head: { querySelector: () => null, appendChild: () => undefined } },
    window: globalThis, customElements: { define() {}, get() {} }, HTMLElement: class {},
  });
  const priorIndexedDb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: createMemoryIndexedDb() });
  let fetchCalls = 0;
  const fetchImpl: typeof fetch = async () => { fetchCalls++; throw new Error('Network forbidden in replay'); };
  globalThis.fetch = fetchImpl;
  setDescribeEffortImporter(noMasterImporter);
  try {
    installStub();
    const sources = installStorFixture();
    if (prepareSources) {
      prepareSources(sources);
      for (const [path, content] of sources) {
        const file = Object.values(mls.stor.files).find(file => file.project === PROJECT
          && `${file.folder}/${file.shortName}${file.extension}` === `${MODULE}/${path}`);
        assert.ok(file, `Missing replay source ${path}`);
        await mls.stor.localStor.setContent(file, { content });
      }
    }
    const request = readFileSync(new URL('request.txt', FIXTURE), 'utf8').trim();
    const selection = await saveChangeRequest(PROJECT, MODULE, request, null, null);
    const loaded = await readActiveSealedL4Candidate(PROJECT, MODULE);
    assert.ok(loaded);
    const prepared = await prepareReviewStartInput({
      project: PROJECT, moduleName: MODULE, ...selection, request, userId: 'ensaio', loaded,
    });
    const before = await candidateRead({ project: PROJECT, moduleName: MODULE });
    assert.equal(before.pointer?.revisionNumber, 1);
    const { originalL4Path, temporaryL4Path } = resolveL4Folders(PROJECT, MODULE, prepared.input.baseId);
    const command = `@@agentReviewSolution ${JSON.stringify({
      moduleName: MODULE,
      originalL4Path, temporaryL4Path,
      request, expectedRevisionId: selection.revisionId,
    })}`;
    const context: mls.msg.ExecutionContext = {
      message: { threadId: 'thread-ensaio', orderAt: '20261007000000.1000', createAt: '20261007000000',
        senderId: 'ensaio', content: command }, task: undefined, isTest: true,
    };
    const answer = JSON.parse(readFileSync(new URL('answers/review20.json', FIXTURE), 'utf8'));
    const replay = await runUntilDone(agentEntry, context, { review20: answer });
    // The worker's statistics module also registers UI decorators. This replay has no LLM usage;
    // isolate that UI-only dependency just as the neighboring Studio worker test does.
    const loader = NodeModule as unknown as { _load: (request: string, ...args: unknown[]) => unknown };
    const previousLoad = loader._load;
    let workerModule: typeof import('../newRelease/helpers/reviewRunStudioWorker.js');
    try {
      loader._load = function (request, ...args) {
        if (request.includes('collabMessagesTaskInfo')) {
          return { buildTaskStatistics: () => ({ models: [], fallbackCount: 0, errors: [] }) };
        }
        return previousLoad.call(this, request, ...args);
      };
      workerModule = await import('../newRelease/helpers/reviewRunStudioWorker.js');
    } finally { loader._load = previousLoad; }
    const { createReviewStudioHost } = workerModule;
    const storage = new Map<string, string>();
    const execution = {
      agentName: 'agentReviewSolution', taskId: 'ensaio', threadId: context.message.threadId,
      status: 'completed' as const, attempt: 1, provider: null, model: null, resultRunId: null,
      candidateRevisionId: null, startedAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T00:00:00.000Z',
    };
    const claim: ReviewWorkerClaim = {
      runId: 'run-ensaio', project: PROJECT, moduleName: MODULE, changeId: selection.changeId,
      phase: 'review', attempt: 1, claimId: 'claim-ensaio', workerId: 'worker-ensaio', command,
      commandHash: 'sha256:command', canonicalSnapshotHash: prepared.input.inputSnapshotHash,
      claimedAt: '2026-10-07T00:00:00.000Z', leaseExpiresAt: '2026-10-07T00:05:00.000Z', execution,
    };
    const worker = createReviewStudioHost({
      storage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); } },
      userId: () => 'ensaio', task: async () => context.task!,
      message: async () => context.message, findMessage: async () => context.message,
    });
    const progress = await worker.observe(claim, execution);
    assert.ok(progress);
    await run({ sources, selection, prepared, before, command, context, replay, progress, fetchCalls: () => fetchCalls });
  } finally {
    setDescribeEffortImporter(undefined);
    globalThis.mls = priorMls; globalThis.fetch = priorFetch;
    if (priorIndexedDb) Object.defineProperty(globalThis, 'indexedDB', priorIndexedDb);
    else Reflect.deleteProperty(globalThis, 'indexedDB');
    for (const [key, descriptor] of browserDescriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

export async function runPlannerScenario(context: mls.msg.ExecutionContext) {
  await writeJson({ project: 102047, level: 5, folder: '', shortName: 'config', extension: '.json' }, { workspaceDependencies: ['102047', '102020', '102035', '102021'], projects: { '102020': { root: '../mls-102020', type: 'lib' }, '102021': { root: '../mls-102021', type: 'lib' } } });
  for (const [project, path] of [
    [102020, 'agentPlannerL2/agentPlannerL2.ts'],
    [102021, 'agentPlannerL1/agentPlannerL1.ts'],
    [102020, 'agentPlannerL2/skills/menu.md'],
    [102020, 'agentPlannerL2/steps/menu20/prompt.md'],
    [102020, 'agentPlannerL2/schemas/menu.schema.json'],
  ] as const) {
    const slash = path.lastIndexOf('/');
    const dot = path.lastIndexOf('.');
    const file = await mls.stor.addOrUpdateFile({ project, level: 2, folder: path.slice(0, slash),
      shortName: path.slice(slash + 1, dot), extension: path.slice(dot) } as mls.stor.IFileInfo);
    assert.ok(file, `Failed to install planner resource ${project}/${path}`);
    await mls.stor.localStor.setContent(file, { content: readFileSync(new URL(`../../../mls-${project}/l2/${path}`, import.meta.url), 'utf8') });
  }
  const reviewed = await candidateRead({ project: 102047, moduleName: MODULE });
  assert.ok(reviewed.pointer);
  const candidate = `${MODULE}/pipeline/changes/${reviewed.pointer.changeId}/revisions/${reviewed.pointer.revisionId}/l4`;
  const command = `@@agentPlannerL4 ${MODULE} /candidate ${candidate}`;
  const menu = JSON.parse(readFileSync(new URL('answers/menu20/menu-1.json', FIXTURE), 'utf8')).raw;
  const plan = JSON.parse(readFileSync(new URL('answers/plan20/plan-1.json', FIXTURE), 'utf8'));
  const plannerContext: mls.msg.ExecutionContext = { ...context, task: undefined, message: { ...context.message, content: command } };
  const replay = await runUntilDone(plannerL4, plannerContext, { menu20: menu, plan20: plan }, [plannerL2, plannerL1]);
  return { reviewed, candidate, command, replay, context: plannerContext };
}
