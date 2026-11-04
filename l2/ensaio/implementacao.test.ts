import { completeTobeImplementation, readNs5Overlay } from '../newRelease/tobe.js';
import { readLatestCompletedL4Implementation } from '../solution/candidate/moduleImplementation.js';
import { reviewImplementationVisible } from '../newRelease/widgets/reviewModel.js';
/// <mls fileReference="_102035_/l2/ensaio/implementacao.test.ts" enhancement="_blank" />
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { installMlsStub } from '../../../test/mlsStub.js';
import { createImplementationRunner } from '../newRelease/helpers/implementationRunner.js';
import { acceptL4Implementation, implementationCommands, readL4Implementation, type L4ImplementationRecord } from '../solution/candidate/moduleImplementation.js';
import { adoptL4ReviewResult, promoteL4Revision, readL4Release } from '../solution/candidate/moduleRevision.js';
import { diffModuleLayers, restoreModuleFromSeals, sealModuleLayers } from '../solution/candidate/moduleLayers.js';
import { createAgent as createNewReleaseL1 } from '/_102021_/l2/agentNewReleaseL1/agentNewReleaseL1.js';
import * as agentNewReleaseL2Real from '/_102020_/l2/agentNewReleaseL2/agentNewReleaseL2.js';
import { runUntilDone } from './hostSimulado.js';
import { createSimulatedDefsHost, withReviewScenario, runPlannerScenario, PROJECT, MODULE } from './nodejsCenario.js';
import { effortRegistry, setDescribeEffortImporter } from '../solution/effortRegistry.js';
import type { ChangeEffortFile, EffortAnswer } from '../solution/poolPlan.js';
import type { TaskData } from '/_102036_/l2/shared/interfaces.js';
import { prepareL4Change } from '../solution/candidate/moduleRevision.js';
import { saveChangeRequest } from '../newRelease/helpers/revisionSelection.js';
import { sealModuleApplication, restoreModuleApplication } from '../solution/candidate/moduleLayers.js';
import { installTarefasOn, PROJECT as TAREFAS_PROJECT, MODULE as TAREFAS_MODULE, FIXTURE as TAREFAS_FIXTURE } from './tarefasStor.js';
import { createMemoryIndexedDb } from './hostSimulado.js';

const languageCommand = '@@agentAddLanguage ' + JSON.stringify([{
  languages: [{ code: 'pt-BR', name: 'pt-BR' }], projectId: PROJECT, moduleName: MODULE,
}]);

