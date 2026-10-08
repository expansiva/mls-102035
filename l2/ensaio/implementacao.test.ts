/// <mls fileReference="_102035_/l2/ensaio/implementacao.test.ts" enhancement="_blank" />

import test from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import type { L4ImplementationRecord } from '../solution/candidate/moduleImplementation.js';
import { implementationProgress } from '../newRelease/widgets/reviewModel.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { installMlsStub } from '../../../test/mlsStub.js';
import { createImplementationRunner } from '../newRelease/helpers/implementationRunner.js';
import { acceptL4Implementation, readL4Implementation } from '../solution/candidate/moduleImplementation.js';
import { adoptL4ReviewResult, promoteL4Revision, readL4Release } from '../solution/candidate/moduleRevision.js';
import { diffModuleLayers, restoreModuleFromSeals, sealModuleLayers } from '../solution/candidate/moduleLayers.js';
import { readSourceText } from '../solution/fs.js';
import { readModuleMenu } from '../newRelease/helpers/menuReader.js';
import { readReviewArtifact } from '../newRelease/helpers/backendReader.js';
import { createSimulatedDefsHost, withReviewScenario, runPlannerScenario, PROJECT, MODULE } from './cenario.js';
import { effortRegistry } from '../solution/effortRegistry.js';
import type { ChangeEffortFile, EffortAnswer } from '../solution/poolPlan.js';

async function withSimpleEffort<T>(run: () => Promise<T>): Promise<T> {
  const golden = JSON.parse(readFileSync(new URL(
    '../solution/fixtures/changeEffort/agendaClinica-regra-anotacao/changeEffort.json', import.meta.url), 'utf8')) as ChangeEffortFile;
  const previous = { ...effortRegistry };
  for (const answer of golden.perItem[0].answers) {
    effortRegistry[answer.master.project] = {
      describeEffort: input => ({ ...structuredClone(answer), item: input.item.changeId }) as EffortAnswer,
    };
  }
  try { return await run(); }
  finally {
    for (const project of Object.keys(effortRegistry)) delete effortRegistry[project];
    Object.assign(effortRegistry, previous);
  }
}

const qaRecords: Record<string, L4ImplementationRecord> = {};
function captureQa(name: string, record: L4ImplementationRecord) {
  const copy = structuredClone(record);
  copy.changeId = 'qa-implementation-change';
  copy.revisionId = 'qa-implementation-revision';
  // Artifact hashes include generated revision IDs; neither is displayed by this QA matrix.
  copy.hashes = { changeEffort: 'sha256:' + '0'.repeat(64) };
  copy.acceptedAt = '2026-10-08T00:00:00.000Z';
  for (const phase of copy.phases) for (const attempt of [phase, ...(phase.previousAttempts ?? [])]) {
    attempt.startedAt = copy.acceptedAt;
    if (attempt.endedAt) attempt.endedAt = copy.acceptedAt;
  }
  qaRecords[name] = copy;
}

