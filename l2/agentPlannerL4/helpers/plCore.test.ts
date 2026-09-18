/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adjustL5PlannerDeps,
  applyL5PlannerDeps,
  buildPlPlannedSteps,
  moduleTokenOk,
  parsePlInvocation,
  plEntryRefusal,
  PL_STEP_DEPENDS_ON,
  PL_STEP_IDS,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';

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
