/// <mls fileReference="_102035_/l2/ensaio/hubEmMemoria.ts" enhancement="_blank" />

import {
  candidateRead, candidatePublish, candidateMarkResult,
  type CandidatePersistence, type CandidateReadInput, type CandidatePublishInput, type CandidateMarkResultInput,
} from '/_102034_/l1/server/layer_1_external/candidate/candidateStore.js';

class SharedTable implements CandidatePersistence {
  private records = new Map<string, { key: string; [field: string]: unknown }>();
  async get(key: string) { return structuredClone(this.records.get(key)); }
  async putFile(item: Parameters<CandidatePersistence['putFile']>[0]) {
    if (this.records.has(item.key)) return false;
    this.records.set(item.key, structuredClone({ ...item }));
    return true;
  }
  async commit(input: Parameters<CandidatePersistence['commit']>[0]) {
    const current = this.records.get(input.pointerKey);
    const revision = typeof current?.revisionNumber === 'number' ? current.revisionNumber : 0;
    if ((current?.revisionId ?? null) !== input.expectedRevisionId || revision !== input.pointer.revisionNumber - 1
      || (input.expectedRevisionId !== null && (!input.permit
        || current?.snapshotHash !== input.permit.inputSnapshotHash
        || current?.resultRevisionId !== input.permit.inputRevisionId
        || current?.resultSnapshotHash !== input.permit.inputSnapshotHash
        || current?.resultRevisionNumber !== input.permit.inputRevisionNumber
        || current?.resultId !== input.permit.resultId || current?.resultHash !== input.permit.resultHash))
      || this.records.has(input.snapshot.key) || this.records.has(input.request.key)) return false;
    this.records.set(input.pointerKey, structuredClone({ key: input.pointerKey, ...input.pointer }));
    this.records.set(input.snapshot.key, structuredClone({ ...input.snapshot }));
    this.records.set(input.request.key, structuredClone({ ...input.request }));
    return true;
  }
  async commitResult(input: Parameters<CandidatePersistence['commitResult']>[0]) {
    const current = this.records.get(input.pointerKey);
    if (current?.revisionId !== input.expectedRevisionId || current?.snapshotHash !== input.expectedSnapshotHash
      || current?.revisionNumber !== input.expectedRevisionNumber || current?.resultId !== undefined
      || this.records.has(input.result.key)) return false;
    this.records.set(input.result.key, structuredClone({ ...input.result }));
    this.records.set(input.pointerKey, structuredClone({
      ...current, resultRevisionId: input.expectedRevisionId, resultSnapshotHash: input.expectedSnapshotHash,
      resultRevisionNumber: input.expectedRevisionNumber, resultId: input.result.resultId, resultHash: input.result.resultHash,
    }));
    return true;
  }
}

export function createHubEmMemoria() {
  const table = new SharedTable();
  const caller = { owner: 'ensaio', orgId: 'org-ensaio' };
  return {
    read: async (input: CandidateReadInput) => ({ ...await candidateRead(caller, input, 'org-ensaio', table) }),
    publish: async (input: CandidatePublishInput) => ({ ...await candidatePublish(caller, input, 'org-ensaio', table) }),
    markResult: async (input: CandidateMarkResultInput) => ({ ...await candidateMarkResult(caller, input, 'org-ensaio', table) }),
  };
}
