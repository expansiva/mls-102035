/// <mls fileReference="_102035_/l2/solution/candidate/moduleAdopt.ts" enhancement="_blank" />

import { buildCandidateSnapshot, candidateRead } from '/_102035_/l2/solution/candidate/candidateGateway.js';
import { outputRevisionIdForRun, readCandidateWorkerGate, type CandidateGateRun } from '/_102035_/l2/solution/candidate/candidateWorkerGate.js';
import { adoptL4ReviewResult, readActiveL4Change, readSealedL4Candidate } from '/_102035_/l2/solution/candidate/moduleRevision.js';

export interface AdoptL4Result {
  changeId: string;
  inputRevisionId: string;
  outputRevisionId: string;
  outputSnapshotHash: string;
  /** The output was already the active, result revision: nothing was written. */
  alreadyAdopted: boolean;
}

export interface AdoptL4Dependencies {
  candidate?: typeof candidateRead;
  gate?: typeof readCandidateWorkerGate;
  readSealed?: typeof readSealedL4Candidate;
  adopt?: typeof adoptL4ReviewResult;
  active?: typeof readActiveL4Change;
}

/**
 * The review of a change ends when its output revision is adopted as the active, result revision (l4_p4_165). This is
 * the adoption of the New Release screen without the screen and without the central run: the marked result lives in the
 * local candidate store, and the gate that the screen applies to a run is applied to that result. Same refusals:
 * `l4.implementation_conflict` (the result is not the one of the active revision), `l4.implementation_not_ready` (the
 * output revision or its pipeline seal is not complete), `l4.result_stale` (the input is no longer the active one).
 */
export async function adoptL4Output(project: number, moduleName: string, dependencies: AdoptL4Dependencies = {}): Promise<AdoptL4Result> {
  const change = await (dependencies.active ?? readActiveL4Change)(project, moduleName);
  if (!change || !change.activeRevisionId) throw new Error('l4.adopt_no_active_change');
  const { changeId, baseId } = change;
  const candidate = await (dependencies.candidate ?? candidateRead)({ project, moduleName });
  const pointer = candidate.pointer;
  const result = pointer && 'result' in candidate ? candidate.result : undefined;
  if (!pointer || pointer.changeId !== changeId || !result) throw new Error('l4.adopt_no_result');
  // The result names the revision it reviewed (the input); the active one is that input until it is adopted, the output after.
  const inputRevisionId = result.resultRevisionId;
  const gateRun: CandidateGateRun = {
    binding: { project, moduleName, changeId, baseId },
    candidateResult: { ...result } as unknown as Record<string, unknown>,
  };
  const outputRevisionId = outputRevisionIdForRun(gateRun);
  if (!outputRevisionId || result.manifest.status !== 'completed') throw new Error('l4.implementation_conflict');
  if (change.activeRevisionId === outputRevisionId && change.resultRevisionId === outputRevisionId) {
    return { changeId, inputRevisionId, outputRevisionId, outputSnapshotHash: result.manifest.outputSnapshotHash, alreadyAdopted: true };
  }
  if (change.activeRevisionId !== inputRevisionId) throw new Error('l4.result_stale');
  const inputPointer = pointer.revisionId === inputRevisionId && pointer.snapshotHash === result.resultSnapshotHash
    && pointer.revisionNumber === result.resultRevisionNumber;
  const source = pointer.source;
  const publishedPointer = pointer.revisionId === outputRevisionId && pointer.snapshotHash === result.manifest.outputSnapshotHash
    && !!source && source.revisionId === inputRevisionId && source.snapshotHash === result.resultSnapshotHash
    && source.revisionNumber === result.resultRevisionNumber && source.resultId === result.resultId && source.resultHash === result.resultHash;
  if (!inputPointer && !publishedPointer) throw new Error('l4.implementation_conflict');
  const gate = await (dependencies.gate ?? readCandidateWorkerGate)(gateRun);
  if (!gate.pipelineComplete) throw new Error('l4.implementation_not_ready');
  const output = await (dependencies.readSealed ?? readSealedL4Candidate)(project, moduleName, changeId, outputRevisionId);
  if (!output) throw new Error('l4.implementation_not_ready');
  const snapshot = await buildCandidateSnapshot({
    baseId, requestRevision: output.manifest.requestRevision, request: output.request, sources: output.sources,
  });
  if (result.manifest.outputSnapshotHash !== snapshot.hash) throw new Error('l4.implementation_conflict');
  await (dependencies.adopt ?? adoptL4ReviewResult)(project, moduleName, { inputRevisionId, outputRevisionId });
  const active = await (dependencies.active ?? readActiveL4Change)(project, moduleName);
  if (active?.activeRevisionId !== outputRevisionId || active.resultRevisionId !== outputRevisionId) throw new Error('l4.implementation_conflict');
  return { changeId, inputRevisionId, outputRevisionId, outputSnapshotHash: result.manifest.outputSnapshotHash, alreadyAdopted: false };
}
