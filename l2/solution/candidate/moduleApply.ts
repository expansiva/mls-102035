/// <mls fileReference="_102035_/l2/solution/candidate/moduleApply.ts" enhancement="_blank" />

import { effortMatchesCurrent } from '/_102035_/l2/solution/candidate/effortFreshness.js';
import { acceptL4Implementation, implementationCommands, readL4Implementation, type L4ImplementationRecord } from '/_102035_/l2/solution/candidate/moduleImplementation.js';
import { compactModuleApplication, restoreModuleApplication, sealModuleApplication, sealModuleLayers } from '/_102035_/l2/solution/candidate/moduleLayers.js';
import { promoteL4Revision, readActiveL4Change } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { completeL4Implementation } from '/_102035_/l2/solution/candidate/tobeCompletion.js';
import { validateChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import { fileExists, readSourceText } from '/_102035_/l2/solution/fs.js';
import { listPoolBoxForProject } from '/_102035_/l2/solution/pool.js';

export interface ApplyL4Result {
  changeId: string;
  revisionId: string;
  baseId: string;
  acceptedBy: string;
  /** Phases of L2 and L1 the accepted effort still asks for. Zero: the change is complete and the release confirmed. */
  pendingCommands: number;
  completed: boolean;
}

export interface ApplyL4Dependencies {
  effortMatches?: typeof effortMatchesCurrent;
  sealApplication?: typeof sealModuleApplication;
  sealLayers?: typeof sealModuleLayers;
  restoreApplication?: typeof restoreModuleApplication;
  promote?: typeof promoteL4Revision;
  accept?: typeof acceptL4Implementation;
}

async function sha256Text(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The sequence of the "Apply" button of the New Release screen, in one place (l4_p4_164): the effort is current →
 * the application is sealed → the layers are sealed → the revision is promoted → the implementation is accepted, and
 * the application is restored when something fails after it was sealed. The same refusals as the button, no way to force.
 * It applies; it does not run the L2/L1 agents. With nothing left to run the change is completed, as the screen does.
 */
export async function applyL4Revision(project: number, moduleName: string, acceptedBy: string, dependencies: ApplyL4Dependencies = {}): Promise<ApplyL4Result> {
  if (!acceptedBy) throw new Error('implementation.user_unavailable');
  const change = await readActiveL4Change(project, moduleName);
  if (!change) throw new Error('l4.apply_no_active_change');
  const { changeId, baseId } = change;
  const revisionId = change.activeRevisionId;
  if (!revisionId || change.resultRevisionId !== revisionId) throw new Error('l4.apply_result_not_current');
  if (await readL4Implementation(project, moduleName)) throw new Error('l4.apply_already_accepted');
  for (const box of ['l4', 'l2', 'l1'] as const) {
    if (listPoolBoxForProject(project, moduleName, box).length) throw new Error('l4.apply_pool_not_empty');
  }
  const effortInfo = {
    project, level: 4 as const, shortName: 'changeEffort', extension: '.json',
    folder: `${moduleName}/pipeline/changes/${changeId}/revisions/${revisionId}/l4/pool/l4`,
  };
  if (!fileExists(effortInfo)) throw new Error('l4.apply_effort_missing');
  const source = await readSourceText(effortInfo);
  let value: unknown;
  try { value = JSON.parse(source); }
  catch (error) {
    console.error('[moduleApply] the change effort is not JSON', error);
    throw new Error('l4.apply_effort_invalid');
  }
  const checked = validateChangeEffort(value);
  if (!checked.ok || checked.file.module !== moduleName) throw new Error('l4.apply_effort_invalid');
  if (checked.file.status === 'blocked') throw new Error('l4.implementation_blocked');
  if (!await (dependencies.effortMatches ?? effortMatchesCurrent)(project, moduleName, value)) throw new Error('l4.apply_effort_stale');
  const hashes = { changeEffort: await sha256Text(source) };

  let applicationSealed = false;
  let record: L4ImplementationRecord;
  try {
    await (dependencies.sealApplication ?? sealModuleApplication)(project, moduleName, changeId, revisionId);
    applicationSealed = true;
    await (dependencies.sealLayers ?? sealModuleLayers)(project, moduleName, baseId);
    await (dependencies.promote ?? promoteL4Revision)(project, moduleName, changeId, revisionId);
    record = await (dependencies.accept ?? acceptL4Implementation)(project, moduleName, { revisionId, acceptedBy, hashes });
  } catch (error) {
    if (applicationSealed) {
      try { await (dependencies.restoreApplication ?? restoreModuleApplication)(project, moduleName, changeId, revisionId); }
      catch (restoreError) { console.error('[moduleApply] application rollback failed', restoreError); }
    }
    throw error;
  }
  const pendingCommands = implementationCommands(record, project, moduleName).length;
  if (!pendingCommands) {
    await compactModuleApplication(project, moduleName, changeId, revisionId);
    await completeL4Implementation(project, moduleName, changeId, revisionId, acceptedBy);
  }
  return { changeId, revisionId, baseId, acceptedBy, pendingCommands, completed: !pendingCommands };
}
