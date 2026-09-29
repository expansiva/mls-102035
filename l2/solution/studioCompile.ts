/// <mls fileReference="_102035_/l2/solution/studioCompile.ts" enhancement="_blank"/>

// The Studio compile path (`mls.l2.typescript.compile(modelTs)`, errors in `compilerResults.errors`),
// lifted from `mls-102020/l2/agentMaterializeL2/helpers/cfeMaterializeStudio.ts` (p4_20) so the NS5
// (l4 `.defs.ts`) and the M2 (l2 `.ts`) ask the compiler the same question through one helper. The M2
// keeps its own names as thin wrappers; the model registry, the borrow scope and the diagnostic format
// live here, once.

declare const mls: any;

export interface StudioFileInfo {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
}

/**
 * Capability, never host: the Studio compile path needs `mls.l2.typescript.compile` and the
 * `mls.editor` surface `getStudioModel` actually calls. Missing either is `unavailable`, not a
 * clean compile. On the `collabmsg` host `mls.l2.typescript` is a getter that stays `undefined`
 * until the Studio extra-libs are loaded — the same answer.
 */
export function studioCompileAvailable(): boolean {
  const compile = (mls as { l2?: { typescript?: { compile?: unknown } } } | undefined)?.l2?.typescript?.compile;
  return typeof compile === 'function'
    && typeof mls.editor?.getKeyModel === 'function'
    && mls.editor?.models != null;
}

interface BorrowedModel { project: number; shortName: string; folder: string; level: number; }

let activeCompiles = 0;
const pendingRelease: BorrowedModel[] = [];

/**
 * Models the VERIFY/PRELOAD path created, keyed by the editor key so borrowing the same file twice is
 * queued once.
 *
 * A run of a 34-workspace module verifies 34 shared + 102 pages + 34 tests and preloads a contract per
 * item; without a release Monaco reported "potential listener LEAK detected, having 200 listeners
 * already" and the console stopped being usable for diagnosis.
 *
 * Released at a PHASE boundary rather than per item, on purpose: the dependencies a file preloads are
 * the same for its siblings, and disposing them per item would trade the leak for one full recompile
 * each. The queue still honours `activeCompiles` — a model disposed mid-compile of a file that imports
 * it is a FALSE error that burns repair budget.
 */
const borrowedByScope = new Map<string, BorrowedModel>();

/** Mark a compile in flight: releases wait until none is. Pair with `leaveStudioCompile` in a `finally`. */
export function enterStudioCompile(): void {
  activeCompiles++;
}

export function leaveStudioCompile(): void {
  activeCompiles--;
}

/**
 * Release models, once no compile is in flight. `deleteModels` only disposes the model and drops the
 * registry entry; it never touches `mls.stor`, so the file stays intact.
 */
export function releaseBorrowedModels(borrowed: BorrowedModel[]): void {
  pendingRelease.push(...borrowed);
  // Whoever releases a borrow owns it: keep the scope from queuing the same model a second time.
  for (const model of borrowed) {
    try { borrowedByScope.delete(mls.editor.getKeyModel(model.project, model.shortName, model.folder, model.level)); } catch { /* best effort */ }
  }
  if (activeCompiles > 0) return;
  for (const model of pendingRelease.splice(0, pendingRelease.length)) {
    // Signature is (project, shortName, folder, releaseMonacoModel, level) — the boolean comes BEFORE
    // the level. `true` disposes the underlying monaco model, which is what holds the listeners.
    try { mls.editor.deleteModels(model.project, model.shortName, model.folder, true, model.level); } catch { /* best effort */ }
  }
}

/**
 * Queue every model the verify/preload path borrowed since the last call. Returns how many were queued,
 * for the caller's trace — the actual dispose still waits for `activeCompiles === 0`.
 */
export function releaseBorrowedModelScope(): number {
  const borrowed = [...borrowedByScope.values()];
  if (borrowed.length) releaseBorrowedModels(borrowed);
  borrowedByScope.clear();
  return borrowed.length;
}

