/// <mls fileReference="_102035_/l2/newRelease/helpers/candidateWorkerGate.ts" enhancement="_blank" />

import { readSourceText } from '/_102035_/l2/solution/fs.js';
import { readSealedL4Candidate } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { buildCandidateSnapshot } from '/_102035_/l2/solution/candidate/candidateGateway.js';
import { sha256Tobe } from '/_102035_/l2/solution/candidate/tobeDiff.js';
import { outputRevisionIdForRun, type PlatformReviewRun } from '/_102035_/l2/newRelease/helpers/reviewRunWorker.js';

export interface CandidateWorkerGateDependencies {
  readSourceText?: typeof readSourceText;
  readSealedL4Candidate?: typeof readSealedL4Candidate;
}

export async function readCandidateWorkerGate(run: PlatformReviewRun, dependencies: CandidateWorkerGateDependencies = {}): Promise<{
  snapshotHash?: `sha256:${string}`;
  pipelineComplete?: boolean;
  pipelineSnapshotHash?: `sha256:${string}`;
}> {
  const result = run.candidateResult as Record<string, unknown> | null;
  const manifest = result?.manifest as Record<string, unknown> | undefined;
  const outputRevisionId = outputRevisionIdForRun(run);
  if (!result || !manifest || !outputRevisionId || typeof manifest.outputSnapshotHash !== 'string') return {};
  const snapshotHash = `sha256:${manifest.outputSnapshotHash.replace(/^sha256:/u, '')}` as `sha256:${string}`;
  const info = {
    project: run.binding.project,
    level: 4,
    folder: `${run.binding.moduleName}/pipeline/changes/${run.binding.changeId}/revisions/${outputRevisionId}/l4/pipeline`,
    shortName: 'pipeline',
    extension: '.json',
  } as const;
  let pipeline: Record<string, unknown>;
  try {
    pipeline = JSON.parse(await (dependencies.readSourceText ?? readSourceText)(info)) as Record<string, unknown>;
  } catch {
    return { snapshotHash };
  }
  let localManifestHash: string;
  let wireSnapshotHash: string;
  try {
    const sealed = await (dependencies.readSealedL4Candidate ?? readSealedL4Candidate)(
      run.binding.project, run.binding.moduleName, run.binding.changeId, outputRevisionId,
    );
    if (!sealed) return { snapshotHash, pipelineComplete: false };
    localManifestHash = await sha256Tobe(sealed.manifest.files);
    wireSnapshotHash = (await buildCandidateSnapshot({
      baseId: sealed.manifest.baseId, requestRevision: sealed.manifest.requestRevision,
      request: sealed.request, sources: sealed.sources,
    })).hash;
    if (wireSnapshotHash !== manifest.outputSnapshotHash) return { snapshotHash, pipelineComplete: false };
  } catch {
    return { snapshotHash, pipelineComplete: false };
  }
  const revision = pipeline?.revision as Record<string, unknown> | undefined;
  const reviewSeal = pipeline?.reviewSeal as Record<string, unknown> | undefined;
  const sealRevision = reviewSeal?.revision as Record<string, unknown> | undefined;
  const sealHash = reviewSeal ? await sha256Text(JSON.stringify(reviewSeal)) : '';
  const validPipeline = pipeline?.schemaVersion === '2026-09-22-agent-review-planner-pipeline-v1'
    && pipeline.flowId === 'agentReviewSolution' && pipeline.moduleName === run.binding.moduleName
    && pipeline.status === 'complete' && revision?.changeId === run.binding.changeId
    && revision.revisionId === outputRevisionId && revision.baseId === run.binding.baseId
    && (revision.manifestHash === localManifestHash || revision.manifestHash === wireSnapshotHash)
    && reviewSeal?.schemaVersion === '2026-09-22-agent-review-planner-seal-v1'
    && reviewSeal.flowId === 'agentReviewSolution' && reviewSeal.moduleName === run.binding.moduleName
    && sealRevision?.changeId === run.binding.changeId && sealRevision.revisionId === outputRevisionId
    && sealRevision.baseId === run.binding.baseId && sealRevision.manifestHash === manifest.outputSnapshotHash
    && pipeline.reviewSealHash === sealHash && sealHash === manifest.traceHash;
  return {
    snapshotHash,
    pipelineComplete: validPipeline,
    ...(validPipeline ? { pipelineSnapshotHash: `sha256:${sealHash}` as `sha256:${string}` } : {}),
  };
}

async function sha256Text(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
