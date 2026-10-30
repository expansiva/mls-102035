/// <mls fileReference="_102035_/l2/newRelease/helpers/menuReader.ts" enhancement="_blank" />

import { normalizeModuleName, readJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';

export type MenuReadStatus = 'missing' | 'configMissing' | 'moduleMissing' | 'invalid' | 'ok';

export interface ConfigNavigationPage {
  id: string;
  label: string;
  href: string;
  description: string;
  actors: string[];
  landing?: boolean;
}

export interface ConfigNavigationMenu {
  source: 'config';
  moduleName: string;
  navigation: unknown[];
}

export interface MenuReadResult {
  status: MenuReadStatus;
  path: string;
  value?: unknown;
}

export function menuFileForProject(project: number, moduleName: string, root?: string): Ns5FileInfo {
  return {
    project,
    level: 4,
    folder: `${root || normalizeModuleName(moduleName)}/pool/l2/web`,
    shortName: 'menu',
    extension: '.json',
  };
}

function menuPath(file: Ns5FileInfo): string {
  return `l${file.level}/${file.folder ? `${file.folder}/` : ''}${file.shortName}${file.extension}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** The generated app's menu is the module's navigation in l5/config.json. */
export function configNavigationForModule(raw: unknown, project: number, moduleName: string):
  { status: 'ok'; value: ConfigNavigationMenu } | { status: 'moduleMissing' | 'invalid' } {
  if (!isRecord(raw) || !isRecord(raw.projects)) return { status: 'invalid' };
  const projectConfig = raw.projects[String(project)];
  if (!projectConfig) return { status: 'moduleMissing' };
  if (!isRecord(projectConfig) || !Array.isArray(projectConfig.modules)) return { status: 'invalid' };
  const module = projectConfig.modules.find((item: unknown) => isRecord(item) && item.moduleId === moduleName);
  if (!module) return { status: 'moduleMissing' };
  if (!isRecord(module) || !Array.isArray(module.navigation)) return { status: 'invalid' };
  return { status: 'ok', value: { source: 'config', moduleName, navigation: module.navigation } };
}

/** Read exactly one authoritative source: config for generated modules, pool plan for new modules. */
export async function readModuleMenu(
  project: number, moduleName: string, options: { generated: boolean; root?: string },
): Promise<MenuReadResult> {
  const file = options.generated
    ? { project, level: 5, folder: '', shortName: 'config', extension: '.json' } satisfies Ns5FileInfo
    : menuFileForProject(project, moduleName, options.root);
  const path = menuPath(file);
  if (!project || !moduleName) return { status: 'missing', path };
  const stored = mls.stor.files[mls.stor.getKeyToFile(file)] as { status?: string } | undefined;
  if (!stored || stored.status === 'deleted') return { status: options.generated ? 'configMissing' : 'missing', path };
  try {
    const value = await readJson<unknown>(file);
    if (value === null) return { status: 'invalid', path };
    if (!options.generated) return { status: 'ok', path, value };
    const selected = configNavigationForModule(value, project, moduleName);
    return selected.status === 'ok' ? { status: 'ok', path, value: selected.value } : { status: selected.status, path };
  } catch (error) {
    console.error('[newRelease] menu read failed', path, error);
    return { status: 'invalid', path };
  }
}
