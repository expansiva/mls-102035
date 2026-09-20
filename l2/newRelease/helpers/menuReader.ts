/// <mls fileReference="_102035_/l2/newRelease/helpers/menuReader.ts" enhancement="_blank" />

import { normalizeModuleName, readJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';

export type MenuReadStatus = 'missing' | 'invalid' | 'ok';

export interface MenuReadResult {
  status: MenuReadStatus;
  path: string;
  value?: unknown;
}

export function menuFileForProject(project: number, moduleName: string): Ns5FileInfo {
  return {
    project,
    level: 4,
    folder: `${normalizeModuleName(moduleName)}/pool/l2/web`,
    shortName: 'menu',
    extension: '.json',
  };
}

function menuPath(file: Ns5FileInfo): string {
  return `l${file.level}/${file.folder}/${file.shortName}${file.extension}`;
}

/** Tolerant read of `l4/<module>/pool/l2/web/menu.json` for the selected project. Never throws. */
export async function readModuleMenu(project: number, moduleName: string): Promise<MenuReadResult> {
  const file = menuFileForProject(project, moduleName);
  const path = menuPath(file);
  if (!project || !moduleName) return { status: 'missing', path };
  const stored = mls.stor.files[mls.stor.getKeyToFile(file)] as { status?: string } | undefined;
  if (!stored || stored.status === 'deleted') return { status: 'missing', path };
  try {
    const value = await readJson<unknown>(file);
    if (value === null) return { status: 'invalid', path };
    return { status: 'ok', path, value };
  } catch {
    return { status: 'invalid', path };
  }
}
