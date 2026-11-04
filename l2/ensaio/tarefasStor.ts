/// <mls fileReference="_102035_/l2/ensaio/tarefasStor.ts" enhancement="_blank" />

/** The `tarefas` scenario of the rehearsal: the module generated in full, loaded from the fixture into the in-memory stor, and the real agentNewReleaseL1 run on it. */
import { readdirSync, readFileSync } from 'node:fs';
import { createAgent as createNewReleaseL1 } from '/_102021_/l2/agentNewReleaseL1/agentNewReleaseL1.js';
import { setModuleRoot } from '/_102035_/l2/solution/fs.js';
import { createStudioModel } from './studioCompileHost.js';

export const PROJECT = 102047;
export const MODULE = 'tarefas';
export const FIXTURE = new URL('../newRelease/fixtures/ensaio/tarefas/', import.meta.url);

interface MemFile {
  project: number; level: number; folder: string; shortName: string; extension: string;
  status: string; versionRef: string; content: string;
  getContent: () => Promise<string>;
  getValueInfo: () => Promise<{ content: string }>;
  getOrCreateModel: () => Promise<unknown>;
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

/** Needs `installMlsStub` called before (that file is a test helper: it is imported only by `*.test.ts`). */
export function installTarefasOn(): { files: Record<string, MemFile>; texts: () => Record<string, string>; restore: () => void } {
  const host = (globalThis as unknown as { mls: { stor: Record<string, unknown> } }).mls;
  const files: Record<string, MemFile> = {};
  const add = (level: number, folder: string, shortName: string, extension: string, content: string, project = PROJECT): MemFile => {
    const file: MemFile = {
      project, level, folder, shortName, extension, status: 'unchanged', versionRef: '1', content,
      getContent() { return Promise.resolve(this.content); },
      getValueInfo() { return Promise.resolve({ content: this.content }); },
      getOrCreateModel() { return createStudioModel(this); },
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

