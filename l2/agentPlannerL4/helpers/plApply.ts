/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plApply.ts" enhancement="_blank"/>

import { getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { applyL4Revision } from '/_102035_/l2/solution/candidate/moduleApply.js';
import { existingModuleName } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';

export interface PlApplyDependencies {
  /** The sender of the message that brought the command, or the owner of its task: who ran the command. */
  ownerId?: string;
  /** The user id this session keeps locally. Read only when the command carries no owner. No network lookup. */
  localUserId?: () => string | null;
  apply?: typeof applyL4Revision;
  project?: number;
}

function localUser(): string | null {
  try { return getUserId(); }
  catch (error) {
    console.error('[agentPlannerL4] no local user id', error);
    return null;
  }
}

/**
 * `/apply`: the "Apply" button of the New Release screen without the screen. Answers `applied: {…}` or `refused: <why>`.
 * Who accepts is who ran the command: the owner the command came with, else the local user id; never looked up on the network.
 */
export async function plApplyText(moduleToken: string, dependencies: PlApplyDependencies = {}): Promise<string> {
  const moduleName = existingModuleName(moduleToken);
  if (!moduleName) return `refused: module "${moduleToken}" does not exist in l4/.`;
  const acceptedBy = (dependencies.ownerId || '').trim() || ((dependencies.localUserId ?? localUser)() || '').trim();
  if (!acceptedBy) return 'refused: it was not possible to know who accepts: the command carries no owner and there is no local user id.';
  try {
    const result = await (dependencies.apply ?? applyL4Revision)(dependencies.project ?? Number(mls.actualProject || 0), moduleName, acceptedBy);
    return `applied: ${JSON.stringify({ moduleName, ...result })}`;
  } catch (error) {
    console.error('[agentPlannerL4] apply refused', error);
    return `refused: ${error instanceof Error ? error.message : String(error)}`;
  }
}
