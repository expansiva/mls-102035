/// <mls fileReference="_102035_/l2/ensaio/revisao.test.ts" enhancement="_blank" />

import test from 'node:test';
import NodeModule from 'node:module';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readModuleMenu } from '../newRelease/helpers/menuReader.js';
import { readReviewArtifact } from '../newRelease/helpers/backendReader.js';
import { buildReviewView } from '../newRelease/widgets/reviewModel.js';
import { buildBackendReview, parseEffortSummary } from '../newRelease/widgets/backendReviewModel.js';
import { installMlsStub } from '../../../test/mlsStub.js';
import assert from 'node:assert/strict';
import { candidateRead } from '../solution/candidate/candidateGateway.js';
import { writeJson } from '../solution/fs.js';
import { readCandidateWorkerGate } from '../newRelease/helpers/candidateWorkerGate.js';
import { diffModuleLayers, restoreModuleFromSeals, sealModuleLayers } from '../solution/candidate/moduleLayers.js';
import { acceptL4Implementation, readL4Implementation } from '../solution/candidate/moduleImplementation.js';
import { promoteL4Revision, readL4Release } from '../solution/candidate/moduleRevision.js';
import { withReviewScenario, runPlannerScenario, FIXTURE, PROJECT, MODULE } from './cenario.js';
import { effortRegistry } from '../solution/effortRegistry.js';
import type { ChangeEffortFile, EffortAnswer } from '../solution/poolPlan.js';
import { buildChangeEffortView } from '../newRelease/widgets/changeEffortModel.js';

for (const status of ['simple', 'blocked'] as const) {
  test(`mr_27: review reads the ${status} changeEffort produced by the public L4 rehearsal`, async () => {
    const golden = JSON.parse(readFileSync(new URL(
      '../solution/fixtures/changeEffort/agendaClinica-regra-anotacao/changeEffort.json', import.meta.url), 'utf8')) as ChangeEffortFile;
    const previous = { ...effortRegistry };
    for (const project of Object.keys(effortRegistry)) delete effortRegistry[project];
    try {
      if (status === 'simple') for (const answer of golden.perItem[0].answers) {
        effortRegistry[answer.master.project] = {
          describeEffort: input => ({ ...structuredClone(answer), item: input.item.changeId }) as EffortAnswer,
        };
      }
      await withReviewScenario(() => installMlsStub({ actualProject: PROJECT }), async ({ context, fetchCalls }) => {
        const { candidate, context: planner } = await runPlannerScenario(context);
        assert.equal(planner.task?.status, 'done');
        const read = await readReviewArtifact(PROJECT, MODULE, 'changeEffort', candidate);
        assert.equal(read.status, 'ok');
        assert.equal(read.path, `l4/${candidate}/pool/l4/changeEffort.json`);
        const written = read.value as ChangeEffortFile;
        const view = buildChangeEffortView(read);
        assert.equal(view.kind, 'ready');
        assert.equal(view.status, status);
        assert.equal(view.items.length, 1);
        assert.equal(view.items[0].item.id, 'rule:quantidadeMinimaValida');
        assert.deepEqual(view.items[0].answers, written.perItem[0].answers);
        assert.deepEqual(view.merged, written.merged);
        assert.deepEqual(view.untouched, written.untouched);
        if (status === 'simple') {
          assert.deepEqual(view.merged, golden.merged);
          assert.deepEqual(view.items[0].answers.map(({ item: _item, ...answer }) => answer),
            golden.perItem[0].answers.map(({ item: _item, ...answer }) => answer));
        } else {
          assert.equal(view.items[0].answers.length, written.masters.length);
          for (const answer of view.items[0].answers) {
            assert.equal(answer.abend?.reason, `describeEffort not registered for master ${answer.master.project}`);
          }
        }
        assert.equal((await readReviewArtifact(PROJECT, MODULE, 'changeEffort')).status, 'missing');
        assert.equal(fetchCalls(), 0);
      });
    } finally {
      for (const project of Object.keys(effortRegistry)) delete effortRegistry[project];
      Object.assign(effortRegistry, previous);
    }
  });
}

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


