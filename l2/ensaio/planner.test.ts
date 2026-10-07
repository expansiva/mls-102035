/// <mls fileReference="_102035_/l2/ensaio/planner.test.ts" enhancement="_blank" />

import test from 'node:test';
import { installMlsStub } from '../../../test/mlsStub.js';
import assert from 'node:assert/strict';
import { withReviewScenario, runPlannerScenario, MODULE } from './cenario.js';

test('recorded planners keep their artifacts under the reviewed candidate', async () => {
  await withReviewScenario(() => installMlsStub({ actualProject: 102047 }), async ({ context, fetchCalls }) => {
    const { reviewed, candidate, replay } = await runPlannerScenario(context);
    assert.ok(replay.executedPlans.includes('entry10'),
      replay.steps.filter(step => step.type === 'result').map(step => step.result).join('\n'));
    assert.equal(replay.intents.filter(intent => intent.type === 'add-message-ai').length, 1);
    for (const planId of ['menu20', 'needs30', 'plan20', 'effort40']) {
      assert.ok(replay.executedPlans.includes(planId), `Missing planner step ${planId}`);
    }
    const files = Object.values(mls.stor.files).filter(file => file.project === 102047);
    assert.equal(files.filter(file => file.level === 1 || file.level === 2).length, 0);
    const artifactPaths = ['l2/web/menu', 'l2/web/backend', 'l2/web/effort', 'l2/web/l4diff', 'l1/web/needs'];
    for (const path of artifactPaths) {
      const slash = path.lastIndexOf('/');
      const matches = files.filter(file => file.level === 4 && file.extension === '.json'
        && file.shortName === path.slice(slash + 1) && file.folder.endsWith(`/pool/${path.slice(0, slash)}`));
      assert.equal(matches.length, 1, path);
      assert.equal(matches[0].folder, `${candidate}/pool/${path.slice(0, slash)}`);
      const artifact = JSON.parse(await matches[0].getContent());
      assert.equal(artifact.moduleName, MODULE);
      if (path.endsWith('/l4diff')) {
        assert.equal(artifact.candidate, candidate);
        assert.equal(artifact.revision.revisionId, reviewed.pointer.revisionId);
        assert.deepEqual(artifact.items, [{
          changeId: 'rule:quantidadeMinimaValida', kind: 'rule', op: 'changed', entity: '', source: 'rules.defs.ts',
          before: { ruleId: 'quantidadeMinimaValida', description: 'A quantidade mínima definida para um produto deve ser maior ou igual a zero.' },
          after: { ruleId: 'quantidadeMinimaValida', description: 'A quantidade mínima definida para um produto deve ser maior que zero.' },
        }]);
      }
    }
    assert.equal(fetchCalls(), 0);
  });
});
