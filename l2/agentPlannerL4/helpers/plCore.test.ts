/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adjustL5PlannerDeps,
  applyL5PlannerDeps,
  buildPlPlannedSteps,
  buildPlPoolMessage,
  decidePlLoop,
  listPlArtifacts,
  moduleTokenOk,
  parsePlInvocation,
  plDispatchSubject,
  plEntryRefusal,
  plannerAgentPresent,
  PL_DISPATCH_BODY,
  PL_L1_AGENT,
  PL_L2_AGENT,
  PL_STEP_DEPENDS_ON,
  PL_STEP_IDS,
  runPlDispatch,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { displayPath } from '/_102035_/l2/solution/fs.js';
import { listPoolBox, nextThread, readPoolMessage, readPoolTrace } from '/_102035_/l2/solution/pool.js';

type Stored = {
  project: number; level: number; folder: string; shortName: string; extension: string;
  status: string; versionRef: string; content: string;
  getValueInfo: () => Promise<{ content: string }>;
  getContent: () => Promise<string>;
};

type Host = { files: Record<string, Stored> };

const PROJECT = 102047;

function keyOf(info: { project: number | string; level: number | string; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function installHost(): Host {
  const host: Host = { files: {} };
  (globalThis as unknown as Record<string, unknown>).mls = {
    actualProject: PROJECT,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files: host.files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (params: { project: number; level: number; folder: string; shortName: string; extension: string }) => {
        const file: Stored = {
          project: params.project, level: params.level, folder: params.folder,
          shortName: params.shortName, extension: params.extension,
          status: 'new', versionRef: '0', content: '',
          getValueInfo: async () => ({ content: file.content }),
          getContent: async () => file.content,
        };
        host.files[keyOf(file)] = file;
        return file;
      },
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; },
        listFolder: () => [],
      },
    },
  };
  return host;
}

function seed(
  host: Host,
  info: { level: number; folder: string; shortName: string; extension: string },
  content: string,
): Stored {
  const file: Stored = {
    project: PROJECT, ...info, status: 'changed', versionRef: '1', content,
    getValueInfo: async () => ({ content: file.content }),
    getContent: async () => file.content,
  };
  host.files[keyOf(file)] = file;
  return file;
}

const OPEN_FACTS = {
  moduleExists: true,
  pipelineStatus: 'complete',
  poolPending: false,
  l5ConfigExists: true,
};

void test('parsePlInvocation reads the module token and /fast', () => {
  const parsed = parsePlInvocation('mensalidadesAcademia /fast');
  assert.equal(parsed.module, 'mensalidadesAcademia');
  assert.equal(parsed.fast, true);
  assert.equal(parsed.estimate, false);
});

void test('parsePlInvocation strips the @@agentPlannerL4 prefix and /estimate', () => {
  const parsed = parsePlInvocation('@@agentPlannerL4 mensalidadesAcademia /estimate');
  assert.equal(parsed.module, 'mensalidadesAcademia');
  assert.equal(parsed.estimate, true);
});

void test('plEntryRefusal lets a complete module through', () => {
  assert.equal(plEntryRefusal(parsePlInvocation('mensalidadesAcademia'), OPEN_FACTS), '');
});

void test('plEntryRefusal refuses each listed cause in English', () => {
  assert.equal(plEntryRefusal(parsePlInvocation('mensalidadesAcademia /estimate'), OPEN_FACTS), 'not available yet');
  assert.match(plEntryRefusal(parsePlInvocation(''), OPEN_FACTS), /Provide the module name/);
  assert.match(plEntryRefusal(parsePlInvocation('mensalidadesAcademia'), { ...OPEN_FACTS, moduleExists: false }), /does not exist in l4/);
  assert.match(plEntryRefusal(parsePlInvocation('mensalidadesAcademia'), { ...OPEN_FACTS, pipelineStatus: 'inProgress' }), /pipeline is not complete/);
  assert.equal(
    plEntryRefusal(parsePlInvocation('mensalidadesAcademia'), { ...OPEN_FACTS, poolPending: true }),
    'module has pending pool messages; finish or dispute them first',
  );
  assert.match(plEntryRefusal(parsePlInvocation('mensalidadesAcademia'), { ...OPEN_FACTS, l5ConfigExists: false }), /l5\/config\.json is missing/);
});

void test('moduleTokenOk accepts lowerCamel only', () => {
  assert.equal(moduleTokenOk('mensalidadesAcademia'), true);
  assert.equal(moduleTokenOk('Teste5'), false);
  assert.equal(moduleTokenOk(''), false);
});

void test('planned tree is three sequential steps with entry10 first', () => {
  const steps = buildPlPlannedSteps('mensalidadesAcademia');
  assert.equal(steps.length, 3);
  assert.deepEqual(steps.map(step => step.planning?.planId), [...PL_STEP_IDS]);
  assert.equal(steps[0].status, 'waiting_human_input');
  assert.equal(steps[0].agentName, 'agentPlannerL4');
  assert.deepEqual(steps[1].planning?.dependsOn, [...PL_STEP_DEPENDS_ON.dispatch20]);
  assert.equal(steps[1].status, 'waiting_dependency');
  assert.equal(steps[2].status, 'waiting_dependency');
});

