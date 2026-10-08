/// <mls fileReference="_102035_/l2/ensaio/planner.test.ts" enhancement="_blank" />

import test from 'node:test';
import { readFileSync } from 'node:fs';
import { installMlsStub } from '../../../test/mlsStub.js';
import assert from 'node:assert/strict';
import { effortRegistry, resolveDescribeEffort, setDescribeEffortImporter } from '/_102035_/l2/solution/effortRegistry.js';
import { mergeChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import { writeJson } from '/_102035_/l2/solution/fs.js';
import { listPoolBox } from '/_102035_/l2/solution/pool.js';
import type { ChangeEffortFile, EffortAnswer, EffortInput } from '/_102035_/l2/solution/poolPlan.js';
import { installAgendaClinicaEffortFixture, withReviewScenario, runPlannerScenario, MODULE } from './cenario.js';

const GOLDEN = JSON.parse(readFileSync(new URL(
  '../solution/fixtures/changeEffort/agendaClinica-regra-anotacao/changeEffort.json',
  import.meta.url,
), 'utf8')) as ChangeEffortFile;

function snapshotRegistry(): () => void {
  const previous = { ...effortRegistry };
  return () => {
    for (const project of Object.keys(effortRegistry)) delete effortRegistry[project];
    Object.assign(effortRegistry, previous);
  };
}

function installGoldenRegistry(): void {
  for (const project of Object.keys(effortRegistry)) delete effortRegistry[project];
  for (const answer of GOLDEN.perItem[0]?.answers ?? []) {
    const recorded = answer;
    effortRegistry[recorded.master.project] = {
      describeEffort: (input) => ({ ...recorded, item: input.item.changeId }) as EffortAnswer,
    };
  }
}

/** The ensaio item is not the fixture changeId; units, status and merged are. */
function answersWithoutItem(file: ChangeEffortFile): Omit<EffortAnswer, 'item'>[][] {
  return file.perItem.map(row => row.answers.map(({ item: _item, ...answer }) => answer));
}

/** The round consumes the box; the dispatch and the L2 entry still name the message. */
function assertL2DispatchMessage(replay: { steps: { type: string; result?: string | null }[] }): void {
  const results = replay.steps
    .filter(step => step.type === 'result' && step.result)
    .map(step => JSON.parse(String(step.result)) as { completedStep?: string; status?: string; invokeCount?: number; messageFile?: string });
  const dispatch = results.find(row => row.completedStep === 'dispatch20');
  assert.ok(dispatch);
  assert.match(String(dispatch.status), /pool\/l2/);
  assert.equal(dispatch.invokeCount, 1);
  const l2Entry = results.find(row => row.completedStep === 'entry10' && String(row.messageFile || '').includes('/pool/l2/'));
  assert.ok(l2Entry);
  assert.match(String(l2Entry.messageFile), /\/pool\/l2\/\d{14}_/);
}

test('maintenance with the agendaClinica gabarito records changeEffort and the L2 message', async () => {
  const restore = snapshotRegistry();
  installGoldenRegistry();
  try {
  await withReviewScenario(() => installMlsStub({ actualProject: 102047 }), async ({ context, fetchCalls }) => {
    const { reviewed, candidate, replay, context: planner } = await runPlannerScenario(context);
    assert.ok(replay.executedPlans.includes('entry10'),
      replay.steps.filter(step => step.type === 'result').map(step => step.result).join('\n'));
    assert.equal(replay.intents.filter(intent => intent.type === 'add-message-ai').length, 1);
    assert.equal(planner.task?.status, 'done');
    assertL2DispatchMessage(replay);
    const files = Object.values(mls.stor.files).filter(file => file.project === 102047);
    const effort = files.find(file => file.level === 4 && file.shortName === 'changeEffort'
      && file.folder === `${candidate}/pool/l4`);
    assert.ok(effort, 'changeEffort.json missing');
    const written = JSON.parse(await effort.getContent()) as ChangeEffortFile;
    assert.equal(written.status, GOLDEN.status);
    assert.deepEqual(written.merged, GOLDEN.merged);
    assert.deepEqual(answersWithoutItem(written), answersWithoutItem(GOLDEN));
    const artifactPaths = ['l2/web/l4diff', 'l1/web/l4diff'];
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
  } finally {
    restore();
  }
});

test('agendaClinica effort comes from the real How modules and matches the golden fixture', async () => {
  const restore = snapshotRegistry();
  for (const project of Object.keys(effortRegistry)) delete effortRegistry[project];
  try {
    await withReviewScenario(() => installMlsStub({ actualProject: 102047 }), async () => {
      setDescribeEffortImporter(undefined);
      await installAgendaClinicaEffortFixture();
      const item = GOLDEN.request.items[0];
      assert.ok(item);
      const input: EffortInput = { module: GOLDEN.module, base: GOLDEN.base, item };
      const answers: EffortAnswer[] = [];
      for (const master of GOLDEN.masters) {
        const describeEffort = await resolveDescribeEffort(master.project);
        assert.ok(describeEffort, master.project);
        answers.push(await describeEffort(input));
      }
      const perItem = [{ item: item.changeId, answers }];
      const merged = mergeChangeEffort(perItem);
      const file: ChangeEffortFile = {
        ...GOLDEN,
        perItem,
        merged,
        status: merged.abend.length > 0 ? 'blocked' : 'simple',
      };
      await writeJson({
        project: 102047, level: 4, folder: 'agendaClinica/pool/l4', shortName: 'changeEffort', extension: '.json',
      }, file);
      const writtenFile = Object.values(mls.stor.files).find(entry => entry.project === 102047
        && entry.level === 4 && entry.shortName === 'changeEffort' && entry.extension === '.json'
        && entry.folder === 'agendaClinica/pool/l4');
      assert.ok(writtenFile);
      const written = JSON.parse(await writtenFile.getContent()) as ChangeEffortFile;
      const byUnit = (file: ChangeEffortFile) => file.perItem.map(row => row.answers.map(answer => ({
        ...answer,
        materialize: [...answer.materialize].sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id)),
      })));
      assert.equal(written.status, GOLDEN.status);
      assert.deepEqual(written.merged, GOLDEN.merged);
      assert.deepEqual(byUnit(written), byUnit(GOLDEN));
    });
  } finally {
    restore();
  }
});

test('maintenance with an empty effort registry records blocked and still writes the L2 message', async () => {
  const restore = snapshotRegistry();
  for (const project of Object.keys(effortRegistry)) delete effortRegistry[project];
  try {
  await withReviewScenario(() => installMlsStub({ actualProject: 102047 }), async ({ context }) => {
    const { candidate, replay, context: planner } = await runPlannerScenario(context);
    assert.equal(planner.task?.status, 'done');
    assertL2DispatchMessage(replay);
    assert.equal(listPoolBox(MODULE, 'l2').length, 0);
    const effort = Object.values(mls.stor.files).find(file => file.project === 102047
      && file.level === 4 && file.shortName === 'changeEffort' && file.folder === `${candidate}/pool/l4`);
    assert.ok(effort);
    const written = JSON.parse(await effort.getContent()) as ChangeEffortFile;
    assert.equal(written.status, 'blocked');
    const reasons = written.merged.abend.map(row => `${row.item} ${row.master.project} ${row.reason}`);
    assert.equal(written.perItem.length, written.request.items.length);
    for (const item of written.request.items) {
      for (const master of written.masters) {
        assert.ok(reasons.includes(
          `${item.changeId} ${master.project} describeEffort not registered for master ${master.project}`,
        ));
      }
    }
  });
  } finally {
    restore();
  }
});
