/// <mls fileReference="_102035_/l2/newRelease/helpers/directLanguages.ts" enhancement="_blank" />
import { findLanguageByCode } from '/_102027_/l2/collabLanguages.js';
import { readDefsJson, readJson, writeJson } from '/_102035_/l2/solution/fs.js';
import { tobeArtifactFileInfo } from '/_102035_/l2/solution/candidate/tobePaths.js';
import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';
import { saveDirectLanguageMetadata } from '/_102035_/l2/newRelease/tobe.js';
import { runNewReleaseCommand } from '/_102035_/l2/newRelease/helpers/agentCommandRunner.js';

export interface LanguageCommandRequest {
  projectId: number;
  moduleName: string;
  languages: Array<{ code: string; name: string }>;
}

export interface LanguageCommand { agent: 'agentAddLanguage' | 'agentRemoveLanguage'; payload: string }
export function languageCommands(projectId: number, moduleName: string, before: readonly string[], after: readonly string[]): LanguageCommand[] {
  return ([['agentAddLanguage', after.filter(code => !before.includes(code))],
    ['agentRemoveLanguage', before.filter(code => !after.includes(code))]] as const)
    .filter(([, codes]) => codes.length > 0).map(([agent, codes]) => {
      const payload: LanguageCommandRequest[] = [{ projectId, moduleName,
        languages: codes.map(code => ({ code, name: findLanguageByCode(code)?.name || code })) }];
      return { agent, payload: JSON.stringify(payload) };
    });
}

/** Consumer checkpoint retains unfinished commands when metadata has already been saved. */
interface LanguageExecution { target: string; pending: LanguageCommand[] }
export async function hasPendingLanguages(project: number, moduleName: string): Promise<boolean> {
  const record = await readJson<LanguageExecution>({ project, level: 4, folder: `${moduleName}/pipeline/newRelease`, shortName: 'languages', extension: '.json' });
  return !!record?.pending.length;
}

export async function applyDirectLanguages(project: number, moduleName: string, value: Ns5ModuleArtifact,
  expected: { changeId: string | null; revisionId: string | null },
  progress: (state: string, reason?: string) => void,
  execute = runNewReleaseCommand): Promise<string | null> {
  const published = await readDefsJson<Ns5ModuleArtifact>(tobeArtifactFileInfo(project, moduleName, 'module.defs.ts', 'asis'));
  if (!published) throw new Error('general.languagesInvalid');
  const info = { project, level: 4 as const, folder: `${moduleName}/pipeline/newRelease`, shortName: 'languages', extension: '.json' };
  const previous = await readJson<LanguageExecution>(info);
  const target = JSON.stringify([value.productLanguages, value.defaultLanguage]);
  if (!previous?.pending.length && JSON.stringify([published.productLanguages, published.defaultLanguage]) === target) return expected.revisionId;
  if (previous?.pending.length && previous.target !== target) throw new Error('general.languagesPending');
  const pending = previous?.pending.length ? previous.pending : languageCommands(project, moduleName, published.productLanguages, value.productLanguages);
  progress('general.languagesSaving');
  const revisionId = await saveDirectLanguageMetadata(project, moduleName,
    { productLanguages: [...value.productLanguages], defaultLanguage: value.defaultLanguage }, expected);
  await writeJson(info, { target, pending } satisfies LanguageExecution);
  while (pending.length) {
    const command = pending[0];
    progress('general.languagesRunning');
    const outcome = await execute(command.agent, command.payload, () => progress('general.languagesRunning'));
    const refusal = outcome.results.find(result => /^(?:refused|failed):/u.test(result.trim()));
    if (outcome.task.status !== 'done' || refusal) throw new Error(refusal || outcome.results.join('\n') || outcome.task.last_update_log || 'general.languagesFailed');
    pending.shift();
    await writeJson(info, { target, pending } satisfies LanguageExecution);
  }
  progress('general.languagesDone');
  return revisionId;
}
