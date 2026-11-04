/// <mls fileReference="_102035_/l2/ensaio/studioCompileHost.ts" enhancement="_blank" />

/**
 * The Studio compile surface for the rehearsal, on the `typescript` package of `mls-base` (the one `pnpm typecheck` runs),
 * in place of the Studio compiler that only exists in the browser. It gives `solution/studioCompile.ts` what it asks for:
 * `mls.l2.typescript.compile(model)`, `mls.editor` models and `getOrCreateModel` on the stor files.
 *
 * The root file is the text in the stor model, at its place on disk; every import resolves through the `paths` of
 * `tsconfig.frontend.json`, as in `pnpm typecheck`, so the types of the other projects are the ones on disk.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const MLS_BASE = path.resolve(new URL('../../../', import.meta.url).pathname);

interface ModelSlot {
  project: number; level: number; folder: string; shortName: string; extension: string;
  model: { getValue(): string; setValue(value: string): void };
  compilerResults: { errors?: ts.Diagnostic[]; prodDTS?: string; modelNeedCompile?: boolean };
}

interface StudioFile {
  project: number; level: number; folder: string; shortName: string; extension: string; content: string;
}

const keyOfModel = (project: number, shortName: string, folder: string, level: number): string => `${project}|${level}|${folder}|${shortName}`;

let compilerOptions: ts.CompilerOptions | undefined;
function options(): ts.CompilerOptions {
  if (compilerOptions) return compilerOptions;
  const file = path.join(MLS_BASE, 'tsconfig.frontend.json');
  const read = ts.readConfigFile(file, ts.sys.readFile);
  if (read.error) throw new Error(`tsconfig.frontend.json: ${ts.flattenDiagnosticMessageText(read.error.messageText, '\n')}`);
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, MLS_BASE, undefined, file);
  compilerOptions = { ...parsed.options, noEmit: false, declaration: true, emitDeclarationOnly: true, noEmitOnError: false, outDir: undefined, incremental: false };
  return compilerOptions;
}

const sourceFiles = new Map<string, ts.SourceFile>();

function diskPathOf(slot: ModelSlot): string {
  return path.join(MLS_BASE, `mls-${slot.project}`, `l${slot.level}`, slot.folder, `${slot.shortName}${slot.extension}`);
}

async function compile(slot: ModelSlot): Promise<void> {
  const opts = options();
  const root = diskPathOf(slot);
  const text = slot.model.getValue();
  const host = ts.createCompilerHost(opts);
  const baseGet = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    if (path.resolve(fileName) === root) return ts.createSourceFile(fileName, text, languageVersion, true);
    const key = path.resolve(fileName);
    const cached = sourceFiles.get(key);
    if (cached) return cached;
    const created = baseGet(fileName, languageVersion, onError, shouldCreate);
    if (created) sourceFiles.set(key, created);
    return created;
  };
  const baseRead = host.readFile.bind(host);
  host.readFile = fileName => path.resolve(fileName) === root ? text : baseRead(fileName);
  const baseExists = host.fileExists.bind(host);
  host.fileExists = fileName => path.resolve(fileName) === root || baseExists(fileName);
  const ambient = ['types/mls.d.ts', 'types/monaco.d.ts'].map(file => path.join(MLS_BASE, file));
  const program = ts.createProgram([root, ...ambient], opts, host);
  const sourceFile = program.getSourceFile(root);
  if (!sourceFile) throw new Error(`The rehearsal compiler did not load ${root}`);
  const errors = [...program.getSyntacticDiagnostics(sourceFile), ...program.getSemanticDiagnostics(sourceFile)];
  let declaration = '';
  program.emit(sourceFile, (name, data) => { if (name.endsWith('.d.ts')) declaration = data; }, undefined, true);
  slot.compilerResults.errors = errors;
  slot.compilerResults.prodDTS = declaration;
  slot.compilerResults.modelNeedCompile = false;
}

/** What `mls.stor.files[...].getOrCreateModel()` gives the Studio: the model of the file, created once. */
export async function createStudioModel(file: StudioFile): Promise<ModelSlot> {
  const mlsHost = (globalThis as unknown as { mls: { editor: { models: Record<string, { ts?: ModelSlot; test?: ModelSlot }> } } }).mls;
  const key = keyOfModel(file.project, file.shortName, file.folder, file.level);
  const slotName = file.extension === '.test.ts' ? 'test' : 'ts';
  const entry = mlsHost.editor.models[key] ??= {};
  entry[slotName] ??= {
    project: file.project, level: file.level, folder: file.folder, shortName: file.shortName, extension: file.extension,
    model: { getValue: () => file.content, setValue: value => { file.content = value; } },
    compilerResults: {},
  };
  return entry[slotName]!;
}

/**
 * Puts the Studio compile surface on the current `mls`. Call after the stor and before the agent runs.
 * A file of another project that the stor does not hold (the types a page imports) is read from its place on disk, once,
 * when the compile asks for it: the Studio has every project loaded, and so does `mls-base`.
 */
export function installStudioCompile(): void {
  const host = (globalThis as unknown as { mls: { stor: { files: Record<string, unknown> } } & Record<string, unknown> }).mls;
  host.l2 = { typescript: { compile } };
  host.editor = { models: {}, getKeyModel: keyOfModel, deleteModels: () => undefined };
  const held = host.stor.files;
  host.stor.files = new Proxy(held, {
    get(target, key) {
      if (typeof key !== 'string' || key in target) return Reflect.get(target, key);
      const [project, level, folder, shortName, extension] = key.split('|');
      if (!extension || !/^\d+$/u.test(project)) return undefined;
      let content: string;
      try { content = readFileSync(path.join(MLS_BASE, `mls-${project}`, `l${level}`, folder, `${shortName}${extension}`), 'utf8'); } catch { return undefined; }
      const file = {
        project: Number(project), level: Number(level), folder, shortName, extension, content, status: 'unchanged', versionRef: '1',
        getContent: () => Promise.resolve(file.content),
        getValueInfo: () => Promise.resolve({ content: file.content }),
        getOrCreateModel: () => createStudioModel(file),
      };
      target[key] = file;
      return file;
    },
  });
}
