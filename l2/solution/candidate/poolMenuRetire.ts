/// <mls fileReference="_102035_/l2/solution/candidate/poolMenuRetire.ts" enhancement="_blank" />

import { readSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { L4ImplementationPhase, L4ImplementationRecord } from '/_102035_/l2/solution/candidate/moduleImplementation.js';

export function barrier(condition: unknown, path: string, reason: string): asserts condition {
  if (!condition) throw new Error(`implementation.barrier:${path}:${reason}`);
}
export function initialFile(project: number, path: string, earliest?: number): Ns5FileInfo {
  const slash = path.lastIndexOf('/');
  const info: Ns5FileInfo = { project, level: Number(path[1]), folder: path.slice(3, slash), shortName: path.slice(slash + 1, -5), extension: '.json' };
  const file = mls.stor.files[mls.stor.getKeyToFile(info)];
  barrier(file && file.status !== 'deleted', path, 'missing');
  if (earliest !== undefined) barrier(Number.isFinite(Date.parse(file.updatedAt ?? '')) && Date.parse(file.updatedAt!) >= earliest, path, 'stale');
  return info;
}
function menuPoolFile(project: number, moduleName: string): Ns5FileInfo {
  return { project, level: 4, folder: `${moduleName}/pool/l2/web`, shortName: 'menu', extension: '.json' };
}

/** End of both chains. A missing receipt keeps the pool copy and records why. */
async function poolMenuClosingNote(project: number, moduleName: string, record: L4ImplementationRecord): Promise<string> {
  if (record.initial) {
    const finalizePath = `l2/${moduleName}/pipeline/agentMaterializeL2/finalize70.json`;
    const finalizeInfo = initialFile(project, finalizePath);
    const finalize = JSON.parse(await readSourceText(finalizeInfo)) as { notApproved?: unknown };
    if (!Array.isArray(finalize.notApproved) || finalize.notApproved.length !== 0) return 'menu.json kept: finalize70 not approved';
    const l1Path = `l1/${moduleName}/pipeline/agentMaterializeL1/report.json`;
    const l1 = JSON.parse(await readSourceText(initialFile(project, l1Path))) as { status?: string };
    if (l1.status !== 'complete') return 'menu.json kept: l1 incomplete';
  }
  const info = menuPoolFile(project, moduleName);
  const file = mls.stor.files[mls.stor.getKeyToFile(info)];
  if (!file || file.status === 'deleted') return 'menu.json kept: absent';
  try {
    const { deleteFile } = await import('/_102027_/l2/libStor.js');
    await deleteFile(file);
  } catch (error) {
    console.error('[newRelease] menu.json removal failed', info.folder, error);
    return `menu.json kept: ${error instanceof Error ? error.message : String(error)}`;
  }
  const still = mls.stor.files[mls.stor.getKeyToFile(info)];
  if (still && still.status !== 'deleted') return 'menu.json kept: delete left the file';
  return 'menu.json removed';
}

export async function retirePoolMenu(project: number, moduleName: string, record: L4ImplementationRecord,
  commands: { agent: string; command: string }[], save: (phase: L4ImplementationPhase) => Promise<void>): Promise<void> {
  if (!commands.length || !commands.every((_, index) => record.phases.some(phase => phase.name === `runAgents:${index}` && phase.status === 'done'))) return;
  const last = record.phases.find(phase => phase.name === `runAgents:${commands.length - 1}` && phase.status === 'done');
  if (!last || /(?:^|\n)menu\.json (?:removed|kept:)/u.test(last.report ?? '')) return;
  let note: string;
  try {
    note = await poolMenuClosingNote(project, moduleName, record);
  } catch (error) {
    console.error('[newRelease] menu.json removal failed', moduleName, error);
    note = `menu.json kept: ${error instanceof Error ? error.message : String(error)}`;
  }
  await save({ ...last, report: [last.report, note].filter(Boolean).join('\n') });
}