for (const outcome of ['current', 'edited', 'corrupted'] as const) {
const editedAfterClick = outcome === 'edited';
test(outcome === 'corrupted' ? 'mr_26 s3: real ready result is not adopted with a changed local manifest hash'
  : `mr_25 s3: real ready result ${editedAfterClick ? 'rejects a request edited after the click' : 'becomes current in the module reader'}`, async (t) => {
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
    const { readNs5Module } = await import('../newRelease/helpers/l4Reader.js');
    const { adoptL4ReviewResult } = await import('../solution/candidate/moduleRevision.js');
    const { saveChangeRequest } = await import('../newRelease/helpers/revisionSelection.js');
    const beforeAdoption = await readNs5Module(PROJECT, MODULE, 'tobe');
    assert.equal(beforeAdoption.resultCurrent, false);
    const pendingCount = (data: typeof beforeAdoption) => data.changeId && !data.resultCurrent ? 1 : 0;
    assert.equal(pendingCount(beforeAdoption), 1);
    const adoption = { inputRevisionId: ready.binding.inputRevisionId,
      outputRevisionId: ready.executions.find((item: any) => item.agentName === 'agentPlannerL4').candidateRevisionId };
    const validGate = await readCandidateWorkerGate(ready);
    assert.equal(validGate.pipelineComplete, true);
    assert.equal(validGate.pipelineSnapshotHash, pipelineSnapshotHash);
    if (outcome === 'corrupted') {
      pipeline.revision.manifestHash = `sha256:${'0'.repeat(64)}`;
      await writeJson(pipelineFile, pipeline);
      const rejectedGate = await readCandidateWorkerGate(ready);
      assert.equal(rejectedGate.pipelineComplete, false);
      if (rejectedGate.pipelineComplete) await adoptL4ReviewResult(PROJECT, MODULE, adoption);
      const pending = await readNs5Module(PROJECT, MODULE, 'tobe');
      assert.equal(pending.resultCurrent, false);
      assert.equal(pending.revisionId, beforeAdoption.revisionId);
      assert.equal(pendingCount(pending), 1);
      assert.equal(fetchCalls(), 0);
      return;
    }
    if (editedAfterClick) {
      const edited = await saveChangeRequest(PROJECT, MODULE, `${binding.request}\nPedido editado após o clique.`,
        beforeAdoption.changeId, beforeAdoption.revisionId);
      assert.notEqual(edited.revisionId, adoption.inputRevisionId);
      await assert.rejects(adoptL4ReviewResult(PROJECT, MODULE, adoption), /^Error: l4.result_stale$/);
      const stale = await readNs5Module(PROJECT, MODULE, 'tobe');
      assert.equal(stale.resultCurrent, false);
      assert.equal(stale.revisionId, edited.revisionId);
      assert.equal(pendingCount(stale), 1);
    } else {
      await adoptL4ReviewResult(PROJECT, MODULE, adoption);
      const current = await readNs5Module(PROJECT, MODULE, 'tobe');
      assert.equal(current.resultCurrent, true);
      assert.equal(current.revisionId, adoption.outputRevisionId);
      assert.equal(pendingCount(current), 0);
      assert.deepEqual(current.errors, []);
      const rulesSource = current.sealedRevision?.sources.find(file => file.path === 'rules.defs.ts')?.source;
      assert.equal(rulesSource, scenario.sources.get('rules.defs.ts')!.replace(
        'A quantidade mínima definida para um produto deve ser maior ou igual a zero.',
        'A quantidade mínima definida para um produto deve ser maior que zero.'));
      assert.match(JSON.stringify(current.artifacts.rules.value), /quantidadeMinimaValida/);
      assert.match(JSON.stringify(current.artifacts.rules.value), /maior que zero/);
      assert.equal(buildReviewView({ pendingCount: pendingCount(current), readStatus: menu.status, raw: menu.value,
        selectedActor: 'all', selectedId: '', selectedScope: 'future' }).kind, 'ready');
      assert.equal(buildBackendReview(backend, pendingCount(current) > 0, MODULE).kind, 'ready');
      await t.test('mr_14 s5: adopted ready revision is sealed, promoted, changed and restored', async () => {
        const layers = [
          { level: 1, folder: MODULE, shortName: 'produto', extension: '.defs.ts' },
          { level: 2, folder: `${MODULE}/web`, shortName: 'produto', extension: '.defs.ts' },
        ];
        for (const info of layers) {
          const file = await mls.stor.addOrUpdateFile({ project: PROJECT, ...info } as mls.stor.IFileInfo);
          assert.ok(file);
          await mls.stor.localStor.setContent(file, { content: 'export const quantidadeMinima = 0;\n' });
        }
        const baseId = prepared.input.baseId;
        const seal = await sealModuleLayers(PROJECT, MODULE, baseId);
        assert.equal(seal.files.length, 2);
        const promoted = await promoteL4Revision(PROJECT, MODULE, ready.binding.changeId, current.revisionId!);
        assert.equal(promoted.promotedRevisionId, adoption.outputRevisionId);
        const moduleRules = mls.stor.files[mls.stor.getKeyToFile({ project: PROJECT, level: 4,
          folder: MODULE, shortName: 'rules', extension: '.defs.ts' })];
        assert.equal(await moduleRules.getContent(), rulesSource);
        assert.match(await moduleRules.getContent(), /quantidadeMinimaValida/);
        assert.match(await moduleRules.getContent(), /maior que zero/);
        for (const info of layers) {
          const file = mls.stor.files[mls.stor.getKeyToFile({ project: PROJECT, ...info })];
          await mls.stor.localStor.setContent(file, { content: 'export const quantidadeMinima = 1;\n' });
        }
        assert.deepEqual((await diffModuleLayers(PROJECT, MODULE, baseId)).map(({ level, path, status }) =>
          ({ level, path, status })), [
          { level: 1, path: 'produto.defs.ts', status: 'changed' },
          { level: 2, path: 'web/produto.defs.ts', status: 'changed' },
        ]);
        await restoreModuleFromSeals(PROJECT, MODULE, baseId);
        assert.deepEqual(await diffModuleLayers(PROJECT, MODULE, baseId), []);
        const release = await readL4Release(PROJECT, MODULE, baseId);
        assert.ok(release);
        for (const [path, sha256] of Object.entries(release.files)) {
          const file = Object.values(mls.stor.files).find(file => file.project === PROJECT && file.level === 4
            && `${file.folder}/${file.shortName}${file.extension}` === `${MODULE}/${path}`);
          const sealedFile = Object.values(mls.stor.files).find(file => file.project === PROJECT && file.level === 4
            && `${file.folder}/${file.shortName}${file.extension}` === `${MODULE}/pipeline/releases/${baseId}/l4/${path}`);
          assert.ok(file, path);
          assert.ok(sealedFile, path);
          const restored = await file.getContent();
          assert.equal(restored, await sealedFile.getContent(), path);
          assert.equal(`sha256:${createHash('sha256').update(restored).digest('hex')}`, sha256, path);
        }
      });
      const displayedHashes = { menu: '', backend: '', effort: '' };
      for (const [name, read] of [['menu', menu], ['backend', backend], ['effort', effort]] as const) {
        const file = Object.values(mls.stor.files).find(file => file.project === PROJECT && file.level === 4
          && `l4/${file.folder}/${file.shortName}${file.extension}` === read.path)!;
        displayedHashes[name] = `sha256:${createHash('sha256').update(await file.getContent()).digest('hex')}`;
      }
      await t.test('mr_10 s4: seal, promotion and local acceptance retain the displayed hashes and changed rule', async () => {
        assert.equal(await readL4Implementation(PROJECT, MODULE), null);
        await sealModuleLayers(PROJECT, MODULE, prepared.input.baseId);
        await promoteL4Revision(PROJECT, MODULE, ready.binding.changeId, current.revisionId!);
        const accepted = await acceptL4Implementation(PROJECT, MODULE, {
          revisionId: current.revisionId!, acceptedBy: 'ensaio', hashes: displayedHashes,
        });
        const reloaded = await readL4Implementation(PROJECT, MODULE);
        assert.deepEqual(reloaded, accepted);
        assert.equal(reloaded!.changeId, ready.binding.changeId);
        assert.equal(reloaded!.revisionId, adoption.outputRevisionId);
        assert.equal(reloaded!.acceptedBy, 'ensaio');
        assert.ok(Number.isFinite(Date.parse(reloaded!.acceptedAt)));
        assert.deepEqual(reloaded!.hashes, displayedHashes);
        assert.deepEqual(reloaded!.phases, []);
        const moduleRules = mls.stor.files[mls.stor.getKeyToFile({ project: PROJECT, level: 4,
          folder: MODULE, shortName: 'rules', extension: '.defs.ts' })];
        assert.equal(await moduleRules.getContent(), rulesSource);
        assert.match(await moduleRules.getContent(), /maior que zero/);
      });
      await t.test('mr_10 s4: divergent acceptance after promotion restores the module to its release', async () => {
        const accepted = await readL4Implementation(PROJECT, MODULE);
        assert.ok(accepted);
        await sealModuleLayers(PROJECT, MODULE, prepared.input.baseId);
        await promoteL4Revision(PROJECT, MODULE, ready.binding.changeId, current.revisionId!);
        const moduleRules = mls.stor.files[mls.stor.getKeyToFile({ project: PROJECT, level: 4,
          folder: MODULE, shortName: 'rules', extension: '.defs.ts' })];
        assert.equal(await moduleRules.getContent(), rulesSource);
        await assert.rejects(async () => {
          try {
            await acceptL4Implementation(PROJECT, MODULE, { revisionId: current.revisionId!, acceptedBy: 'ensaio',
              hashes: { ...displayedHashes, effort: `sha256:${'0'.repeat(64)}` } });
          } catch (error) {
            await restoreModuleFromSeals(PROJECT, MODULE, prepared.input.baseId);
            throw error;
          }
        }, /^Error: l4.implementation_conflict$/);
        assert.deepEqual(await readL4Implementation(PROJECT, MODULE), accepted);
        assert.deepEqual(await diffModuleLayers(PROJECT, MODULE, prepared.input.baseId), []);
        const release = await readL4Release(PROJECT, MODULE, prepared.input.baseId);
        assert.ok(release);
        for (const [path, sha256] of Object.entries(release.files)) {
          const file = Object.values(mls.stor.files).find(file => file.project === PROJECT && file.level === 4
            && `${file.folder}/${file.shortName}${file.extension}` === `${MODULE}/${path}`);
          assert.ok(file, path);
          const restored = await file.getContent();
          assert.equal(restored, scenario.sources.get(path), path);
          assert.equal(`sha256:${createHash('sha256').update(restored).digest('hex')}`, sha256, path);
        }
      });
    }
    assert.equal(fetchCalls(), 0);
  });
});
}


