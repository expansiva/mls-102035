/// <mls fileReference="_102035_/l2/solution/candidate/moduleLanguages.ts" enhancement="_blank"/>

/** The direct save of the product languages (metadata of `module.defs.ts` and the hash of the manifest): the screen and `/languages` of the planner run this one. */
import { fileExists, readDefsJson, readJson, writeDefs, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { assertNewReleaseEditable } from '/_102035_/l2/solution/candidate/moduleImplementation.js';
import { editL4Candidate, readActiveL4Change, withModuleWriter } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { tobeArtifactFileInfo, type Ns5TobeManifest } from '/_102035_/l2/solution/candidate/tobePaths.js';
import { sha256Tobe } from '/_102035_/l2/solution/candidate/tobeDiff.js';
import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

function manifestInfo(project: number, moduleName: string): Ns5FileInfo {
  return { project, level: 4, folder: `${moduleName}/tobe/plan`, shortName: 'tobe', extension: '.json' };
}

async function readManifest(project: number, moduleName: string): Promise<Ns5TobeManifest | null> {
  return readJson<Ns5TobeManifest>(manifestInfo(project, moduleName));
}

export async function saveDirectLanguageMetadata(project: number, moduleName: string,
  languages: Pick<Ns5ModuleArtifact, 'productLanguages' | 'defaultLanguage'>,
  expected: { changeId: string | null; revisionId: string | null }): Promise<string | null> {
  await assertNewReleaseEditable(project, moduleName);
  if (!languages.productLanguages.length || new Set(languages.productLanguages).size !== languages.productLanguages.length
    || !languages.productLanguages.includes(languages.defaultLanguage)) throw new Error('general.languagesInvalid');
  const write = async () => {
    await assertNewReleaseEditable(project, moduleName);
    const publishedInfo = tobeArtifactFileInfo(project, moduleName, 'module.defs.ts', 'asis');
    const published = await readDefsJson<Ns5ModuleArtifact>(publishedInfo);
    if (!published) throw new Error('general.languagesInvalid');
    const plannedInfo = tobeArtifactFileInfo(project, moduleName, 'module.defs.ts', 'tobe');
    const planned = fileExists(plannedInfo) ? await readDefsJson<Ns5ModuleArtifact>(plannedInfo) : null;
    if (fileExists(plannedInfo) && !planned) throw new Error('general.languagesInvalid');
    const manifest = await readManifest(project, moduleName);
    if (manifest?.base['module.defs.ts'] && manifest.base['module.defs.ts'] !== await sha256Tobe(published)) throw new Error('general.languagesConflict');
    const next = { ...published, ...languages };
    if (planned) await writeDefs(plannedInfo, `${moduleName}Module`, { ...planned, ...languages }, 'Ns5ModuleArtifact');
    await writeDefs(publishedInfo, `${moduleName}Module`, next, 'Ns5ModuleArtifact');
    if (manifest?.base['module.defs.ts']) {
      manifest.base['module.defs.ts'] = await sha256Tobe(next);
      await writeJson(manifestInfo(project, moduleName), manifest);
    }
  };
  if (expected.changeId) {
    const result = await editL4Candidate(project, moduleName, expected.revisionId, expected.changeId, write);
    return result.revision.revisionId;
  }
  return withModuleWriter(project, moduleName, async () => {
    if (await readActiveL4Change(project, moduleName)) throw new Error('general.languagesConflict');
    await write();
    return null;
  });
}
