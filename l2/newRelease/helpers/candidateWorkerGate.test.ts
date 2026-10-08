import test from 'node:test';
import assert from 'node:assert/strict';
import { readCandidateWorkerGate } from './candidateWorkerGate.js';
import type { PlatformReviewRun } from './reviewRunWorker.js';
import type { L4CandidateManifest } from '../../solution/candidate/moduleRevision.js';
import { sha256Tobe } from '../../solution/candidate/tobeDiff.js';

// Measured MLS revision of locacaoEquipamentos, captured for mr_26.
const files = {
  "access.defs.ts": "sha256:a83a1dd6c6a785183328853e90a1466f42300dd70b5c9bb0a1a0232739adafc5",
  "integration.defs.ts": "sha256:2ea0cd8278d32b8a5c964c7ea0a1415793b01290dbd50efb02b2526bbf14417d",
  "journeys/consultarSituacaoEquipamentos.defs.ts": "sha256:18d497cb2afec69b826df4b6e671b294f7134957d6269ddd94d3eb315a201df8",
  "journeys/criarContratoLocacao.defs.ts": "sha256:87bbc832daabcaa2107f509d3ef3f4bc773c89da9ce336a6da06eb3f7ed9296f",
  "journeys/index.defs.ts": "sha256:76445054ae044d36ba789ab88b44177016b065f2f7d8b30e4e45d94d1eea60fd",
  "journeys/registrarDevolucao.defs.ts": "sha256:c0701f32929d08df50d5d964480a9743145ff87a4bc03742aed74a1fda99627c",
  "module.defs.ts": "sha256:41185b89f2dd711f3d32aaf8d75c234f9654d6c86018cda39a87571f08665455",
  "ontology/Cliente.defs.ts": "sha256:05667c4ae7166564d381e27257807d84782477692eb565316702c59e4346831c",
  "ontology/ContratoLocacao.defs.ts": "sha256:49b145b2438b0446fd0feba5a7471461db3412bd79be734cf170d79e966d9cc9",
  "ontology/Equipamento.defs.ts": "sha256:e34b25a0629e3b773024b2e9a66a2e0575316b6a3e2a2f6d0aaa17d0ad7dcd09",
  "ontology/ItemLocacao.defs.ts": "sha256:c2830b79ad1f1f5d46c0528ad6f79487b63b7a23b4147b6f9c4e2cc2b22f7841",
  "ontology/ManutencaoEquipamento.defs.ts": "sha256:ee33f573cd4312b556bbfc63878cf07038422aa03e4ab7a5c940491efdb8e62a",
  "ontology/index.defs.ts": "sha256:dba21a842c76082f0a97969cc4074b755597e7cbf15fec66d43c3a3dc99da84a",
  "rules.defs.ts": "sha256:894c3c27746771dbfaf51167981cf3a009778f8dbd4e070b76d85524fb6245e3",
  "workflows.defs.ts": "sha256:c18c2b1929c5d63df63e0fa3d541c523a5f063a5bf908425c3289b924d63b8c0"
};
const localHash = 'sha256:375db862b2928ba227759f26ec5578ae30b6aa5b15cbea1ec0859203ac5aa1fa';
const outputSnapshotHash = '112e7c6f32d117170dbe56c063f463934df6f57574d0495d0e689971716c1b77';
const outputRevisionId = 'review-2b9774db38c20e91680bb38a671c1588';

async function fixture() {
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
  const localRevision = { ...revision, project: 102047, moduleName: 'locacaoEquipamentos', files } as unknown as L4CandidateManifest;
  const dependencies = {
    readSourceText: async () => JSON.stringify(pipeline),
    readL4Revision: async (project: number, moduleName: string, changeId: string, revisionId: string) => {
      assert.deepEqual([project, moduleName, changeId, revisionId], [102047, 'locacaoEquipamentos', revision.changeId, outputRevisionId]);
      return localRevision;
    },
  };
  return { run, pipeline, dependencies, traceHash };
}

test('mr_26 s1: measured local and hub hashes satisfy their own contracts', async () => {
  assert.equal(await sha256Tobe(files), localHash);
  const { run, dependencies, traceHash } = await fixture();
  assert.deepEqual(await readCandidateWorkerGate(run, dependencies), {
    snapshotHash: `sha256:${outputSnapshotHash}`, pipelineComplete: true, pipelineSnapshotHash: `sha256:${traceHash}`,
  });
});

test('mr_26 s1: swapped local revision hash closes gate', async () => {
  const { run, pipeline, dependencies } = await fixture();
  pipeline.revision.manifestHash = outputSnapshotHash;
  assert.equal((await readCandidateWorkerGate(run, dependencies)).pipelineComplete, false);
});

test('mr_26 s1: swapped seal hash closes gate even with matching trace', async () => {
  const { run, pipeline, dependencies } = await fixture();
  pipeline.reviewSeal.revision.manifestHash = localHash;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(pipeline.reviewSeal)));
  pipeline.reviewSealHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  (run.candidateResult!.manifest as Record<string, unknown>).traceHash = pipeline.reviewSealHash;
  assert.equal((await readCandidateWorkerGate(run, dependencies)).pipelineComplete, false);
});

test('mr_26 s1: absent or unreadable local revision closes gate', async () => {
  const { run, dependencies } = await fixture();
  for (const readL4Revision of [async () => null, async () => { throw new Error('unreadable'); }]) {
    assert.equal((await readCandidateWorkerGate(run, { ...dependencies, readL4Revision })).pipelineComplete, false);
  }
});