test('mr_24 s3: base with an empty transition by fails publicly without publishing', async () => {
  const originalSources = new Map<string, string>();
  await withReviewScenario(() => installMlsStub({ actualProject: PROJECT }), async ({ before, context, replay, progress, fetchCalls }) => {
    const errorCode = 'review.not_publishable:invalid:NS5_WORKFLOWS_TRANSITION_BY';
    assert.equal(context.task?.status, 'failed');
    const terminalLog = context.task?.last_update_log;
    assert.match(terminalLog ?? '', /^Task failed at \d{4}-\d{2}-\d{2}T[\d:.]+Z \| reason: /);
    assert.equal(terminalLog?.split(' | reason: ')[1], errorCode);
    assert.deepEqual(replay.executedPlans, ['entry10', 'review20', 'reconcile30', 'validate40', 'correction45-attempt-1']);
    assert.ok(!replay.executedPlans.includes('finalize50'));
    const after = await candidateRead({ project: PROJECT, moduleName: MODULE });
    assert.deepEqual(after.pointer, before.pointer);
    assert.deepEqual(after.snapshot, before.snapshot);
    assert.equal(progress.status, 'failed');
    assert.equal(progress.errorCode, terminalLog);
    assert.equal(fetchCalls(), 0);
    for (const [path, source] of originalSources) {
      assert.equal(readFileSync(new URL(`l4/${path}`, FIXTURE), 'utf8'), source, path);
    }
    // This assertion calls the real presentation method without mounting the Lit component.
    const loader = NodeModule as unknown as { _load: (request: string, ...args: unknown[]) => unknown };
    const previousLoad = loader._load;
    try {
      loader._load = function (request, ...args) {
        if (request === 'lit/decorators.js') return { customElement: () => () => undefined,
          property: () => () => undefined, state: () => () => undefined, query: () => () => undefined };
        return previousLoad.call(this, request, ...args);
      };
      const { NewReleaseReview102035 } = await import('../newRelease/widgets/review.js');
      const review = NewReleaseReview102035.prototype as unknown as {
        reviewRunErrorKey(code: string): string;
        tReviewRunError(code: string): string;
      };
      const presentation = Object.create(review);
      presentation.t = (key: string, params?: { status: string; codes: string }) => JSON.stringify({ key, ...params });
      for (const status of ['invalid', 'unsupported']) {
        const codes = 'NS5_WORKFLOWS_TRANSITION_BY,NS5_GATE_TWO';
        const direct = `review.not_publishable:${status}:${codes}`;
        for (const code of [direct, `Task failed at 2026-10-07T22:52:33.100Z | reason: ${direct}`]) {
          assert.equal(review.reviewRunErrorKey(code), 'review.run.error.notPublishable');
          assert.deepEqual(JSON.parse(presentation.tReviewRunError(code)), {
            key: 'review.run.error.notPublishable', status, codes,
          });
        }
      }
      assert.equal(review.reviewRunErrorKey(progress.errorCode!), 'review.run.error.notPublishable');
      assert.deepEqual(JSON.parse(presentation.tReviewRunError(progress.errorCode!)), {
        key: 'review.run.error.notPublishable', status: 'invalid', codes: 'NS5_WORKFLOWS_TRANSITION_BY',
      });
      for (const code of [errorCode + ':texto livre', errorCode + ',texto livre',
        'review.not_publishable:invalid:A,B,C,D,E,F']) {
        assert.deepEqual(JSON.parse(presentation.tReviewRunError(code)), { key: 'review.run.error.generic' });
      }
    } finally { loader._load = previousLoad; }
  }, sources => {
    for (const entry of sources) originalSources.set(...entry);
    // The captured base has no process or transition. Add a coherent pair in memory,
    // then empty only the ontology transition's by to reproduce the measured defect.
    const transition = { transitionId: 'inativarProduto', from: ['Active'], to: 'Inactive',
      by: ['system'], description: 'Inativa o produto pelo processo.', payload: [] };
    transition.by = [];
    sources.set('ontology/Produto.defs.ts', sources.get('ontology/Produto.defs.ts')!.replace(
      '"relationships": {', `"transitions": ${JSON.stringify([transition])},\n  "relationships": {`));
    const process = { processId: 'inativarProduto', title: 'Inativar produto', description: 'Inativa um produto agendado.',
      trigger: { kind: 'scheduled', schedule: 'Diariamente' }, tasks: [{ taskId: 'inativar', kind: 'mechanical',
        entityRef: 'Produto', effect: 'transition', transitionRef: 'inativarProduto', next: [],
        description: 'Inativa o produto.' }] };
    sources.set('workflows.defs.ts', sources.get('workflows.defs.ts')!.replace(
      '"processes": []', `"processes": ${JSON.stringify([process])}`));
  });
});