void test('adjustL5PlannerDeps appends missing 102021 and leaves both unchanged', () => {
  const with020 = {
    workspaceDependencies: ['102047', '102020', '102035'],
    projects: {
      '102047': { root: '../mls-102047', type: 'client' },
      '102020': { root: '../mls-102020', type: 'lib' },
      '102035': { root: '../mls-102035', type: 'lib' },
    },
  };
  const added = adjustL5PlannerDeps(with020);
  assert.deepEqual(added.adjusted, ['workspaceDependencies:+102021', 'projects:+102021']);
  assert.deepEqual(added.config.workspaceDependencies, ['102047', '102020', '102035', '102021']);
  assert.deepEqual((added.config.projects as Record<string, unknown>)['102021'], { root: '../mls-102021', type: 'lib' });

  const both = {
    workspaceDependencies: ['102047', '102020', '102035', '102021'],
    projects: {
      '102020': { root: '../mls-102020', type: 'lib' },
      '102021': { root: '../mls-102021', type: 'lib' },
    },
  };
  const original = JSON.stringify(both);
  const same = adjustL5PlannerDeps(both);
  assert.deepEqual(same.adjusted, []);
  assert.equal(same.config, both);
  assert.equal(JSON.stringify(both), original);
});

const COMPLETE_PIPELINE = {
  schemaVersion: '2026-09-10-ns5-pipeline-v1',
  flowId: 'agentNewSolution5',
  moduleName: 'mensalidadesAcademia',
  status: 'complete',
  steps: {},
  sourcePrompt: '',
  invocation: { fast: false, module: 'mensalidadesAcademia', rebuildAll: false },
  updatedAt: '2026-09-18T00:00:00.000Z',
};

void test('applyL5PlannerDeps writes missing 102021 and records l5Adjusted', async () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  const pipeline = seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  const config = {
    workspaceDependencies: ['102047', '102020', '102035'],
    projects: {
      '102047': { root: '../mls-102047', type: 'client' },
      '102020': { root: '../mls-102020', type: 'lib' },
    },
  };
  const configFile = seed(
    host,
    { level: 5, folder: '', shortName: 'config', extension: '.json' },
    `${JSON.stringify(config, null, 2)}\n`,
  );

  const adjusted = await applyL5PlannerDeps('mensalidadesAcademia');
  assert.deepEqual(adjusted, ['workspaceDependencies:+102021', 'projects:+102021']);
  const nextConfig = JSON.parse(configFile.content) as { workspaceDependencies: string[] };
  assert.deepEqual(nextConfig.workspaceDependencies, ['102047', '102020', '102035', '102021']);
  const nextPipeline = JSON.parse(pipeline.content) as { l5Adjusted: string[] };
  assert.deepEqual(nextPipeline.l5Adjusted, ['workspaceDependencies:+102021', 'projects:+102021']);
});

void test('applyL5PlannerDeps leaves a complete config byte-identical', async () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  const config = {
    workspaceDependencies: ['102047', '102020', '102035', '102021'],
    projects: {
      '102020': { root: '../mls-102020', type: 'lib' },
      '102021': { root: '../mls-102021', type: 'lib' },
    },
  };
  const raw = `${JSON.stringify(config, null, 2)}\n`;
  const configFile = seed(host, { level: 5, folder: '', shortName: 'config', extension: '.json' }, raw);

  const adjusted = await applyL5PlannerDeps('mensalidadesAcademia');
  assert.deepEqual(adjusted, []);
  assert.equal(configFile.content, raw);
});

void test('listPlArtifacts excludes pipeline/, tobe/ and pool/', () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'access', extension: '.defs.ts' }, '');
  seed(host, { level: 4, folder: 'mensalidadesAcademia/journeys', shortName: 'index', extension: '.defs.ts' }, '');
  seed(host, { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' }, '{}');
  seed(host, { level: 4, folder: 'mensalidadesAcademia/tobe', shortName: 'draft', extension: '.json' }, '{}');
  seed(host, { level: 4, folder: 'mensalidadesAcademia/pool/l2', shortName: 'msg', extension: '.json' }, '{}');
  assert.deepEqual(listPlArtifacts('mensalidadesAcademia'), [
    'access.defs.ts',
    'journeys/index.defs.ts',
    'module.defs.ts',
  ]);
});

