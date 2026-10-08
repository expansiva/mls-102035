/// <mls fileReference="_102035_/l2/ensaio/implementacao.test.ts" enhancement="_blank" />
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { installMlsStub } from '../../../test/mlsStub.js';
import { createImplementationRunner } from '../newRelease/helpers/implementationRunner.js';
import { acceptL4Implementation, readL4Implementation, type L4ImplementationRecord } from '../solution/candidate/moduleImplementation.js';
import { adoptL4ReviewResult, promoteL4Revision, readL4Release } from '../solution/candidate/moduleRevision.js';
import { diffModuleLayers, restoreModuleFromSeals, sealModuleLayers } from '../solution/candidate/moduleLayers.js';
import { createSimulatedDefsHost, withReviewScenario, runPlannerScenario, PROJECT, MODULE } from './cenario.js';
import { effortRegistry } from '../solution/effortRegistry.js';
import type { ChangeEffortFile, EffortAnswer } from '../solution/poolPlan.js';

const languageCommand = '@@agentAddLanguage ' + JSON.stringify([{
  languages: [{ code: 'pt-BR', name: 'pt-BR' }], projectId: PROJECT, moduleName: MODULE,
}]);

async function withEffort<T>(mode: 'rule' | 'agent' | 'both', run: () => Promise<T>): Promise<T> {
  const golden = JSON.parse(readFileSync(new URL(
    '../solution/fixtures/changeEffort/agendaClinica-regra-anotacao/changeEffort.json', import.meta.url), 'utf8')) as ChangeEffortFile;
  const previous = { ...effortRegistry };
  for (const original of golden.perItem[0].answers) {
    effortRegistry[original.master.project] = { describeEffort: input => {
      const answer = { ...structuredClone(original), item: input.item.changeId } as EffortAnswer;
      if (mode !== 'rule') {
        if (mode === 'agent') answer.materialize = [];
        answer.runAgents = original.master.kind === 'l2' ? [{ agent: 'agentAddLanguage', command: languageCommand }] : [];
      }
      return answer;
    } };
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
  copy.hashes = { changeEffort: 'sha256:' + '0'.repeat(64) };
  copy.acceptedAt = '2026-10-08T00:00:00.000Z';
  for (const phase of copy.phases) for (const attempt of [phase, ...(phase.previousAttempts ?? [])]) {
    attempt.startedAt = copy.acceptedAt;
    if (attempt.endedAt) attempt.endedAt = copy.acceptedAt;
  }
  qaRecords[name] = copy;
}

async function acceptedScenario(mode: 'rule' | 'agent' | 'both', run: (record: L4ImplementationRecord) => Promise<void>) {
  await withEffort(mode, () => withReviewScenario(() => installMlsStub({ actualProject: PROJECT }), async scenario => {
    const planner = await runPlannerScenario(scenario.context);
    assert.equal(planner.context.task?.status, 'done');
    const revisionId = planner.reviewed.pointer!.revisionId;
    await adoptL4ReviewResult(PROJECT, MODULE, {
      inputRevisionId: scenario.selection.revisionId, outputRevisionId: revisionId,
    });
    const effortInfo = { project: PROJECT, level: 4, folder: `${planner.candidate}/pool/l4`,
      shortName: 'changeEffort', extension: '.json' };
    const effortFile = mls.stor.files[mls.stor.getKeyToFile(effortInfo)];
    assert.ok(effortFile);
    const source = await effortFile.getContent();
    const effort = JSON.parse(source) as ChangeEffortFile;
    assert.equal(effort.status, 'simple');
    const baseId = scenario.prepared.input.baseId;
    await sealModuleLayers(PROJECT, MODULE, baseId);
    await promoteL4Revision(PROJECT, MODULE, scenario.selection.changeId, revisionId);
    const record = await acceptL4Implementation(PROJECT, MODULE, { revisionId, acceptedBy: 'ensaio',
      hashes: { changeEffort: `sha256:${createHash('sha256').update(source).digest('hex')}` } });
    assert.deepEqual(record.merged, effort.merged);
    await run(record);
    await restoreModuleFromSeals(PROJECT, MODULE, baseId);
    assert.deepEqual(await diffModuleLayers(PROJECT, MODULE, baseId), []);
    const release = await readL4Release(PROJECT, MODULE, baseId);
    assert.ok(release);
    for (const [path, hash] of Object.entries(release.files)) {
      const file = Object.values(mls.stor.files).find(file => file.project === PROJECT && file.level === 4
        && `${file.folder}/${file.shortName}${file.extension}` === `${MODULE}/${path}`);
      assert.ok(file, path);
      const content = await file.getContent();
      assert.equal(content, scenario.sources.get(path));
      assert.equal(`sha256:${createHash('sha256').update(content).digest('hex')}`, hash);
    }
    assert.equal(scenario.fetchCalls(), 0);
  }));
}

test('accepted rule keeps materialization list and dispatches no phase', async () => {
  await acceptedScenario('rule', async accepted => {
    const golden = JSON.parse(readFileSync(new URL('../solution/fixtures/changeEffort/agendaClinica-regra-anotacao/changeEffort.json', import.meta.url), 'utf8')) as ChangeEffortFile;
    assert.deepEqual(accepted.merged.materialize, golden.merged.materialize);
    assert.deepEqual(accepted.merged.runAgents, []);
    const host = createSimulatedDefsHost();
    const record = await createImplementationRunner(host.dependencies).runNext(PROJECT, MODULE);
    assert.deepEqual(record.phases, []);
    assert.deepEqual(host.dispatched, []);
    captureQa('implementation-materialize', record);
    assert.deepEqual(await readL4Implementation(PROJECT, MODULE), record);
  });
});

test('accepted materialization and language instruction wait without dispatch', async () => {
  await acceptedScenario('both', async accepted => {
    assert.equal(accepted.merged.materialize.length, 4);
    assert.deepEqual(accepted.merged.runAgents, [{ agent: 'agentAddLanguage', command: languageCommand }]);
    const host = createSimulatedDefsHost();
    const record = await createImplementationRunner(host.dependencies).runNext(PROJECT, MODULE);
    assert.deepEqual(record.phases, []);
    assert.deepEqual(host.dispatched, []);
    captureQa('implementation-materialize-agent', record);
  });
});

for (const outcome of ['done', 'failed', 'running'] as const) {
  test(`accepted simulated language instruction ${outcome}`, async () => {
    await acceptedScenario('agent', async accepted => {
      assert.deepEqual(accepted.merged.materialize, []);
      assert.deepEqual(accepted.merged.runAgents, [{ agent: 'agentAddLanguage', command: languageCommand }]);
      assert.deepEqual(accepted.phases, []);
      if (outcome === 'done') captureQa('implementation-waiting', accepted);
      const host = createSimulatedDefsHost(outcome);
      let runner = createImplementationRunner(host.dependencies);
      let record = await runner.runNext(PROJECT, MODULE);
      if (outcome === 'failed') {
        assert.equal(record.phases[0].status, 'failed');
        assert.equal(record.phases[0].error, 'Simulated language failure');
        captureQa('implementation-retry', record);
        runner = createImplementationRunner(host.dependencies);
        await runner.runNext(PROJECT, MODULE);
        assert.deepEqual(host.dispatched, [languageCommand]);
        record = await runner.retryPhase(PROJECT, MODULE, 'runAgents:0');
        assert.equal(record.phases[0].attempt, 2);
        assert.equal(record.phases[0].previousAttempts?.length, 1);
        captureQa('implementation-failed', record);
      } else {
        if (outcome === 'running') {
          assert.equal(record.phases[0].status, 'running');
          captureQa('implementation-running', record);
          const id = record.phases[0].taskId;
          runner = createImplementationRunner(host.dependencies);
          record = await runner.runNext(PROJECT, MODULE);
          assert.equal(record.phases[0].taskId, id);
          assert.deepEqual(host.dispatched, [languageCommand]);
          await host.complete(id);
          record = await runner.runNext(PROJECT, MODULE);
        }
        assert.deepEqual(record.phases.map(phase => [phase.name, phase.status]), [['runAgents:0', 'done']]);
        assert.deepEqual(record.phases[0].changedDefs, []);
        if (outcome === 'done') {
          captureQa('implementation-success', record);
          captureQa('implementation-stale', record);
          qaRecords['implementation-stale'].changeId = 'qa-obsolete-change';
        }
        await runner.runNext(PROJECT, MODULE);
        assert.deepEqual(host.dispatched, [languageCommand]);
      }
      assert.deepEqual(await readL4Implementation(PROJECT, MODULE), record);
    });
  });
}

test('simulated host rejects commands outside the accepted language command', async () => {
  const host = createSimulatedDefsHost();
  for (const [agent, content] of [
    ['agentAddLanguage', `@@agentAddLanguage ${JSON.stringify([{ languages: [], projectId: PROJECT, moduleName: MODULE, force: true }])}`],
    ['agentDefsL2', `@@agentDefsL2 ${MODULE}`],
  ]) {
    const context = host.dependencies.context!('thread', 'ensaio', content);
    await assert.rejects(host.dependencies.execute!(agent, context), { name: 'AssertionError' });
  }
  assert.deepEqual(host.dispatched, []);
});

test('exported QA JSON matches simulated implementation states', () => {
  assert.equal(Object.keys(qaRecords).length, 8);
  const fixture = new URL('../newRelease/fixtures/implementation.json', import.meta.url);
  if (process.env.UPDATE_IMPLEMENTATION_QA === '1') writeFileSync(fixture, JSON.stringify(qaRecords, null, 2) + '\n');
  assert.deepEqual(JSON.parse(readFileSync(fixture, 'utf8')), qaRecords);
});
