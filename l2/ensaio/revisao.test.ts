/// <mls fileReference="_102035_/l2/ensaio/revisao.test.ts" enhancement="_blank" />

import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { readModuleMenu } from '../newRelease/helpers/menuReader.js';
import { readReviewArtifact } from '../newRelease/helpers/backendReader.js';
import { buildReviewView } from '../newRelease/widgets/reviewModel.js';
import { buildBackendReview, parseEffortSummary } from '../newRelease/widgets/backendReviewModel.js';
import { installMlsStub } from '../../../test/mlsStub.js';
import assert from 'node:assert/strict';
import { candidateRead } from '../solution/candidate/candidateGateway.js';
import { withReviewScenario, runPlannerScenario, FIXTURE, PROJECT, MODULE } from './cenario.js';

test('recorded review goes through public hooks and publishes only quantidadeMinimaValida', async () => {
  await withReviewScenario(() => installMlsStub({ actualProject: 102047 }), async ({ sources, selection, prepared, before, command, context, replay, fetchCalls, progress }) => {
    assert.deepEqual(replay.executedPlans, ['entry10', 'review20', 'reconcile30', 'validate40', 'finalize50']);
    const after = await candidateRead({ project: PROJECT, moduleName: MODULE });
    assert.ok(after.pointer);
    assert.equal(after.pointer.revisionNumber, 2);
    assert.equal(after.pointer.source?.revisionId, before.pointer?.revisionId);
    assert.equal(after.pointer.source?.revisionNumber, 1);
    assert.ok(after.result);
    assert.equal(after.result.manifest.status, 'completed');
    assert.equal(after.result.manifest.outputSnapshotHash, after.snapshot.hash);
    assert.deepEqual(after.snapshot.files.map(file => file.path).sort(), [...sources.keys()].sort());
    for (const file of after.snapshot.files) {
      const actual = Buffer.from(file.contentBase64, 'base64').toString('utf8');
      const original = sources.get(file.path)!;
      if (file.path === 'rules.defs.ts') {
        assert.notEqual(actual, original);
        assert.equal(actual, original.replace('A quantidade mínima definida para um produto deve ser maior ou igual a zero.',
          'A quantidade mínima definida para um produto deve ser maior que zero.'));
      } else assert.equal(actual, original, file.path);
    }
    assert.equal(progress.status, 'planning');
    assert.deepEqual(progress.candidateResult?.manifest, after.result.manifest);
    assert.equal(fetchCalls(), 0);
  });
});