/** How many borrowed models are waiting for the next scope release (telemetry/tests). */
export function borrowedModelScopeSize(): number {
  return borrowedByScope.size;
}

/**
 * The editor model of a stor file, created on demand. `null` = the file is not in stor (or deleted).
 * A model this call creates is BORROWED (released by `releaseBorrowedModelScope`); one that already
 * existed belongs to a Studio tab and is never disposed.
 */
export async function getStudioModel(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  extension: string,
): Promise<any | null> {
  const editorKey = mls.editor.getKeyModel(project, shortName, folder, level);
  const slot = getModelSlot(extension);
  let modelBase = mls.editor.models[editorKey];
  if (modelBase?.[slot]?.model) {
    // Resident model (open tab, leftover from a previous compile): Monaco compiles against MEMORY,
    // so a hook that only wrote stor would leave this buffer stale. Sync from stor here — the
    // compile owns its inputs. Hooks must not touch mls.editor.
    const key = mls.stor.getKeyToFile({ project, level, folder, shortName, extension });
    const file = (mls.stor.files as Record<string, any>)[key];
    if (file && file.status !== 'deleted') await syncModelFromStor(modelBase[slot], file);
    return modelBase[slot];
  }
  // OWNERSHIP, decided BEFORE getOrCreateModel can create anything: no registry entry at all means the
  // Studio does not have this file open, so a model created below is ours to release.
  const owned = !modelBase;

  const key = mls.stor.getKeyToFile({ project, level, folder, shortName, extension });
  const file = (mls.stor.files as Record<string, any>)[key];
  if (!file || file.status === 'deleted') return null;

  const model = await file.getOrCreateModel?.();
  modelBase = mls.editor.models[editorKey];
  if (owned && modelBase) borrowedByScope.set(editorKey, { project, shortName, folder, level });
  return modelBase?.[slot] ?? model ?? null;
}

/**
 * Compile one stor file through the Studio compiler. `null` = there is no model to compile (the file
 * is not in stor): the caller decides what that means, it is never a clean compile here. Throws what
 * the compiler throws. Call only after `studioCompileAvailable()`.
 */
export async function compileStudioFile(file: StudioFileInfo): Promise<{ errors: string[] } | null> {
  const modelTs = await getStudioModel(file.project, file.level, file.folder, file.shortName, file.extension);
  if (!modelTs?.model) return null;
  if (modelTs.compilerResults) modelTs.compilerResults.modelNeedCompile = true;
  await mls.l2.typescript.compile(modelTs);
  const errors: unknown[] = modelTs.compilerResults?.errors ?? [];
  return { errors: errors.map(formatCompilerDiagnostic) };
}

const MLS_IMPORT_RE = /\bfrom\s+['"]\/_(\d+)_\/l(\d+)\/([^'"]+)\.js['"]/gu;

/**
 * Load the model of every `/_<project>_/l<level>/….js` import of `root`, transitively, BEFORE `root`
 * is compiled: an unloaded import resolves to `any` and `satisfies <Type>` would silently pass.
 * Imports are read from the MODEL text (what the compiler sees), falling back to stor — a file just
 * created may have no remote content yet. A dependency whose `.d.ts` is not there yet is compiled
 * once. Returns what could not be loaded or read — whoever compiles `root` must not call the result
 * clean while that list is not empty.
 */
