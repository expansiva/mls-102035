/// <mls fileReference="_102035_/l2/ensaio/implementacao.test.ts" enhancement="_blank" />

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { installMlsStub } from '../../../test/mlsStub.js';
import { createImplementationRunner } from '../newRelease/helpers/implementationRunner.js';
import { acceptL4Implementation, readL4Implementation } from '../solution/candidate/moduleImplementation.js';
import { adoptL4ReviewResult, promoteL4Revision, readActiveSealedL4Candidate, readL4Release } from '../solution/candidate/moduleRevision.js';
import { diffModuleLayers, restoreModuleFromSeals, sealModuleLayers } from '../solution/candidate/moduleLayers.js';
import { readSourceText } from '../solution/fs.js';
import { readModuleMenu } from '../newRelease/helpers/menuReader.js';
import { readReviewArtifact } from '../newRelease/helpers/backendReader.js';
import { createSimulatedDefsHost, withReviewScenario, runPlannerScenario, PROJECT, MODULE } from './cenario.js';

for (const outcome of ['done', 'failed', 'running'] as const) {
  test(`mr_11 s3: accepted implementation with simulated defs ${outcome}`, async () => {
    await withReviewScenario(() => installMlsStub({ actualProject: PROJECT }), async scenario => {
      const planner = await runPlannerScenario(scenario.context);
      assert.equal(planner.context.task?.status, 'done');
      const candidate = await readActiveSealedL4Candidate(PROJECT, MODULE);
      assert.ok(candidate);
      const revisionId = candidate.manifest.revisionId;
      await adoptL4ReviewResult(PROJECT, MODULE, {
        inputRevisionId: scenario.selection.revisionId, outputRevisionId: revisionId,
      });
      const hashes = { menu: '', backend: '', effort: '' };
      for (const name of ['menu', 'backend', 'effort'] as const) {
        const artifact = name === 'menu' ? await readModuleMenu(PROJECT, MODULE, planner.candidate)
          : await readReviewArtifact(PROJECT, MODULE, name, planner.candidate);
        const file = Object.values(mls.stor.files).find(file => file.project === PROJECT && file.level === 4
          && `l4/${file.folder}/${file.shortName}${file.extension}` === artifact.path);
        assert.ok(file, name);
        const source = await readSourceText(file);
        assert.ok(source, name);
        hashes[name] = `sha256:${createHash('sha256').update(source).digest('hex')}`;
      }
      const baseId = scenario.prepared.input.baseId;
      await sealModuleLayers(PROJECT, MODULE, baseId);
      await promoteL4Revision(PROJECT, MODULE, scenario.selection.changeId, revisionId);
      const accepted = await acceptL4Implementation(PROJECT, MODULE, { revisionId, acceptedBy: 'ensaio', hashes });
      assert.deepEqual(accepted.phases, []);
      const host = createSimulatedDefsHost(outcome);
      let runner = createImplementationRunner(host.dependencies);
      let record = await runner.runNext(PROJECT, MODULE);
      if (outcome === 'failed') {
        assert.equal(record.phases[0].status, 'failed');
        assert.equal(record.phases[0].error, 'Simulated L2 failure');
        runner = createImplementationRunner(host.dependencies);
        await runner.runNext(PROJECT, MODULE);
        assert.deepEqual(host.dispatched, [`@@agentDefsL2 ${MODULE}`]);
        assert.deepEqual(await diffModuleLayers(PROJECT, MODULE, baseId), []);
      } else {
        if (outcome === 'running') {
          assert.equal(record.phases[0].status, 'running');
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
    });
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
