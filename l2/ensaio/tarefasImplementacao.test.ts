/// <mls fileReference="_102035_/l2/ensaio/tarefasImplementacao.test.ts" enhancement="_blank" />

/**
 * l4_p4_96, second scenario: the implementation phases on a module generated in full (`tarefas`), after the
 * promotion of an accepted rule-only change. The planners are not run here (that is the `controleEstoque`
 * scenario); the state starts at the accepted effort. Every phase that runs is the REAL agent, no model call.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { createAgent as createNewReleaseL1 } from '/_102021_/l2/agentNewReleaseL1/agentNewReleaseL1.js';
import { setModuleRoot } from '/_102035_/l2/solution/fs.js';
import { installMlsStub } from '../../../test/mlsStub.js';

const PROJECT = 102047;
const MODULE = 'tarefas';
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

function installTarefas(): { files: Record<string, MemFile>; texts: () => Record<string, string>; restore: () => void } {
  installMlsStub({ actualProject: PROJECT });
  const host = (globalThis as unknown as { mls: { stor: Record<string, unknown> } }).mls;
  const files: Record<string, MemFile> = {};
  const add = (level: number, folder: string, shortName: string, extension: string, content: string): MemFile => {
    const file: MemFile = {
      project: PROJECT, level, folder, shortName, extension, status: 'unchanged', versionRef: '1', content,
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
  add(4, `${MODULE}/pool/l4`, 'changeEffort', '.json', readFileSync(new URL('changeEffortSoRegra.json', FIXTURE), 'utf8'));
  Object.assign(host.stor, {
    files, getKeyToFile: keyOf,
    addOrUpdateFile: async (params: MemFile) => files[keyOf(params)] ?? add(params.level, params.folder, params.shortName, params.extension, ''),
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

async function runReal(command: string): Promise<string> {
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

void test('tarefas, rule only: the creation run and the comparison with it', { todo: 'agentDefsL1 /run (resolve25 and usecases50 call the model, with a dynamic fan-out) and agentMaterializeL1 need the full stub and the fan-out host (l4_p4_96 s1); /compare passes only after them' }, () => {
  assert.fail('not exercised');
});
