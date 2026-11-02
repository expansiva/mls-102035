/// <mls fileReference="_102035_/l2/newRelease/helpers/changeOrigins.ts" enhancement="_blank" />

import { readJson, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { tobeDiff } from '/_102035_/l2/solution/candidate/tobeDiff.js';

export interface ChangeOrigin {
  source: 'prompt' | 'manual';
  at: string;
  request?: string;
  taskId?: string;
  changes: Array<{ file: string; jsonPath: string }>;
}

type StoredOperation = { info: Ns5FileInfo; value: ChangeOrigin };

function operationFiles(project: number, moduleName: string): Ns5FileInfo[] {
  const folder = `${moduleName}/tobe/operations`;
  return Object.values(mls.stor.files)
    .filter(file => !!file && file.project === project && file.level === 4 && file.folder === folder
      && file.extension === '.json' && file.status !== 'deleted')
    .map(file => ({ project, level: 4, folder, shortName: file.shortName, extension: '.json' }));
}

async function storedOperations(project: number, moduleName: string): Promise<StoredOperation[]> {
  const rows = await Promise.all(operationFiles(project, moduleName).map(async info => {
    try { return { info, value: await readJson<ChangeOrigin>(info) }; }
    catch (error) {
      console.error('[newRelease] change origin could not be read', { project, moduleName, shortName: info.shortName, error });
      return { info, value: null };
    }
  }));
  return rows.filter((row): row is StoredOperation => !!row.value && ['prompt', 'manual'].includes(row.value.source)
    && typeof row.value.at === 'string' && Array.isArray(row.value.changes)
    && row.value.changes.every(change => !!change && typeof change.file === 'string' && typeof change.jsonPath === 'string'))
    .sort((a, b) => a.value.at.localeCompare(b.value.at) || a.info.shortName.localeCompare(b.info.shortName));
}

export async function readChangeOrigins(project: number, moduleName: string): Promise<ChangeOrigin[]> {
  return (await storedOperations(project, moduleName)).map(row => row.value);
}

/** The last operation on the exact structural path owns the visible diff. */
export function originForChange(operations: readonly ChangeOrigin[], file: string, jsonPath: string): { operation: ChangeOrigin; earlier: number } | null {
  const touched = operations.filter(operation => operation.changes.some(change => change.file === file && change.jsonPath === jsonPath))
    .sort((a, b) => a.at.localeCompare(b.at));
  return touched.length ? { operation: touched[touched.length - 1], earlier: touched.length - 1 } : null;
}

export async function recordManualChangeOrigin(project: number, moduleName: string, file: string, before: unknown, after: unknown, at = new Date()): Promise<void> {
  const changes = tobeDiff(before, after).map(diff => ({ file, jsonPath: diff.jsonPath }));
  if (!changes.length) return;
  const stamp = at.toISOString().replace(/[-:.TZ]/gu, '') + '-' + crypto.randomUUID();
  await writeJson({ project, level: 4, folder: `${moduleName}/tobe/operations`, shortName: stamp, extension: '.json' },
    { source: 'manual', at: at.toISOString(), changes } satisfies ChangeOrigin);
}

export async function clearChangeOrigins(project: number, moduleName: string, file?: string): Promise<void> {
  const operations = await storedOperations(project, moduleName);
  if (!operations.length) return;
  const { deleteFile } = await import('/_102027_/l2/libStor.js');
  for (const { info, value } of operations) {
    const kept = file ? value.changes.filter(change => change.file !== file) : [];
    if (kept.length === value.changes.length) continue;
    if (kept.length) await writeJson(info, { ...value, changes: kept });
    else {
      const stored = mls.stor.files[mls.stor.getKeyToFile(info)];
      if (stored) await deleteFile(stored);
    }
  }
}