test('real review and planner evidence reaches ledger ready and the Review models read that run', async () => {
  await withReviewScenario(() => installMlsStub({ actualProject: PROJECT }), async (scenario) => {
    const { prepared, before, progress, command, fetchCalls } = scenario;
    // Load the platform ledger itself: the fake runner supplies evidence, never a fabricated ready record.
    const { ReviewRunService } = await import(new URL('../../../../collab-workspace/collab-messages/src/layer_3_usecases/reviewRuns.ts', import.meta.url).href);
    let stored: any = null;
    const store = {
      read: async () => structuredClone(stored),
      create: async (record: any) => { stored = structuredClone(record); return { created: true, current: structuredClone(stored) }; },
      compareAndSwap: async (revision: number, record: any) => {
        assert.equal(stored.storeRevision, revision);
        stored = structuredClone(record);
        return { committed: true, current: structuredClone(stored) };
      },
    };
    const args = JSON.parse(command.slice(command.indexOf('{')));
    const binding = { ...prepared.input, inputRevisionNumber: before.pointer!.revisionNumber,
      request: args.request, originalL4Path: args.originalL4Path, temporaryL4Path: args.temporaryL4Path };
    const service = new ReviewRunService(store, {
      authorize: async () => undefined, verify: async () => binding,
    }, { start: async () => null, observe: async () => null });
    const caller = { userId: 'ensaio', authenticatedUser: 'ensaio@example.test' };
    const started = await service.start(caller, prepared.input);
    const common = { ...prepared.input, runId: started.runId, workerId: 'worker-ensaio',
      canonicalSnapshotHash: prepared.input.inputSnapshotHash };
    const reviewClaim = await service.claimWork(caller, common);
    assert.ok(reviewClaim);
    assert.equal(reviewClaim.command, command);
    const report = (claim: any, value: unknown, pipelineSnapshotHash?: string) => service.reportWork(caller, {
      ...common, claimId: claim.claimId, phase: claim.phase, attempt: claim.attempt,
      commandHash: claim.commandHash, progress: value, ...(pipelineSnapshotHash ? { pipelineSnapshotHash } : {}),
    });
    const reviewedRun = await report(reviewClaim, progress);
    assert.equal(reviewedRun.status, 'planning', reviewedRun.errorCode || 'review evidence rejected');
    const planner = await runPlannerScenario(scenario.context);
    const pipelineFile = Object.values(mls.stor.files).find(file => file.project === PROJECT
      && file.folder === `${planner.candidate}/pipeline` && file.shortName === 'pipeline')!;
    const pipeline = JSON.parse(await pipelineFile.getContent());
    const pipelineSnapshotHash = `sha256:${pipeline.reviewSealHash}`;
    const plannerClaimInput = { ...common, pipelineStatus: 'complete', pipelineSnapshotHash,
      candidateSnapshotHash: `sha256:${reviewedRun.candidateResult.manifest.outputSnapshotHash}` };
    const plannerClaim = await service.claimWork(caller, plannerClaimInput);
    assert.ok(plannerClaim, JSON.stringify(stored));
    const { createReviewStudioHost } = await import('../newRelease/helpers/reviewRunStudioWorker.js');
    const execution = { ...progress.executions[0], agentName: 'agentPlannerL4',
      taskId: planner.context.task!.PK.replace(/^task(?:\/#?|#)/u, ''), resultRunId: null, candidateRevisionId: null };
    const storage = new Map<string, string>();
    const observedWorker = createReviewStudioHost({ userId: () => 'ensaio',
      storage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); } },
      task: async () => planner.context.task!, message: async () => planner.context.message,
      findMessage: async () => planner.context.message,
    });
    const plannerProgress = await observedWorker.observe({ ...plannerClaim, project: PROJECT, moduleName: MODULE,
      changeId: prepared.input.changeId, execution }, execution);
    assert.equal(plannerProgress?.status, 'ready', plannerProgress?.errorCode || 'planner artifacts rejected');
    const ready = await report(plannerClaim, plannerProgress, pipelineSnapshotHash);
    assert.equal(ready.status, 'ready', ready.errorCode || 'planner evidence rejected');
    assert.equal(ready.errorCode, null);
    const root = `${MODULE}/pipeline/changes/${ready.binding.changeId}/revisions/${ready.executions.find((item: any) => item.agentName === 'agentPlannerL4').candidateRevisionId}/l4`;
    assert.equal(root, planner.candidate);
    const menu = await readModuleMenu(PROJECT, MODULE, root);
    const backend = await readReviewArtifact(PROJECT, MODULE, 'backend', root);
    const effort = await readReviewArtifact(PROJECT, MODULE, 'effort', root);
    const menuView = buildReviewView({ pendingCount: 0, readStatus: menu.status, raw: menu.value,
      selectedActor: 'all', selectedId: '', selectedScope: 'future' });
    const backendView = buildBackendReview(backend, false, MODULE);
    assert.equal(menuView.kind, 'ready');
    assert.ok(menuView.tree.length);
    assert.equal(backendView.kind, 'ready');
    assert.ok(backendView.groups.length);
    assert.ok(backendView.itemCount > 0);
    assert.equal(parseEffortSummary(effort, MODULE).kind, 'counts');
    const diffRef = ready.plannerArtifacts.find((item: any) => item.kind === 'l4diff-l2');
    const diffFile = Object.values(mls.stor.files).find(file => `l4/${file.folder}/${file.shortName}${file.extension}` === diffRef.path)!;
    const diff = JSON.parse(await diffFile.getContent());
    assert.deepEqual(diff.items.map((item: any) => item.changeId), ['rule:quantidadeMinimaValida']);
    for (const read of [menu, backend, effort]) {
      const artifact = ready.plannerArtifacts.find((item: any) => item.path === read.path);
      assert.ok(artifact);
      const file = Object.values(mls.stor.files).find(file => `l4/${file.folder}/${file.shortName}${file.extension}` === read.path)!;
      assert.equal(createHash('sha256').update(await file.getContent()).digest('hex'), artifact.sha256);
      assert.equal(artifact.runId, ready.runId);
    }
    if (process.env.EXPORT_ENSAIO_LEDGER === '1') {
      mkdirSync(new URL('ledger/', FIXTURE), { recursive: true });
      const artifactSources: Record<string, string> = {};
      for (const artifact of ready.plannerArtifacts) {
        if (artifact.kind === 'pipeline-seal') continue;
        const file = Object.values(mls.stor.files).find(file => `l4/${file.folder}/${file.shortName}${file.extension}` === artifact.path)!;
        artifactSources[artifact.path] = await file.getContent();
      }
      const evidence = { binding, common, reviewProgress: progress, plannerClaimInput, plannerProgress, artifactSources, ready };
      writeFileSync(new URL('ledger/evidence.json', FIXTURE), JSON.stringify(evidence, null, 2) + '\n');
    }
    assert.equal(fetchCalls(), 0);
  });
});
