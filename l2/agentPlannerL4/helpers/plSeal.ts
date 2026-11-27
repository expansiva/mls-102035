/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plSeal.ts" enhancement="_blank"/>

import { readActiveL4Change, sealL4Revision } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { existingModuleName } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';

export interface PlSealDependencies {
  project?: number;
  active?: typeof readActiveL4Change;
  seal?: typeof sealL4Revision;
}

/**
 * `/seal`: the "save" of the screen. A request in text on a change that is already active writes the candidate and leaves it unsealed
 * (the screen seals after the agent), so the next review would refuse with "Temporary L4 bytes differ from the selected revision".
 * This seals the bytes of the candidate as they are now, keeping the request text of the change.
 */
export async function plSealText(moduleToken: string, dependencies: PlSealDependencies = {}): Promise<string> {
  const moduleName = existingModuleName(moduleToken);
  if (!moduleName) return `refused: module "${moduleToken}" does not exist in l4/.`;
  const project = dependencies.project ?? Number(mls.actualProject || 0);
  try {
    const change = await (dependencies.active ?? readActiveL4Change)(project, moduleName);
    if (!change) return 'refused: l4.seal_no_active_change';
    const revision = await (dependencies.seal ?? sealL4Revision)(project, moduleName, change.activeRevisionId);
    return `sealed: ${moduleName} change ${change.changeId} revision ${revision.revisionId} (was ${change.activeRevisionId}), ${revision.changedPaths.length} changed path(s).`;
  } catch (error) {
    return `refused: ${error instanceof Error ? error.message : String(error)}`;
  }
}