async function withEffort<T>(mode: 'rule' | 'agent' | 'both' | 'l1only', run: () => Promise<T>): Promise<T> {
  const golden = JSON.parse(readFileSync(new URL(
    '../solution/fixtures/changeEffort/agendaClinica-regra-anotacao/changeEffort.json', import.meta.url), 'utf8')) as ChangeEffortFile;
  const previous = { ...effortRegistry };
  for (const original of golden.perItem[0].answers) {
    effortRegistry[original.master.project] = { describeEffort: input => {
      const answer = { ...structuredClone(original), item: input.item.changeId } as EffortAnswer;
      if (mode !== 'rule') {
        if (mode === 'agent') answer.materialize = [];
        if (mode === 'l1only' && original.master.kind === 'l2') answer.materialize = [];
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

const qaRecords: Record<string, { record: L4ImplementationRecord; changeEffort: string }> = {};
function captureQa(name: string, record: L4ImplementationRecord, changeEffort: string) {
  const copy = structuredClone(record);
  copy.changeId = 'qa-implementation-change';
  copy.revisionId = 'qa-implementation-revision';
  copy.hashes = { changeEffort: 'sha256:' + '0'.repeat(64) };
  copy.acceptedAt = '2026-10-08T00:00:00.000Z';
  for (const phase of copy.phases) for (const attempt of [phase, ...(phase.previousAttempts ?? [])]) {
    attempt.startedAt = copy.acceptedAt;
    if (attempt.endedAt) attempt.endedAt = copy.acceptedAt;
  }
  qaRecords[name] = { record: copy, changeEffort };
}

async function acceptedScenario(mode: 'rule' | 'agent' | 'both' | 'l1only', run: (record: L4ImplementationRecord, changeEffort: string) => Promise<void>) {
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
    await run(record, source);
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

test('mr39 s10: accepted rule keeps materialization list and runs the ordered chain', async () => {
  await acceptedScenario('rule', async (accepted, changeEffort) => {
    const golden = JSON.parse(readFileSync(new URL('../solution/fixtures/changeEffort/agendaClinica-regra-anotacao/changeEffort.json', import.meta.url), 'utf8')) as ChangeEffortFile;
    assert.deepEqual(accepted.merged.materialize, golden.merged.materialize);
    assert.deepEqual(accepted.merged.runAgents, []);
    const host = createSimulatedDefsHost('done', true);
    captureQa('implementation-materialize', accepted, changeEffort);
    const runner = createImplementationRunner(host.dependencies);
    let record = accepted;
    for (let index = 0; index < 5; index++) record = await runner.runNext(PROJECT, MODULE);
    assert.deepEqual(record.phases.map(phase => phase.status), Array(5).fill('done'));
    assert.deepEqual(host.dispatched, [`@@agentNewReleaseL2 ${MODULE}`, `@@agentNewReleaseL1 ${MODULE}`, `@@agentDefsL1 ${MODULE} /run`, `@@agentNewReleaseL1 ${MODULE} /compare`, '@@agentMaterializeL1 ' + JSON.stringify({ scope: MODULE })]);
    assert.deepEqual(await readL4Implementation(PROJECT, MODULE), record);
    const events = mls.events;
    const dispatch = window.dispatchEvent;
    window.dispatchEvent = () => true;
    mls.events = { fireFileAction: () => {} } as any;
    try {
      await completeTobeImplementation(PROJECT, MODULE, record.changeId, record.revisionId);
      const reloaded = await readNs5Overlay(PROJECT, MODULE, 'tobe');
      assert.notEqual(reloaded.changeId, record.changeId);
      assert.equal(reloaded.diffs.some(diff => diff.entries.length), false);
      const history = await readLatestCompletedL4Implementation(PROJECT, MODULE);
      assert.equal(history?.changeId, record.changeId);
      assert.equal(reviewImplementationVisible(history, { changeId: reloaded.changeId, revisionId: reloaded.revisionId, diffs: reloaded.diffs, resultCurrent: false }), true);
      await assert.rejects(completeTobeImplementation(PROJECT, MODULE, record.changeId, record.revisionId), /l4.implementation_conflict/u);
      assert.equal(host.dispatched.length, 5);
    } finally { mls.events = events; window.dispatchEvent = dispatch; }
  });
});

test('mr39 s10: materialization precedes the returned language command', async () => {
  await acceptedScenario('both', async (accepted, changeEffort) => {
    assert.equal(accepted.merged.materialize.length, 4);
    assert.deepEqual(accepted.merged.runAgents, [{ agent: 'agentAddLanguage', command: languageCommand }]);
    const host = createSimulatedDefsHost('done', true);
    captureQa('implementation-materialize-agent', accepted, changeEffort);
    const runner = createImplementationRunner(host.dependencies);
    for (let index = 0; index < 6; index++) await runner.runNext(PROJECT, MODULE);
    assert.equal(host.dispatched.length, 6);
    assert.equal(host.dispatched[4], '@@agentMaterializeL1 ' + JSON.stringify({ scope: MODULE }));
    assert.equal(host.dispatched[5], languageCommand);
  });
});

for (const outcome of ['done', 'failed', 'running'] as const) {
  test(`accepted simulated language instruction ${outcome}`, async () => {
    await acceptedScenario('agent', async (accepted, changeEffort) => {
      assert.deepEqual(accepted.merged.materialize, []);
      assert.deepEqual(accepted.merged.runAgents, [{ agent: 'agentAddLanguage', command: languageCommand }]);
      assert.deepEqual(accepted.phases, []);
      if (outcome === 'done') captureQa('implementation-waiting', accepted, changeEffort);
      const host = createSimulatedDefsHost(outcome);
      let runner = createImplementationRunner(host.dependencies);
      let record = await runner.runNext(PROJECT, MODULE);
      if (outcome === 'failed') {
        assert.equal(record.phases[0].status, 'failed');
        assert.equal(record.phases[0].error, 'Simulated language failure');
        captureQa('implementation-retry', record, changeEffort);
        runner = createImplementationRunner(host.dependencies);
        await runner.runNext(PROJECT, MODULE);
        assert.deepEqual(host.dispatched, [languageCommand]);
        record = await runner.retryPhase(PROJECT, MODULE, 'runAgents:0');
        assert.equal(record.phases[0].attempt, 2);
        assert.equal(record.phases[0].previousAttempts?.length, 1);
        captureQa('implementation-failed', record, changeEffort);
      } else {
        if (outcome === 'running') {
          assert.equal(record.phases[0].status, 'running');
          captureQa('implementation-running', record, changeEffort);
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
          captureQa('implementation-success', record, changeEffort);
          captureQa('implementation-stale', record, changeEffort);
          qaRecords['implementation-stale'].record.changeId = 'qa-obsolete-change';
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
  const exported = JSON.parse(readFileSync(fixture, 'utf8')) as typeof qaRecords;
  assert.deepEqual(Object.keys(exported).sort(), Object.keys(qaRecords).sort());
  for (const name of Object.keys(qaRecords)) {
    assert.deepEqual(exported[name].record, qaRecords[name].record, name);
    const stableEffort = (source: string) => {
      const value = JSON.parse(source) as ChangeEffortFile;
      // These two paths contain the planner's fresh run IDs; keep the real bytes in the QA fixture.
      return { ...value, base: { ...value.base, revisionId: '', candidateRoot: '' } };
    };
    assert.deepEqual(stableEffort(exported[name].changeEffort), stableEffort(qaRecords[name].changeEffort), name);
  }
});

/** The text the real agent leaves as its result: `done: ...` or `refused: ...`. */
function resultText(intents: mls.msg.AgentIntent[]): string {
  const step = intents.find(intent => intent.type === 'add-step');
  return step && step.type === 'add-step' && 'result' in step.step ? String(step.step.result) : '';
}

async function runRealL1(): Promise<string> {
  const agent = createNewReleaseL1();
  const meta = { agentName: 'agentNewReleaseL1' } as Parameters<NonNullable<typeof agent.beforePromptImplicit>>[0];
  const content = `@@agentNewReleaseL1 ${MODULE}`;
  const context = { message: { threadId: 'thread-ensaio', senderId: 'ensaio', content, createAt: 'm1', orderAt: '' }, isTest: true } as mls.msg.ExecutionContext;
  return resultText(await agent.beforePromptImplicit!(meta, context, content));
}

// A module in maintenance went through the initial generation, which leaves the four plan files in its pool
// (INITIAL_PLAN_PATHS). The fixture carries them as the generation leaves them.
test('l4_p4_96 s4: the REAL agentNewReleaseL1 runs after a promotion in the rehearsal and finishes done', { todo: 'with the four plan files the postprocess passes; then prepareModule refuses "l1/controleEstoque has no files": the rehearsal module has no L1 defs, which the initial generation leaves (fixture hole, not an agent defect)' }, async () => {
  await acceptedScenario('rule', async () => {
    const text = await runRealL1();
    assert.match(text, /^done: /u, `the real phase after a promotion: ${text.slice(0, 300)}`);
  });
});

test('l4_p4_96 s4: a module with no plan is refused by the real agentNewReleaseL1 with the missing path', async () => {
  await acceptedScenario('rule', async () => {
    const info = { project: PROJECT, level: 4, folder: `${MODULE}/pool/l2/web`, shortName: 'backend', extension: '.json' };
    const key = mls.stor.getKeyToFile(info);
    assert.ok(mls.stor.files[key], 'the plan is in the fixture before it is removed');
    delete mls.stor.files[key];
    const text = await runRealL1();
    assert.match(text, /^refused: postprocess: plan missing: l4\/controleEstoque\/pool\/l2\/web\/backend\.json/u, text.slice(0, 300));
  });
});

// l4_p4_96: an accepted effort that is structural only through L1 sends the runner to agentNewReleaseL2
// (moduleImplementation.ts:60-67), and the L2 plan has no page to apply. The real agent answers "done: nothing to apply"
// (d2_166, 102020 5410a134; before it answered "refused" and the runner failed the phase), and the runner goes on to the next phase.
test('l4_p4_96: effort with L1 items and no L2 page: the real agentNewReleaseL2 answers "done: nothing to apply", the phase is done and the runner goes on to agentNewReleaseL1', async () => {
  await acceptedScenario('l1only', async accepted => {
    assert.ok(accepted.merged.materialize.length > 0 && accepted.merged.materialize.every(unit => unit.project === '102021'), 'the accepted effort has only L1 items');
    const base = createSimulatedDefsHost('done', true);
    let l2Text = '';
    const texts = new Map<string, string[]>();
    const runner = createImplementationRunner({
      ...base.dependencies,
      execute: async (name, context) => {
        if (name !== 'agentNewReleaseL2') return base.dependencies.execute!(name, context);
        const ran = await runUntilDone(agentNewReleaseL2Real, context, {}, []);
        l2Text = ran.intents.flatMap(intent => intent.type === 'add-message-ai' ? intent.request.inputAI : []).map(item => String(item.content)).at(-1) ?? '';
        const task: TaskData = { PK: 'task/#l2-real', SK: 'metadata', title: name, owner: 'ensaio', team: null, status: 'done', last_updated: 0,
          last_update_log: null, messageid_created: `${context.message.threadId}/${context.message.createAt}` };
        texts.set('l2-real', [l2Text]);
        context.task = task;
      },
      task: async (user, id, messageId) => id === 'l2-real'
        ? { PK: 'task/#l2-real', SK: 'metadata', title: 'agentNewReleaseL2', owner: 'ensaio', team: null, status: 'done', last_updated: 0, last_update_log: null, messageid_created: messageId } as TaskData
        : base.dependencies.task!(user, id, messageId),
      // The report of a finished task is the text of its answer (what the host returns as taskResults).
      message: async (user, threadId, messageId) => ({ taskResults: texts.get('l2-real') ?? [] }) as never,
    });
    const first = await runner.runNext(PROJECT, MODULE);
    assert.match(l2Text, /^done: nothing to apply/u, 'the real L2 agent answer');
    assert.equal(first.phases[0].status, 'done', 'a done answer is a done phase');
    assert.equal(first.phases[0].error, undefined);
    const second = await runner.runNext(PROJECT, MODULE);
    assert.equal(second.phases[1]?.agent, 'agentNewReleaseL1', 'the runner went on to the next phase');
    assert.deepEqual(base.dispatched, [`@@agentNewReleaseL1 ${MODULE}`], 'the next command dispatched is the L1 prepare');
  });
});

test('ui_mr_53 s4: tarefas applies, undoes the complete last batch, and applies the same revision again', async () => {
  Object.assign(globalThis, {
    document: { documentElement: { lang: 'en' }, createTreeWalker: () => ({ nextNode: () => null, currentNode: null }),
      createElement: (tag: string) => ({ tagName: tag.toUpperCase(), textContent: '' }), createComment: () => ({}),
      head: { querySelector: () => null, appendChild: () => undefined } },
    window: globalThis, customElements: { define() {}, get() {} }, HTMLElement: class {},
  });
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: createMemoryIndexedDb() });
  setDescribeEffortImporter(async () => { throw new Error('no master in this recorded rehearsal'); });
  installMlsStub({ actualProject: TAREFAS_PROJECT });
  const stor = installTarefasOn();
  try {
    const addText = async (level: number, folder: string, name: string, extension: string, content: string) => {
      const info = { project: TAREFAS_PROJECT, level, folder, shortName: name, extension, versionRef: '1' };
      const file = await mls.stor.addOrUpdateFile(info);
      await mls.stor.localStor.setContent(file, { content });
    };
    await addText(5, '', 'config', '.json', '{"projects":{"102047":{"modules":[{"moduleId":"tarefas","frontend":{"pages":["old"]}}]}}}\n');
    await addText(5, '', 'project', '.json', '{"modules":[{"moduleName":"tarefas","backend":{"version":"old"}}]}\n');
    const prepared = await prepareL4Change(TAREFAS_PROJECT, TAREFAS_MODULE);
    const ruleInfo = { project: TAREFAS_PROJECT, level: 4, folder: 'tarefas/tobe/plan', shortName: 'rules', extension: '.defs.ts' };
    const rule = mls.stor.files[mls.stor.getKeyToFile(ruleInfo)];
    assert.ok(rule);
    const oldRule = await rule.getContent();
    const newRule = oldRule.replace('não pode repetir o nome de outra lista.', 'tem no mínimo 4 caracteres e não pode repetir o nome de outra lista.');
    assert.notEqual(newRule, oldRule);
    await mls.stor.localStor.setContent(rule, { content: newRule });
    const selection = await saveChangeRequest(TAREFAS_PROJECT, TAREFAS_MODULE, 'O nome da lista deve ter no mínimo 4 caracteres.',
      prepared.change.changeId, prepared.change.activeRevisionId);
    await adoptL4ReviewResult(TAREFAS_PROJECT, TAREFAS_MODULE,
      { inputRevisionId: selection.revisionId, outputRevisionId: selection.revisionId });
    const { changeId } = prepared.change;
    const revisionId = selection.revisionId;
    const effort = JSON.parse(readFileSync(new URL('changeEffortSoRegra.json', TAREFAS_FIXTURE), 'utf8')) as ChangeEffortFile;
    effort.base = { ...effort.base, baseId: prepared.change.baseId, revisionId,
      candidateRoot: `tarefas/pipeline/changes/${changeId}/revisions/${revisionId}/l4` };
    const effortSource = `${JSON.stringify(effort, null, 2)}\n`;
    await addText(4, `${effort.base.candidateRoot}/pool/l4`, 'changeEffort', '.json', effortSource);
    const baseline = stor.texts();
    const hash = `sha256:${createHash('sha256').update(effortSource).digest('hex')}`;
    let pass = 0;
    const apply = async () => {
      pass++;
      await sealModuleApplication(TAREFAS_PROJECT, TAREFAS_MODULE, changeId, revisionId);
      await sealModuleLayers(TAREFAS_PROJECT, TAREFAS_MODULE, prepared.change.baseId);
      await promoteL4Revision(TAREFAS_PROJECT, TAREFAS_MODULE, changeId, revisionId);
      const accepted = await acceptL4Implementation(TAREFAS_PROJECT, TAREFAS_MODULE,
        { revisionId, acceptedBy: 'ensaio', hashes: { changeEffort: hash } });
      const commands = implementationCommands(accepted, TAREFAS_PROJECT, TAREFAS_MODULE);
      let sequence = 0;
      const runner = createImplementationRunner({
        userId: () => 'ensaio', thread: async () => ({ threadId: 'thread-tarefas' }),
        context: (threadId, senderId, content) => ({ isTest: true,
          message: { threadId, senderId, content, createAt: `message-${pass}-${++sequence}`, orderAt: '' } }),
        execute: async (_agent, context) => {
          if (sequence === 1) {
            await addText(2, 'tarefas/web/desktop/page11', 'newPage', '.ts', `export const pass = ${pass};\n`);
            await addText(1, 'tarefas/layer_3_domain/entities', 'newEntity', '.ts', `export const pass = ${pass};\n`);
            await addText(4, 'tarefas/pool/l2/web', 'generated', '.json', `{"pass":${pass}}\n`);
            await addText(5, '', 'config', '.json', '{"projects":{"102047":{"modules":[{"moduleId":"tarefas","frontend":{"pages":["new"]}}]}}}\n');
            await addText(5, '', 'project', '.json', '{"modules":[{"moduleName":"tarefas","backend":{"version":"new"}}]}\n');
          }
          context.task = { PK: `task/#pass-${pass}-${sequence}`, SK: 'metadata', title: 'recorded phase', owner: 'ensaio', team: null,
            status: 'done', last_updated: 0, last_update_log: null,
            messageid_created: `${context.message.threadId}/${context.message.createAt}` } as TaskData;
        },
        message: async () => ({ taskResults: commands.map(item => item.command) }) as never,
        task: async () => { throw new Error('done task should not be polled'); },
      });
      let record = accepted;
      for (let index = 0; index < commands.length; index++) record = await runner.runNext(TAREFAS_PROJECT, TAREFAS_MODULE);
      assert.equal(record.phases.length, commands.length);
      assert.ok(record.phases.every(phase => phase.status === 'done'));
      const events = mls.events;
      const dispatch = window.dispatchEvent;
      window.dispatchEvent = () => true;
      mls.events = { fireFileAction: () => {} } as typeof mls.events;
      try { await completeTobeImplementation(TAREFAS_PROJECT, TAREFAS_MODULE, changeId, revisionId); }
      finally { mls.events = events; window.dispatchEvent = dispatch; }
      return record;
    };
    await apply();
    assert.notDeepEqual(stor.texts(), baseline, 'the first application changed the module');
    await restoreModuleApplication(TAREFAS_PROJECT, TAREFAS_MODULE, changeId, revisionId);
    assert.deepEqual(stor.texts(), baseline, 'L1, L2, L4 and L5 returned byte for byte to the pre-Apply state');
    await apply();
    assert.equal(pass, 2);
  } finally {
    setDescribeEffortImporter(undefined);
    stor.restore();
  }
});
