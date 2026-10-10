import test from 'node:test';
import assert from 'node:assert/strict';
import { readCandidateWorkerGate } from './candidateWorkerGate.js';
import type { PlatformReviewRun } from './reviewRunWorker.js';
import { buildCandidateSnapshot } from '../../solution/candidate/candidateGateway.js';
import type { L4SealedCandidateSnapshot } from '../../solution/candidate/moduleRevision.js';
import { sha256Tobe } from '../../solution/candidate/tobeDiff.js';

const outputRevisionId = 'review-2b9774db38c20e91680bb38a671c1588';
const paths = ['module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts',
  'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts'] as const;
async function hashText(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function fixture() {
  const sources = paths.map(path => ({ path, source: `export const fixture = '${path}';` }));
  const request = 'Atualizar módulo';
  const snapshot = await buildCandidateSnapshot({ baseId: 'base-fixture', requestRevision: 1, request, sources });
  const outputSnapshotHash = snapshot.hash;
  const files = Object.fromEntries(snapshot.files.map(file => [file.path, `sha256:${file.sha256}`]));
  const localHash = await sha256Tobe(files);
  const revision = { changeId: 'change-fixture', revisionId: outputRevisionId, baseId: 'base-fixture', manifestHash: localHash };
  const reviewSeal = {
    schemaVersion: '2026-09-22-agent-review-planner-seal-v1', flowId: 'agentReviewSolution',
    moduleName: 'locacaoEquipamentos', revision: { ...revision, manifestHash: outputSnapshotHash },
  };
  // Seal hashes use ordinary JSON text, unlike the canonical local manifest hash.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(reviewSeal)));
  const traceHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const pipeline = {
    schemaVersion: '2026-09-22-agent-review-planner-pipeline-v1', flowId: 'agentReviewSolution',
    moduleName: 'locacaoEquipamentos', status: 'complete', revision, reviewSeal, reviewSealHash: traceHash,
  };
  const run: PlatformReviewRun = {
    runId: 'review-15e3ad01f251960d73ddadd001249d24', status: 'ready', attempt: 1,
    binding: {
      userId: 'test', project: 102047, moduleName: 'locacaoEquipamentos', changeId: revision.changeId,
      inputRevisionId: 'input-fixture', inputSnapshotHash: 'sha256:input', baseId: revision.baseId,
      requestRevision: 1, requestHash: 'sha256:request', runId: 'review-15e3ad01f251960d73ddadd001249d24',
      inputRevisionNumber: 1, originalL4Path: '', temporaryL4Path: '',
    },
    executions: [], plannerArtifacts: [], errorCode: null, createdAt: '', updatedAt: '',
    candidateResult: { manifest: { runId: 'result-2b9774db38c20e91680bb38a671c1588', outputSnapshotHash, traceHash } },
  };
  const sealed: L4SealedCandidateSnapshot = {
    manifest: { schemaVersion: '2026-09-20-nr-module-revision-v1', ...revision, project: 102047,
      moduleName: 'locacaoEquipamentos', files, createdAt: '', changedPaths: [], requestRevision: 1,
      requestHash: `sha256:${await hashText(request)}` }, request, sources,
  };
  const dependencies = {
    readSourceText: async () => JSON.stringify(pipeline),
    readSealedL4Candidate: async (project: number, moduleName: string, changeId: string, revisionId: string) => {
      assert.deepEqual([project, moduleName, changeId, revisionId], [102047, 'locacaoEquipamentos', revision.changeId, outputRevisionId]);
      return sealed;
    },
  };
  return { run, pipeline, dependencies, traceHash, sealed, outputSnapshotHash, localHash };
}

test('mr32: real snapshot passes both before planner and after planner entry', async () => {
  const { run, pipeline, dependencies, traceHash, outputSnapshotHash, localHash } = await fixture();
  assert.notEqual(localHash, outputSnapshotHash);
  for (const hash of [outputSnapshotHash, localHash]) {
    pipeline.revision.manifestHash = hash;
    assert.deepEqual(await readCandidateWorkerGate(run, dependencies), {
      snapshotHash: `sha256:${outputSnapshotHash}`, pipelineComplete: true, pipelineSnapshotHash: `sha256:${traceHash}`,
    });
  }
});

test('mr32: changed bytes, request or snapshot metadata close gate', async () => {
  for (const field of ['source', 'request', 'baseId', 'requestRevision'] as const) {
    const { run, sealed, dependencies } = await fixture();
    if (field === 'source') sealed.sources[0].source += ' changed';
    else if (field === 'request') sealed.request += ' changed';
    else if (field === 'baseId') sealed.manifest.baseId = 'foreign-base';
    else sealed.manifest.requestRevision++;
    assert.equal((await readCandidateWorkerGate(run, dependencies)).pipelineComplete, false, field);
  }
});

test('mr32: foreign pipeline hash and incomplete pipeline close gate', async () => {
  for (const field of ['hash', 'status', 'revision'] as const) {
    const { run, pipeline, dependencies } = await fixture();
    if (field === 'hash') pipeline.revision.manifestHash = 'sha256:' + 'f'.repeat(64);
    else if (field === 'status') pipeline.status = 'running';
    else pipeline.revision.revisionId = 'foreign-revision';
    assert.equal((await readCandidateWorkerGate(run, dependencies)).pipelineComplete, false, field);
  }
});

test('mr32: foreign seal closes gate even with matching recalculated trace', async () => {
  const { run, pipeline, dependencies, localHash } = await fixture();
  pipeline.reviewSeal.revision.manifestHash = localHash;
  pipeline.reviewSealHash = await hashText(JSON.stringify(pipeline.reviewSeal));
  (run.candidateResult!.manifest as Record<string, unknown>).traceHash = pipeline.reviewSealHash;
  assert.equal((await readCandidateWorkerGate(run, dependencies)).pipelineComplete, false);
});

test('mr32: null or failing sealed reader closes gate', async () => {
  const { run, dependencies } = await fixture();
  for (const readSealedL4Candidate of [async () => null, async () => { throw new Error('unreadable'); }]) {
    assert.equal((await readCandidateWorkerGate(run, { ...dependencies, readSealedL4Candidate })).pipelineComplete, false);
  }
});