void test('the two pool messages are equal byte for byte except to', async () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  seed(host, { level: 4, folder: 'mensalidadesAcademia/journeys', shortName: 'index', extension: '.defs.ts' }, '');
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  const now = new Date(Date.UTC(2026, 8, 18, 10, 30, 0));
  const artifacts = listPlArtifacts('mensalidadesAcademia');
  const thread = nextThread('mensalidadesAcademia', now);
  const expectedL2 = buildPlPoolMessage('mensalidadesAcademia', 'l2', thread, artifacts);
  const expectedL1 = buildPlPoolMessage('mensalidadesAcademia', 'l1', thread, artifacts);
  assert.equal(expectedL2.subject, plDispatchSubject('mensalidadesAcademia'));
  assert.equal(expectedL2.subject, 'Changed artifacts of mensalidadesAcademia');
  assert.equal(expectedL2.body, PL_DISPATCH_BODY);
  assert.match(expectedL2.body, /evaluate and dispatch/i);
  assert.deepEqual({ ...expectedL1, to: 'l2' }, expectedL2);

  const run = await runPlDispatch('mensalidadesAcademia', now);
  assert.deepEqual(run.artifacts, artifacts);
  assert.equal(run.thread, thread);
  assert.deepEqual(await readPoolMessage(run.l2File), expectedL2);
  assert.deepEqual(await readPoolMessage(run.l1File), expectedL1);
  const l2Key = keyOf(run.l2File);
  const l1Key = keyOf(run.l1File);
  assert.equal(host.files[l2Key]?.content, `${JSON.stringify(expectedL2, null, 2)}\n`);
  assert.equal(host.files[l1Key]?.content, `${JSON.stringify(expectedL1, null, 2)}\n`);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l2').length, 1);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l1').length, 1);
});

void test('plannerAgentPresent is the stor.files shortName lookup', () => {
  const host = installHost();
  assert.equal(plannerAgentPresent(PL_L2_AGENT), false);
  assert.equal(plannerAgentPresent(PL_L1_AGENT), false);
  seed(host, { level: 2, folder: 'agentPlannerL2', shortName: 'agentPlannerL2', extension: '.ts' }, '');
  assert.equal(plannerAgentPresent(PL_L2_AGENT), true);
  assert.equal(plannerAgentPresent(PL_L1_AGENT), false);
});

void test('decidePlLoop stops at round 3 without deleting and marks disputed', () => {
  const file = {
    project: PROJECT, level: 4, folder: 'mensalidadesAcademia/pool/l2',
    shortName: '20260918103000_mensalidadesAcademia-20260918103000_3', extension: '.json',
  };
  const path = displayPath(file);
  const message = buildPlPoolMessage('mensalidadesAcademia', 'l2', 'mensalidadesAcademia-20260918103000', ['module.defs.ts']);
  message.round = 3;
  const trace = [1, 2, 3].map(round => ({
    at: '2026-09-18T10:30:00.000Z',
    file: round === 3 ? path : `l4/mensalidadesAcademia/pool/l2/other_${round}.json`,
    from: 'l4' as const, to: 'l2' as const,
    thread: 'mensalidadesAcademia-20260918103000',
    round, mode: 'implement' as const, outcome: 'delivered' as const,
  }));
  const decision = decidePlLoop({
    thread: 'mensalidadesAcademia-20260918103000',
    trace,
    l2: [{ file, path, message }],
    l1: [],
    l2Available: true,
    l1Available: false,
  });
  assert.equal(decision.stop, true);
  assert.equal(decision.invoke.length, 0);
  assert.equal(decision.disputed.length, 1);
  assert.equal(decision.disputed[0].path, path);
  assert.match(decision.status, /disputed/);
  assert.match(decision.status, /not deleted/);
});

void test('L1 absent leaves the box pending with a readable status', () => {
  const file = {
    project: PROJECT, level: 4, folder: 'mensalidadesAcademia/pool/l1',
    shortName: '20260918103000_mensalidadesAcademia-20260918103000_1', extension: '.json',
  };
  const path = displayPath(file);
  const thread = 'mensalidadesAcademia-20260918103000';
  const message = buildPlPoolMessage('mensalidadesAcademia', 'l1', thread, ['module.defs.ts']);
  const decision = decidePlLoop({
    thread,
    trace: [{
      at: '2026-09-18T10:30:00.000Z', file: path, from: 'l4', to: 'l1',
      thread, round: 1, mode: 'implement', outcome: 'delivered',
    }],
    l1: [{ file, path, message }],
    l2: [],
    l2Available: true,
    l1Available: false,
  });
  assert.equal(decision.stop, true);
  assert.equal(decision.invoke.length, 0);
  assert.match(decision.status, /l1 pending \(agentPlannerL1 not available\)/);
  assert.match(decision.status, /Requests stayed in the box/);
});

void test('runPlDispatch traces both deliveries and does not invoke a missing L1', async () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  seed(host, { level: 2, folder: 'agentPlannerL2', shortName: 'agentPlannerL2', extension: '.ts' }, '');
  const now = new Date(Date.UTC(2026, 8, 18, 10, 30, 0));
  const run = await runPlDispatch('mensalidadesAcademia', now);
  assert.equal(run.invokeL2, true);
  assert.equal(run.invokeL1, false);
  assert.match(run.status, /l1 pending \(agentPlannerL1 not available\)/);
  const trace = await readPoolTrace('mensalidadesAcademia');
  assert.equal(trace.length, 2);
  assert.deepEqual(trace.map(line => line.outcome), ['delivered', 'delivered']);
  assert.deepEqual(trace.map(line => line.to), ['l2', 'l1']);
});
