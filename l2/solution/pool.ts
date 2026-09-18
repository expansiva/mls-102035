/// <mls fileReference="_102035_/l2/solution/pool.ts" enhancement="_blank"/>

/**
 * Pool of the module — a mailbox per planner (`l4/<module>/pool/{l1,l2,l4}/`).
 * One folder, one owner: only the owner reads and deletes its box. Pending is a file in the
 * folder, so there is no `status` field. Neutral library: no agent, no LLM, no flow.
 * Design: `todo/gerarApp/l4/docs/planners_pool.md`.
 */

import {
  diskFileInfo,
  displayPath,
  hostListFolder,
  moduleFile,
  normalizeModuleName,
  readJson,
  readPipeline,
  writeJson,
  writePipeline,
} from '/_102035_/l2/solution/fs.js';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { PoolBox, PoolMode, PoolOutcome, PoolTraceLine } from '/_102035_/l2/solution/types.js';

export type { PoolBox, PoolMode, PoolOutcome, PoolTraceLine };

export const POOL_BOXES = ['l1', 'l2', 'l4'] as const satisfies readonly PoolBox[];
export const POOL_MODES = ['implement', 'estimate'] as const satisfies readonly PoolMode[];
export const POOL_OUTCOMES = ['delivered', 'processed', 'disputed'] as const satisfies readonly PoolOutcome[];

/** Three rounds per side. At 3/3 without agreement the message is NOT deleted: it becomes a human pending. */
export const POOL_MAX_ROUND = 3;

/** The whole message. Nothing is optional; lists may be empty. */
export interface PoolMessage {
  from: PoolBox;
  to: PoolBox;
  /** `<module>-<yyyymmddhhmmss>` of the message that opened the thread. */
  thread: string;
  /** 1..POOL_MAX_ROUND. */
  round: number;
  mode: PoolMode;
  /** One line. */
  subject: string;
  /** Paths relative to the module folder. */
  artifacts: string[];
  body: string;
}

const POOL_FIELDS = ['from', 'to', 'thread', 'round', 'mode', 'subject', 'artifacts', 'body'] as const;

function refuse(reason: string): never {
  throw new Error(`[pool] ${reason}`);
}

/** `yyyymmddhhmmss` in UTC — the order of the mailbox is the order of the name. */
export function poolStamp(now: Date): string {
  const pad = (value: number, size = 2) => String(value).padStart(size, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`
    + `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

/** Thread id of a message that opens a conversation about `moduleName`. */
export function nextThread(moduleName: string, now: Date): string {
  const module = normalizeModuleName(moduleName);
  if (!module) refuse('nextThread: moduleName is empty');
  return `${module}-${poolStamp(now)}`;
}

function asBox(value: unknown, field: string): PoolBox {
  if (typeof value !== 'string' || !(POOL_BOXES as readonly string[]).includes(value)) {
    refuse(`message.${field} must be one of ${POOL_BOXES.join('|')} — got ${JSON.stringify(value)}`);
  }
  return value as PoolBox;
}

/** Rejects with a named cause; never repairs quietly. */
export function normalizePoolMessage(value: unknown): PoolMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) refuse('message must be a JSON object');
  const raw = value as Record<string, unknown>;
  for (const field of POOL_FIELDS) {
    if (raw[field] === undefined || raw[field] === null) refuse(`message.${field} is missing`);
  }
  const from = asBox(raw.from, 'from');
  const to = asBox(raw.to, 'to');
  if (from === to) refuse(`message.from and message.to are both '${from}' — a box never writes to itself`);

  const thread = typeof raw.thread === 'string' ? raw.thread.trim() : '';
  if (!thread) refuse('message.thread must be a non-empty string');
  if (!/^[A-Za-z0-9]+-\d{14}$/.test(thread)) {
    refuse(`message.thread must be '<module>-<yyyymmddhhmmss>' — got ${JSON.stringify(thread)}`);
  }

  const round = raw.round;
  if (typeof round !== 'number' || !Number.isInteger(round) || round < 1 || round > POOL_MAX_ROUND) {
    refuse(`message.round must be an integer in 1..${POOL_MAX_ROUND} — got ${JSON.stringify(round)}`);
  }

  if (typeof raw.mode !== 'string' || !(POOL_MODES as readonly string[]).includes(raw.mode)) {
    refuse(`message.mode must be one of ${POOL_MODES.join('|')} — got ${JSON.stringify(raw.mode)}`);
  }

  const subject = typeof raw.subject === 'string' ? raw.subject.trim() : '';
  if (!subject) refuse('message.subject must be a non-empty single line');
  if (subject.includes('\n')) refuse('message.subject must be a single line');

  if (!Array.isArray(raw.artifacts)) refuse('message.artifacts must be an array (it may be empty)');
  const artifacts = raw.artifacts.map((entry, index) => {
    if (typeof entry !== 'string' || !entry.trim()) refuse(`message.artifacts[${index}] must be a non-empty string`);
    const path = entry.trim();
    if (path.startsWith('/') || path.includes('..')) {
      refuse(`message.artifacts[${index}] must be relative to the module — got ${JSON.stringify(path)}`);
    }
    return path;
  });

  if (typeof raw.body !== 'string') refuse('message.body must be a string');

  return { from, to, thread, round, mode: raw.mode as PoolMode, subject, artifacts, body: raw.body };
}

/** `l4/<module>/pool/<box>/<shortName>.json`, in the project of the run. */
export function poolFile(moduleName: string, box: PoolBox, shortName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return { project: base.project, level: 4, folder: `${base.folder}/pool/${box}`, shortName, extension: '.json' };
}

/**
 * Writes the message into the box of `msg.to`. `now` is explicit because the file name carries it
 * and the caller — not the clock — decides which moment the message belongs to.
 */
