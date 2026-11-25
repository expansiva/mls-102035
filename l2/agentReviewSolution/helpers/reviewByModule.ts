/// <mls fileReference="_102035_/l2/agentReviewSolution/helpers/reviewByModule.ts" enhancement="_blank" />

import { readActiveL4Change, readActiveSealedL4Candidate, resolveL4Folders } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { prepareReviewStartInput } from '/_102035_/l2/solution/candidate/reviewStart.js';
import { serializeReviewInvocation } from '/_102035_/l2/agentReviewSolution/helpers/invocation.js';

const MODULE_ONLY = /^[a-z][A-Za-z0-9]{0,59}$/u;

/** The prompt that names only the module (no JSON from the screen): `@@agentReviewSolution <module>`. */
export function reviewModuleToken(userPrompt: string): string {
  const body = String(userPrompt || '').trim().replace(/^@@agentReviewSolution(?:\s+|$)/u, '').trim();
  return MODULE_ONLY.test(body) ? body : '';
}

export interface ReviewByModuleDependencies {
  prepare?: typeof prepareReviewStartInput;
  activeChange?: typeof readActiveL4Change;
  activeSealed?: typeof readActiveSealedL4Candidate;
}

/**
 * Reviews the sealed, active revision of a module the way the screen does when it starts a review: the entry is
 * prepared (request and hashes checked, snapshot built, candidate pointer published) and the invocation the agent
 * takes is returned. Without an active change, a sealed revision or the text of the request, it refuses and says which.
 */
export async function reviewInvocationForModule(
  project: number,
  moduleName: string,
  userId: string,
  dependencies: ReviewByModuleDependencies = {},
): Promise<string> {
  if (!userId.trim()) throw new Error('review.user_unknown: it was not possible to know who asks the review.');
  const change = await (dependencies.activeChange ?? readActiveL4Change)(project, moduleName);
  if (!change || !change.activeRevisionId) throw new Error('review.no_active_change: the module has no active change to review.');
  const sealed = await (dependencies.activeSealed ?? readActiveSealedL4Candidate)(project, moduleName);
  if (!sealed || sealed.manifest.revisionId !== change.activeRevisionId) throw new Error('review.no_sealed_revision: the active revision is not sealed.');
  if (!sealed.request.trim()) throw new Error('review.no_request_text: the active change has no text of the request.');
  await (dependencies.prepare ?? prepareReviewStartInput)({
    project, moduleName, changeId: change.changeId, revisionId: change.activeRevisionId,
    request: sealed.request, userId, loaded: sealed,
  });
  const folders = resolveL4Folders(project, moduleName, change.baseId);
  return serializeReviewInvocation({
    project, moduleName, baseId: change.baseId,
    originalL4Path: folders.originalL4Path, temporaryL4Path: folders.temporaryL4Path,
    request: sealed.request, expectedRevisionId: change.activeRevisionId,
  });
}
