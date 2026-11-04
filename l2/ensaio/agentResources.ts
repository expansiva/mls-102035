/// <mls fileReference="_102035_/l2/ensaio/agentResources.ts" enhancement="_blank" />

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** The agent's own prompt, skill and schema files, which it reads from the Studio storage (`agentFile`). Not fixtures, not tests. */
export async function installAgentResources(project: number, agentFolder: string): Promise<number> {
  const root = path.resolve(new URL(`../../../mls-${project}/l2/${agentFolder}`, import.meta.url).pathname);
  let installed = 0;
  const walk = async (dir: string, relative: string): Promise<void> => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (['fixtures', 'examples', 'node_modules'].includes(entry.name)) continue;
        await walk(path.join(dir, entry.name), `${relative}/${entry.name}`);
        continue;
      }
      const extension = path.extname(entry.name);
      if (!['.md', '.json'].includes(extension) || entry.name.endsWith('.test.json')) continue;
      const file = await mls.stor.addOrUpdateFile({
        project, level: 2, folder: relative, shortName: entry.name.slice(0, -extension.length), extension,
      } as mls.stor.IFileInfo);
      if (!file) throw new Error(`Could not install ${relative}/${entry.name}`);
      await mls.stor.localStor.setContent(file, { content: readFileSync(path.join(dir, entry.name), 'utf8') });
      installed += 1;
    }
  };
  await walk(root, agentFolder);
  return installed;
}

/** One platform file an agent reads by its Studio path (for example the MDM keys of the engine project), copied from the disk of that project. */
export async function installProjectFile(project: number, level: number, folder: string, shortName: string, extension: string): Promise<void> {
  const disk = new URL(`../../../mls-${project}/l${level}/${folder}/${shortName}${extension}`, import.meta.url);
  const file = await mls.stor.addOrUpdateFile({ project, level, folder, shortName, extension } as mls.stor.IFileInfo);
  if (!file) throw new Error(`Could not install ${project}/l${level}/${folder}/${shortName}${extension}`);
  await mls.stor.localStor.setContent(file, { content: readFileSync(disk, 'utf8') });
}

/** The file `shortName`+`extension` of every folder under `root` of another project (for example the `index.defs.ts` of each molecule of the design-system project). */
export async function installProjectIndexDefs(project: number, level: number, root: string, shortName = 'index', extension = '.defs.ts'): Promise<number> {
  const base = new URL(`../../../mls-${project}/l${level}/${root}/`, import.meta.url);
  let installed = 0;
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try { readFileSync(new URL(`${entry.name}/${shortName}${extension}`, base)); } catch { continue; }
    await installProjectFile(project, level, `${root}/${entry.name}`, shortName, extension);
    installed += 1;
  }
  return installed;
}