export async function writePoolMessage(moduleName: string, msg: unknown, now: Date): Promise<Ns5FileInfo> {
  const message = normalizePoolMessage(msg);
  const info = poolFile(moduleName, message.to, `${poolStamp(now)}_${message.thread}_${message.round}`);
  await writeJson(info, message);
  return info;
}

/** Oldest first, by name. Index ∪ host disk, so a message written by another process is seen. */
export function listPoolBox(moduleName: string, box: PoolBox): Ns5FileInfo[] {
  const base = moduleFile(moduleName);
  const folder = `${base.folder}/pool/${box}`;
  const files = mls.stor.files as Record<string, mls.stor.IFileInfo | undefined>;
  const found = new Map<string, Ns5FileInfo>();
  for (const file of Object.values(files)) {
    if (!file || file.project !== base.project || Number(file.level) !== 4 || file.status === 'deleted') continue;
    if (String(file.folder || '') !== folder || file.extension !== '.json' || !file.shortName) continue;
    found.set(String(file.shortName), { project: base.project, level: 4, folder, shortName: String(file.shortName), extension: '.json' });
  }
  const listFolder = hostListFolder();
  if (listFolder) {
    for (const info of listFolder(base.project, 4, folder)) {
      if (info.extension !== '.json' || !info.shortName) continue;
      const key = mls.stor.getKeyToFile(info);
      const indexed = files[key];
      if (indexed?.status === 'deleted') continue;
      if (!indexed) files[key] = diskFileInfo(info);
      found.set(String(info.shortName), { project: base.project, level: 4, folder, shortName: String(info.shortName), extension: '.json' });
    }
  }
  return [...found.keys()].sort().map(shortName => found.get(shortName) as Ns5FileInfo);
}

export async function readPoolMessage(file: Ns5FileInfo): Promise<PoolMessage> {
  const raw = await readJson<unknown>(file);
  if (raw === null) refuse(`message not readable: ${displayPath(file)}`);
  return normalizePoolMessage(raw);
}

/** Any non-empty box — this is what blocks a new `tobe/`. */
export function poolHasPending(moduleName: string): boolean {
  return POOL_BOXES.some(box => listPoolBox(moduleName, box).length > 0);
}

function normalizePoolTraceLine(value: unknown): PoolTraceLine {
  if (!value || typeof value !== 'object' || Array.isArray(value)) refuse('trace line must be an object');
  const raw = value as Record<string, unknown>;
  const at = typeof raw.at === 'string' ? raw.at.trim() : '';
  if (!at) refuse('trace.at must be a non-empty ISO timestamp');
  const file = typeof raw.file === 'string' ? raw.file.trim() : '';
  if (!file) refuse('trace.file must be the display path of the message');
  const from = asBox(raw.from, 'from');
  const to = asBox(raw.to, 'to');
  const thread = typeof raw.thread === 'string' ? raw.thread.trim() : '';
  if (!thread) refuse('trace.thread must be a non-empty string');
  const round = raw.round;
  if (typeof round !== 'number' || !Number.isInteger(round) || round < 1 || round > POOL_MAX_ROUND) {
    refuse(`trace.round must be an integer in 1..${POOL_MAX_ROUND} — got ${JSON.stringify(round)}`);
  }
  if (typeof raw.mode !== 'string' || !(POOL_MODES as readonly string[]).includes(raw.mode)) {
    refuse(`trace.mode must be one of ${POOL_MODES.join('|')} — got ${JSON.stringify(raw.mode)}`);
  }
  if (typeof raw.outcome !== 'string' || !(POOL_OUTCOMES as readonly string[]).includes(raw.outcome)) {
    refuse(`trace.outcome must be one of ${POOL_OUTCOMES.join('|')} — got ${JSON.stringify(raw.outcome)}`);
  }
  return { at, file, from, to, thread, round, mode: raw.mode as PoolMode, outcome: raw.outcome as PoolOutcome };
}

/**
 * Appends the line to `pipeline.json` and returns its id — the display path of the message,
 * which is unique per message and is what `deletePoolMessage` demands.
 */
export async function tracePool(moduleName: string, line: unknown): Promise<string> {
  const traceLine = normalizePoolTraceLine(line);
  const state = await readPipeline(moduleName);
  if (!state) refuse(`pipeline.json not found for module '${normalizeModuleName(moduleName)}' — cannot trace`);
  state.pool = [...(state.pool || []), traceLine];
  await writePipeline(state);
  return traceLine.file;
}

/** Reads the trace of the module (empty when the pipeline has none). */
export async function readPoolTrace(moduleName: string): Promise<PoolTraceLine[]> {
  const state = await readPipeline(moduleName);
  return state?.pool ? state.pool.map(normalizePoolTraceLine) : [];
}

/**
 * Last operation of whoever processes a message: only the owner deletes, and only after the
 * trace line is written — `traceId` is the id `tracePool` returned.
 */
export async function deletePoolMessage(moduleName: string, file: Ns5FileInfo, traceId: string): Promise<string> {
  const id = String(traceId || '').trim();
  const path = displayPath(file);
  if (!id) refuse(`refusing to delete ${path}: traceId is empty — trace the message in pipeline.json first`);
  const trace = await readPoolTrace(moduleName);
  if (!trace.some(entry => entry.file === id)) {
    refuse(`refusing to delete ${path}: no trace line '${id}' in pipeline.json`);
  }
  if (id !== path) refuse(`refusing to delete ${path}: traceId '${id}' is another message`);
  const { deleteFile } = await import('/_102027_/l2/libStor.js');
  await deleteFile(diskFileInfo(file));
  return path;
}