for (const outcome of ['done', 'failed', 'running'] as const) {
  test(`mr_11 s3: accepted implementation with simulated defs ${outcome}`, async () => {
    await withSimpleEffort(() => withReviewScenario(() => installMlsStub({ actualProject: PROJECT }), async scenario => {
      const planner = await runPlannerScenario(scenario.context);
      assert.equal(planner.context.task?.status, 'done');
      const revisionId = planner.reviewed.pointer!.revisionId;
      await adoptL4ReviewResult(PROJECT, MODULE, {
        inputRevisionId: scenario.selection.revisionId, outputRevisionId: revisionId,
      });
      const effortInfo = { project: PROJECT, level: 4,
        folder: `${planner.candidate}/pool/l4`,
        shortName: 'changeEffort', extension: '.json' };
      const effortFile = mls.stor.files[mls.stor.getKeyToFile(effortInfo)];
      assert.ok(effortFile);
      const effortSource = await effortFile.getContent();
      assert.equal((JSON.parse(effortSource) as ChangeEffortFile).status, 'simple');
      const hashes = { changeEffort: `sha256:${createHash('sha256').update(effortSource).digest('hex')}` };
      const baseId = scenario.prepared.input.baseId;
      await sealModuleLayers(PROJECT, MODULE, baseId);
      await promoteL4Revision(PROJECT, MODULE, scenario.selection.changeId, revisionId);
      const accepted = await acceptL4Implementation(PROJECT, MODULE, { revisionId, acceptedBy: 'ensaio', hashes });
      assert.deepEqual(accepted.phases, []);
      if (outcome === 'done') captureQa('implementation-waiting', accepted);
      const host = createSimulatedDefsHost(outcome === 'running' ? { defsL2: 'running', defsL1: 'running' } : outcome);
      let runner = createImplementationRunner(host.dependencies);
      let record = await runner.runNext(PROJECT, MODULE);
      if (outcome === 'failed') {
        assert.equal(record.phases[0].status, 'failed');
        assert.equal(record.phases[0].error, 'Simulated L2 failure');
        captureQa('implementation-retry', record);
        runner = createImplementationRunner(host.dependencies);
        await runner.runNext(PROJECT, MODULE);
        assert.deepEqual(host.dispatched, [`@@agentDefsL2 ${MODULE}`]);
        assert.deepEqual(await diffModuleLayers(PROJECT, MODULE, baseId), []);
        record = await runner.retryPhase(PROJECT, MODULE, 'defsL2');
        assert.equal(record.phases[0].attempt, 2);
        assert.equal(record.phases[0].previousAttempts?.length, 1);
        captureQa('implementation-failed', record);
      } else {
        if (outcome === 'running') {
          assert.equal(record.phases[0].status, 'running');
          captureQa('implementation-l2', record);
          const taskId = record.phases[0].taskId;
          runner = createImplementationRunner(host.dependencies);
          record = await runner.runNext(PROJECT, MODULE);
          assert.equal(record.phases[0].status, 'running');
          assert.equal(record.phases[0].taskId, taskId);
          assert.deepEqual(host.dispatched, [`@@agentDefsL2 ${MODULE}`]);
          await host.complete(taskId);
          record = await runner.runNext(PROJECT, MODULE);
          assert.equal(host.dispatched.length, 1);
        }
        assert.equal(record.phases[0].status, 'done');
        record = await runner.runNext(PROJECT, MODULE);
        if (outcome === 'running') {
          assert.equal(record.phases[1].status, 'running');
          captureQa('implementation-l1', record);
          await host.complete(record.phases[1].taskId);
          record = await runner.runNext(PROJECT, MODULE);
        }
        if (outcome === 'done') {
          captureQa('implementation-success', record);
          captureQa('implementation-stale', record);
          qaRecords['implementation-stale'].changeId = 'qa-obsolete-change';
          assert.ok(implementationProgress(qaRecords['implementation-stale'], 'qa-implementation-change').every(phase => phase.status === 'aguardando'));
        }
        assert.deepEqual(record.phases.map(phase => [phase.name, phase.status]), [['defsL2', 'done'], ['defsL1', 'done']]);
        assert.deepEqual(record.phases.map(phase => phase.changedDefs), [
          [{ path: 'web/ensaio.defs.ts', status: 'added' }], [{ path: 'ensaio.defs.ts', status: 'added' }],
        ]);
        assert.deepEqual(await readL4Implementation(PROJECT, MODULE), record);
        await runner.runNext(PROJECT, MODULE);
        assert.deepEqual(host.dispatched, [`@@agentDefsL2 ${MODULE}`, `@@agentDefsL1 ${MODULE} /run`]);
        assert.deepEqual((await diffModuleLayers(PROJECT, MODULE, baseId)).map(({ level, path, status }) => ({ level, path, status })), [
          { level: 1, path: 'ensaio.defs.ts', status: 'added' }, { level: 2, path: 'web/ensaio.defs.ts', status: 'added' },
        ]);
      }
      await restoreModuleFromSeals(PROJECT, MODULE, baseId);
      assert.deepEqual(await diffModuleLayers(PROJECT, MODULE, baseId), []);
      const release = await readL4Release(PROJECT, MODULE, baseId);
      assert.ok(release);
      for (const [path, hash] of Object.entries(release.files)) {
        const file = Object.values(mls.stor.files).find(file => file.project === PROJECT && file.level === 4
          && `${file.folder}/${file.shortName}${file.extension}` === `${MODULE}/${path}`);
        assert.ok(file, path);
        const source = await file.getContent();
        assert.equal(source, scenario.sources.get(path));
        assert.equal(`sha256:${createHash('sha256').update(source).digest('hex')}`, hash);
      }
      assert.equal(scenario.fetchCalls(), 0);
    }));
  });
}

test('mr_11 s3: simulated defs reject commands outside the exact table', async () => {
  const host = createSimulatedDefsHost();
  for (const [agent, content] of [
    ['agentDefsL2', `@@agentDefsL2 ${MODULE} /candidate`],
    ['agentDefsL1', `@@agentDefsL1 ${MODULE}`],
  ]) {
    const context = host.dependencies.context!('thread', 'ensaio', content);
    await assert.rejects(host.dependencies.execute!(agent, context), { name: 'AssertionError' });
  }
  assert.deepEqual(host.dispatched, []);
});

test('mr_12 s3: exported QA JSON matches the simulated implementation states', () => {
  assert.equal(Object.keys(qaRecords).length, 7);
  const fixture = new URL('../newRelease/fixtures/implementation.json', import.meta.url);
  // Explicit regeneration only; normal RT always checks the committed fixture.
  if (process.env.UPDATE_IMPLEMENTATION_QA === '1') writeFileSync(fixture, JSON.stringify(qaRecords, null, 2) + '\n');
  assert.deepEqual(JSON.parse(readFileSync(fixture, 'utf8')), qaRecords);
});
