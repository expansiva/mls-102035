/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plLanguages.ts" enhancement="_blank"/>

import { findLanguageByCode } from '/_102027_/l2/collabLanguages.js';
import { readDefsJson } from '/_102035_/l2/solution/fs.js';
import { tobeArtifactFileInfo } from '/_102035_/l2/solution/candidate/tobePaths.js';
import { saveDirectLanguageMetadata } from '/_102035_/l2/solution/candidate/moduleLanguages.js';
import { existingModuleName } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

export interface PlLanguagesDependencies {
  project?: number;
  readModule?: (project: number, moduleName: string) => Promise<Ns5ModuleArtifact | null>;
  save?: typeof saveDirectLanguageMetadata;
  known?: (code: string) => boolean;
}

/**
 * `/languages <code,code> [default=<code>]`: what the New Release screen does when the admin changes the product languages,
 * with no screen: `saveDirectLanguageMetadata` (metadata of `module.defs.ts` and the hash of the manifest). It translates nothing:
 * the files of a new language come from `@@agentAddLanguage`, run after. Refused while a change is active (the save itself refuses it).
 * Without `default=`, the default language of the module stays when it is still in the list.
 */
export async function plLanguagesText(moduleToken: string, codes: readonly string[], defaultLanguage: string, dependencies: PlLanguagesDependencies = {}): Promise<string> {
  const moduleName = existingModuleName(moduleToken);
  if (!moduleName) return `refused: module "${moduleToken}" does not exist in l4/.`;
  if (!codes.length) return 'refused: l4.languages_none: write /languages <code,code> [default=<code>].';
  const known = dependencies.known ?? ((code: string) => !!findLanguageByCode(code));
  const unknown = codes.find(code => !known(code));
  if (unknown) return `refused: l4.languages_unknown_code: ${unknown}`;
  const project = dependencies.project ?? Number(mls.actualProject || 0);
  try {
    const current = await (dependencies.readModule ?? ((p, m) => readDefsJson<Ns5ModuleArtifact>(tobeArtifactFileInfo(p, m, 'module.defs.ts', 'asis'))))(project, moduleName);
    if (!current) return 'refused: l4.languages_no_module';
    const wanted = defaultLanguage || current.defaultLanguage;
    await (dependencies.save ?? saveDirectLanguageMetadata)(project, moduleName, { productLanguages: [...codes], defaultLanguage: wanted }, { changeId: null, revisionId: null });
    return `languages: ${moduleName} productLanguages=${codes.join(',')} defaultLanguage=${wanted} (was ${current.productLanguages.join(',')} / ${current.defaultLanguage}). Files of a new language: run @@agentAddLanguage.`;
  } catch (error) {
    return `refused: ${error instanceof Error ? error.message : String(error)}`;
  }
}
