/// <mls fileReference="_102035_/l2/newRelease/helpers/backendReader.ts" enhancement="_blank" />

import { normalizeModuleName, readJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';

export interface ReviewArtifactRead {
  status: 'missing' | 'invalid' | 'ok';
  path: string;
  value?: unknown;
}

export function reviewArtifactFile(project: number, moduleName: string, name: 'backend' | 'effort', root?: string): Ns5FileInfo {
  return {
    project,
    level: 4,
    folder: `${root || normalizeModuleName(moduleName)}/pool/l2/web`,
    shortName: name,
    extension: '.json',
  };
}

export async function readReviewArtifact(project: number, moduleName: string, name: 'backend' | 'effort', root?: string): Promise<ReviewArtifactRead> {
  const file = reviewArtifactFile(project, moduleName, name, root);
  const path = `l4/${file.folder}/${file.shortName}${file.extension}`;
  if (!project || !moduleName) return { status: 'missing', path };
  const stored = mls.stor.files[mls.stor.getKeyToFile(file)] as { status?: string } | undefined;
  if (!stored || stored.status === 'deleted') return { status: 'missing', path };
  try {
    const value = await readJson<unknown>(file);
    return value === null ? { status: 'invalid', path } : { status: 'ok', path, value };
  } catch {
    return { status: 'invalid', path };
  }
}
