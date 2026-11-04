/// <mls fileReference="_102035_/l2/ensaio/diskBridge.ts" enhancement="_blank" />

/**
 * Bridge between the disk of a project (what `collabmsg` agents read and write) and the in-memory stor of the rehearsal
 * (where the revision libraries of the New Release screen run in node). Not a second harness: the libraries are the ones
 * `nodejsCenario.ts` already runs; this only moves files across.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const MLS_BASE = path.resolve(new URL('../../../', import.meta.url).pathname);

interface MemFile {
  project: number; level: number; folder: string; shortName: string; extension: string;
  status: string; versionRef: string; content: string;
  getContent: () => Promise<string>;
  getValueInfo: () => Promise<{ content: string }>;
}

const keyOf = (file: { project?: number; level?: number; folder?: string; shortName?: string; extension?: string }): string =>
  `${file.project}|${file.level}|${file.folder}|${file.shortName}|${file.extension}`;

/** `shortName` and `extension` the way the Studio splits a file name. */
export function splitName(name: string): { shortName: string; extension: string } {
  for (const extension of ['.defs.ts', '.test.ts', '.ts', '.json', '.txt', '.md']) {
    if (name.endsWith(extension)) return { shortName: name.slice(0, -extension.length), extension };
  }
  throw new Error(`Unknown extension: ${name}`);
}

/** Puts a stor on the current `mls` and loads into it every file under `<root>` of the project (level 4 by default). */
export function installDiskStor(project: number, roots: string[], level = 4): { files: Record<string, MemFile>; loaded: Set<string> } {
  const host = (globalThis as unknown as { mls: { stor: Record<string, unknown> } }).mls;
  const files: Record<string, MemFile> = {};
  const loaded = new Set<string>();
  const add = (lvl: number, folder: string, shortName: string, extension: string, content: string): MemFile => {
    const file: MemFile = {
      project, level: lvl, folder, shortName, extension, status: 'unchanged', versionRef: '1', content,
      getContent() { return Promise.resolve(this.content); },
      getValueInfo() { return Promise.resolve({ content: this.content }); },
    };
    files[keyOf(file)] = file;
    return file;
  };
  const walk = (dir: string, folder: string, lvl: number) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.DS_Store') continue;
      if (entry.isDirectory()) { walk(path.join(dir, entry.name), `${folder}/${entry.name}`, lvl); continue; }
      const { shortName, extension } = splitName(entry.name);
      add(lvl, folder, shortName, extension, readFileSync(path.join(dir, entry.name), 'utf8'));
      loaded.add(keyOf({ project, level: lvl, folder, shortName, extension }));
    }
  };
  for (const root of roots) {
    const dir = path.join(MLS_BASE, `mls-${project}`, `l${level}`, root);
    if (existsSync(dir)) walk(dir, root, level);
  }
  Object.assign(host.stor, {
    files, getKeyToFile: keyOf,
    addOrUpdateFile: async (params: MemFile) => files[keyOf(params)] ?? add(params.level, params.folder, params.shortName, params.extension, ''),
    localStor: {
      setContent: async (file: MemFile, info: { content: string }) => { file.content = info.content; if (file.status === 'unchanged') file.status = 'changed'; },
      deleteFile: async (file: MemFile) => { file.status = 'deleted'; },
      listFolder: (p: number, lvl: number, folder: string) => Object.values(files).filter(f => f.project === p && f.level === lvl && (f.folder === folder || f.folder.startsWith(`${folder}/`))),
    },
  });
  return { files, loaded };
}

/** Writes to the disk every file of the stor that is new or changed, and removes none. Returns the paths written. */
export function writeStorToDisk(files: Record<string, MemFile>, project: number, level: number, onlyUnder: string[]): string[] {
  const written: string[] = [];
  for (const file of Object.values(files)) {
    if (file.status === 'deleted' || file.project !== project || file.level !== level) continue;
    if (!onlyUnder.some(prefix => file.folder === prefix || file.folder.startsWith(`${prefix}/`))) continue;
    const target = path.join(MLS_BASE, `mls-${project}`, `l${level}`, file.folder, `${file.shortName}${file.extension}`);
    if (existsSync(target) && readFileSync(target, 'utf8') === file.content) continue;
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, file.content);
    written.push(path.relative(MLS_BASE, target));
  }
  return written;
}
