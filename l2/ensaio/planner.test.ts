/// <mls fileReference="_102035_/l2/ensaio/planner.test.ts" enhancement="_blank" />

import test from 'node:test';
import { installMlsStub } from '../../../test/mlsStub.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as plannerL4 from '/_102035_/l2/agentPlannerL4/agentPlannerL4.js';
import * as plannerL2 from '/_102020_/l2/agentPlannerL2/agentPlannerL2.js';
import * as plannerL1 from '/_102021_/l2/agentPlannerL1/agentPlannerL1.js';
import { withReviewScenario, FIXTURE, MODULE } from './cenario.js';
import { candidateRead } from '../solution/candidate/candidateGateway.js';
import { writeJson } from '../solution/fs.js';
import { runUntilDone } from './hostSimulado.js';

test('recorded planners keep their artifacts under the reviewed candidate', async () => {
  await withReviewScenario(() => installMlsStub({ actualProject: 102047 }), async ({ context, fetchCalls }) => {
    await writeJson({ project: 102047, level: 5, folder: '', shortName: 'config', extension: '.json' }, { workspaceDependencies: ['102047', '102020', '102035', '102021'], projects: { '102020': { root: '../mls-102020', type: 'lib' }, '102021': { root: '../mls-102021', type: 'lib' } } });
    for (const [project, path] of [
      [102020, 'agentPlannerL2/agentPlannerL2.ts'],
      [102021, 'agentPlannerL1/agentPlannerL1.ts'],
      [102020, 'agentPlannerL2/skills/menu.md'],
      [102020, 'agentPlannerL2/steps/menu20/prompt.md'],
      [102020, 'agentPlannerL2/schemas/menu.schema.json'],
    ] as const) {
      const slash = path.lastIndexOf('/');
      const dot = path.lastIndexOf('.');
      const file = await mls.stor.addOrUpdateFile({ project, level: 2, folder: path.slice(0, slash),
        shortName: path.slice(slash + 1, dot), extension: path.slice(dot) } as mls.stor.IFileInfo);
      await mls.stor.localStor.setContent(file, { content: readFileSync(new URL(`../../../mls-${project}/l2/${path}`, import.meta.url), 'utf8') });
    }
    const reviewed = await candidateRead({ project: 102047, moduleName: MODULE });
    assert.ok(reviewed.pointer);
    const candidate = `${MODULE}/pipeline/changes/${reviewed.pointer.changeId}/revisions/${reviewed.pointer.revisionId}/l4`;
    const command = `@@agentPlannerL4 ${MODULE} /candidate ${candidate}`;
    const menu = JSON.parse(readFileSync(new URL('answers/menu20/menu-1.json', FIXTURE), 'utf8')).raw;
    const plan = JSON.parse(readFileSync(new URL('answers/plan20/plan-1.json', FIXTURE), 'utf8'));
    const replay = await runUntilDone(plannerL4, { ...context, task: undefined,
      message: { ...context.message, content: command } }, { menu20: menu, plan20: plan }, [plannerL2, plannerL1]);
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
