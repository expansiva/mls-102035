/// <mls fileReference="_102035_/l2/ensaio/revisao.test.ts" enhancement="_blank" />

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import NodeModule from 'node:module';
import { installMlsStub } from '../../../test/mlsStub.js';
import * as agentEntry from '/_102035_/l2/agentReviewSolution/agentReviewSolution.js';
import { saveChangeRequest } from '../newRelease/helpers/revisionSelection.js';
import { prepareReviewStartInput } from '../newRelease/helpers/reviewStart.js';
import { readActiveSealedL4Candidate, resolveL4Folders } from '../solution/candidate/moduleRevision.js';
import { candidateRead } from '../solution/candidate/candidateGateway.js';
import { runUntilDone, createMemoryIndexedDb } from './hostSimulado.js';
import { createHubEmMemoria } from './hubEmMemoria.js';
import type { ReviewWorkerClaim } from '../newRelease/helpers/reviewRunWorker.js';

const FIXTURE = new URL('../newRelease/fixtures/ensaio/controleEstoque/', import.meta.url);
const PROJECT = 102047;
const MODULE = 'controleEstoque';

function installStorFixture() {
  installMlsStub({ actualProject: PROJECT });
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

test('recorded review goes through public hooks and publishes only quantidadeMinimaValida', async () => {
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
  try {
    const sources = installStorFixture();
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
    assert.deepEqual(replay.executedPlans, ['entry10', 'review20', 'reconcile30', 'validate40', 'finalize50']);
    const after = await candidateRead({ project: PROJECT, moduleName: MODULE });
    assert.ok(after.pointer);
    assert.equal(after.pointer.revisionNumber, 2);
    assert.equal(after.pointer.source?.revisionId, before.pointer?.revisionId);
    assert.equal(after.pointer.source?.revisionNumber, 1);
    assert.ok(after.result);
    assert.equal(after.result.manifest.status, 'completed');
    assert.equal(after.result.manifest.outputSnapshotHash, after.snapshot.hash);
    assert.deepEqual(after.snapshot.files.map(file => file.path).sort(), [...sources.keys()].sort());
    for (const file of after.snapshot.files) {
      const actual = Buffer.from(file.contentBase64, 'base64').toString('utf8');
      const original = sources.get(file.path)!;
      if (file.path === 'rules.defs.ts') {
        assert.notEqual(actual, original);
        assert.equal(actual, original.replace('A quantidade mínima definida para um produto deve ser maior ou igual a zero.',
          'A quantidade mínima definida para um produto deve ser maior que zero.'));
      } else assert.equal(actual, original, file.path);
    }
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
    assert.equal(progress.status, 'planning');
    assert.deepEqual(progress.candidateResult?.manifest, after.result.manifest);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.mls = priorMls; globalThis.fetch = priorFetch;
    if (priorIndexedDb) Object.defineProperty(globalThis, 'indexedDB', priorIndexedDb);
    else Reflect.deleteProperty(globalThis, 'indexedDB');
    for (const [key, descriptor] of browserDescriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