export async function preloadStudioImports(root: StudioFileInfo): Promise<string[]> {
  const missing: string[] = [];
  const seen = new Set<string>();
  const queue: StudioFileInfo[] = [root];
  while (queue.length) {
    const current = queue.shift()!;
    const source = await readCompiledText(current);
    if (source === null) {
      missing.push(`${mlsPathOf(current)} (source unreadable)`);
      continue;
    }
    for (const match of source.matchAll(MLS_IMPORT_RE)) {
      const rest = match[3];
      const at = rest.lastIndexOf('/');
      const dep: StudioFileInfo = {
        project: Number(match[1]),
        level: Number(match[2]),
        folder: at < 0 ? '' : rest.slice(0, at),
        shortName: at < 0 ? rest : rest.slice(at + 1),
        extension: '.ts',
      };
      const id = mlsPathOf(dep);
      if (seen.has(id)) continue;
      seen.add(id);
      try {
        const modelTs = await getStudioModel(dep.project, dep.level, dep.folder, dep.shortName, dep.extension);
        if (!modelTs?.model) {
          missing.push(id);
          continue;
        }
        if (!modelTs.compilerResults?.prodDTS) {
          if (modelTs.compilerResults) modelTs.compilerResults.modelNeedCompile = true;
          await mls.l2.typescript.compile(modelTs);
        }
      } catch (error) {
        missing.push(`${id} (${formatUnknownError(error)})`);
        continue;
      }
      queue.push(dep);
    }
  }
  return missing;
}

function mlsPathOf(file: StudioFileInfo): string {
  return `_${file.project}_/l${file.level}/${file.folder ? `${file.folder}/` : ''}${file.shortName}${file.extension}`;
}

async function readCompiledText(file: StudioFileInfo): Promise<string | null> {
  try {
    const modelTs = await getStudioModel(file.project, file.level, file.folder, file.shortName, file.extension);
    const text = modelTs?.model?.getValue?.();
    if (typeof text === 'string') return text;
  } catch { /* fall back to stor */ }
  try {
    const entry = (mls.stor.files as Record<string, any>)[mls.stor.getKeyToFile(file)];
    if (!entry || entry.status === 'deleted') return null;
    const content = await entry.getContent?.();
    return typeof content === 'string' ? content : null;
  } catch {
    return null;
  }
}

async function syncModelFromStor(entry: any, file: { getContent?: () => Promise<unknown> }): Promise<void> {
  const textModel = entry?.model && typeof entry.model.getValue === 'function' ? entry.model
    : typeof entry?.getValue === 'function' ? entry
    : null;
  if (!textModel?.getValue || !textModel.setValue) return;
  try {
    const content = await file.getContent?.();
    if (typeof content === 'string' && textModel.getValue() !== content) textModel.setValue(content);
  } catch { /* best effort: compile still runs against whatever is already in the model */ }
}

function getModelSlot(extension: string): 'ts' | 'test' {
  return extension === '.test.ts' ? 'test' : 'ts';
}

export function formatCompilerDiagnostic(error: unknown): string {
  if (typeof error === 'string') return error;
  if (!isRecord(error)) return formatUnknownError(error);

  const code = typeof error.code === 'number' ? `TS${error.code}` : '';
  const file = isRecord(error.file) && typeof error.file.fileName === 'string' ? error.file.fileName : '';
  const position = diagnosticPosition(error);
  const message = flattenMessageText(error.messageText ?? error.message ?? error);
  return [file ? `${file}${position}` : '', code, message].filter(Boolean).join(' - ');
}

function diagnosticPosition(error: Record<string, any>): string {
  const file = error.file;
  if (!isRecord(file) || typeof error.start !== 'number' || typeof file.getLineAndCharacterOfPosition !== 'function') return '';
  try {
    const pos = file.getLineAndCharacterOfPosition(error.start);
    if (!pos || typeof pos.line !== 'number' || typeof pos.character !== 'number') return '';
    return `:${pos.line + 1}:${pos.character + 1}`;
  } catch {
    return '';
  }
}

function flattenMessageText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (isRecord(value)) {
    const head = flattenMessageText(value.messageText ?? '');
    const next = Array.isArray(value.next) ? value.next.map(flattenMessageText).filter(Boolean) : [];
    return [head, ...next].filter(Boolean).join(' ');
  }
  return formatUnknownError(value);
}

export function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try { return JSON.stringify(error); } catch { return String(error); }
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
