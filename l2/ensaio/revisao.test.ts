/// <mls fileReference="_102035_/l2/ensaio/revisao.test.ts" enhancement="_blank" />

import test from 'node:test';
import { installMlsStub } from '../../../test/mlsStub.js';
import assert from 'node:assert/strict';
import { candidateRead } from '../solution/candidate/candidateGateway.js';
import { withReviewScenario, PROJECT, MODULE } from './cenario.js';

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
