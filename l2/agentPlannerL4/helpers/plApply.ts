/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plApply.ts" enhancement="_blank"/>

import { ensureUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { applyL4Revision } from '/_102035_/l2/solution/candidate/moduleApply.js';
import { existingModuleName } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';

export interface PlApplyDependencies {
  userId?: () => Promise<string | null>;
  apply?: typeof applyL4Revision;
  project?: number;
}

/** `/apply`: the "Apply" button of the New Release screen without the screen. Answers `applied: {…}` or `refused: <why>`. */
export async function plApplyText(moduleToken: string, dependencies: PlApplyDependencies = {}): Promise<string> {
  const moduleName = existingModuleName(moduleToken);
  if (!moduleName) return `refused: module "${moduleToken}" does not exist in l4/.`;
  try {
    const acceptedBy = await (dependencies.userId ?? ensureUserId)();
    const result = await (dependencies.apply ?? applyL4Revision)(dependencies.project ?? Number(mls.actualProject || 0), moduleName, acceptedBy || '');
    return `applied: ${JSON.stringify({ moduleName, ...result })}`;
  } catch (error) {
    console.error('[agentPlannerL4] apply refused', error);
    return `refused: ${error instanceof Error ? error.message : String(error)}`;
  }
}
