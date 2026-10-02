/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adjustL5PlannerDeps,
  applyL5PlannerDeps,
  buildPlPlannedSteps,
  buildPlPoolMessage,
  createRound1InvokeSteps,
  decidePlLoop,
  formatMissingPlannerStatus,
  listPlArtifacts,
  listPoolWebFiles,
  moduleTokenOk,
  parsePlInvocation,
  parseRevisionRoot,
  plDispatchSubject,
  plEntryRefusal,
  plRoundPlanId,
  plannerAgentPresent,
  plInvokeOutput,
  plStepPrompt,
  processPlEffortBox,
  resolveCandidateFolder,
  wipeModulePool,
  PL_DISPATCH_BODY,
  PL_L1_AGENT,
  PL_L2_AGENT,
  PL_L4DIFF_REL,
  PL_STEP_DEPENDS_ON,
  PL_STEP_IDS,
  runPlDispatch,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { displayPath, setModuleRoot } from '/_102035_/l2/solution/fs.js';
import { listPoolBox, nextThread, readPoolMessage, readPoolTrace, writePoolMessage } from '/_102035_/l2/solution/pool.js';

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
        deleteFile: (file: Stored) => { file.status = 'deleted'; },
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
  pipelineFlowId: 'agentNewSolution5',
  l5ConfigExists: true,
};

void test('parsePlInvocation reads the module token and /fast', () => {
  const parsed = parsePlInvocation('mensalidadesAcademia /fast');
  assert.equal(parsed.module, 'mensalidadesAcademia');
  assert.equal(parsed.fast, true);
  assert.equal(parsed.estimate, false);
  assert.equal(parsed.candidate, '');
});

void test('parsePlInvocation /candidate alone points at <mod>/tobe/plan', () => {
  const parsed = parsePlInvocation('@@agentPlannerL4 mensalidadesAcademia /candidate');
  assert.equal(parsed.module, 'mensalidadesAcademia');
  assert.equal(parsed.candidate, 'mensalidadesAcademia/tobe/plan');
  assert.equal(resolveCandidateFolder('mensalidadesAcademia', ''), 'mensalidadesAcademia/tobe/plan');
});

void test('parsePlInvocation /candidate with a relative root keeps /fast as a flag', () => {
  const parsed = parsePlInvocation('mensalidadesAcademia /fast /candidate pipeline/changes/c1/revisions/r1/l4');
  assert.equal(parsed.fast, true);
  assert.equal(parsed.candidate, 'mensalidadesAcademia/pipeline/changes/c1/revisions/r1/l4');
});

void test('parsePlInvocation of a sealed revision root parses changeId and revisionId; tobe/plan is not one', () => {
  const parsed = parsePlInvocation('x /candidate pipeline/changes/c1/revisions/rev-1/l4');
  assert.equal(parsed.module, 'x');
  assert.equal(parsed.candidate, 'x/pipeline/changes/c1/revisions/rev-1/l4');
  assert.deepEqual(parseRevisionRoot(parsed.candidate), { changeId: 'c1', revisionId: 'rev-1' });
  assert.equal(parseRevisionRoot('x/tobe/plan'), null);
  assert.equal(parseRevisionRoot('tobe/plan'), null);
  const manual = parsePlInvocation('x /candidate');
  assert.equal(manual.candidate, 'x/tobe/plan');
  assert.equal(parseRevisionRoot(manual.candidate), null);
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
  assert.match(plEntryRefusal(parsePlInvocation('mensalidadesAcademia'), { ...OPEN_FACTS, l5ConfigExists: false }), /l5\/config\.json is missing/);
});

void test('moduleTokenOk accepts lowerCamel only', () => {
  assert.equal(moduleTokenOk('mensalidadesAcademia'), true);
  assert.equal(moduleTokenOk('Teste5'), false);
  assert.equal(moduleTokenOk(''), false);
});

void test('planned tree is four sequential steps with entry10 first and diff20 before dispatch20', () => {
  const steps = buildPlPlannedSteps('mensalidadesAcademia');
  assert.equal(steps.length, 4);
  assert.deepEqual(steps.map(step => step.planning?.planId), [...PL_STEP_IDS]);
  assert.equal(steps[0].status, 'waiting_human_input');
  assert.equal(steps[0].agentName, 'agentPlannerL4');
  assert.deepEqual(steps[1].planning?.dependsOn, [...PL_STEP_DEPENDS_ON.diff20]);
  assert.deepEqual(steps[2].planning?.dependsOn, [...PL_STEP_DEPENDS_ON.dispatch20]);
  assert.equal(steps[1].status, 'waiting_dependency');
  assert.equal(steps[2].status, 'waiting_dependency');
  assert.equal(steps[3].status, 'waiting_dependency');
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

void test('listPlArtifacts under /candidate lists the override root and leaves canonical files out', () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, 'canonical');
  seed(host, { level: 4, folder: 'mensalidadesAcademia/tobe/plan', shortName: 'module', extension: '.defs.ts' }, 'candidate');
  seed(host, { level: 4, folder: 'mensalidadesAcademia/tobe/plan', shortName: 'rules', extension: '.defs.ts' }, 'rule');
  seed(host, { level: 4, folder: 'mensalidadesAcademia/tobe/plan/pipeline', shortName: 'pipeline', extension: '.json' }, '{}');
  try {
    setModuleRoot('mensalidadesAcademia', 'mensalidadesAcademia/tobe/plan');
    assert.deepEqual(listPlArtifacts('mensalidadesAcademia'), ['module.defs.ts', 'rules.defs.ts']);
  } finally {
    setModuleRoot('mensalidadesAcademia', null);
  }
});

void test('dispatch writes only the l4→l2 message — l4diff cites both boxes, pool/l1 stays empty', async () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  seed(host, { level: 4, folder: 'mensalidadesAcademia/journeys', shortName: 'index', extension: '.defs.ts' }, '');
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  const now = new Date(Date.UTC(2026, 8, 18, 10, 30, 0));
  const artifacts = [...listPlArtifacts('mensalidadesAcademia'), ...PL_L4DIFF_REL];
  const thread = nextThread('mensalidadesAcademia', now);
  const expectedL2 = buildPlPoolMessage('mensalidadesAcademia', 'l2', thread, artifacts);
  assert.equal(expectedL2.subject, plDispatchSubject('mensalidadesAcademia'));
  assert.equal(expectedL2.subject, 'Changed artifacts of mensalidadesAcademia');
  assert.equal(expectedL2.body, PL_DISPATCH_BODY);
  assert.match(expectedL2.body, /evaluate and dispatch/i);
  // Cites both l4diff.json files (l1 and l2) even though the despacho itself is l2-only.
  assert.deepEqual(expectedL2.artifacts.filter(item => item.endsWith('l4diff.json')), [...PL_L4DIFF_REL]);

  const run = await runPlDispatch('mensalidadesAcademia', now);
  assert.deepEqual(run.artifacts, artifacts);
  assert.equal(run.thread, thread);
  assert.deepEqual(await readPoolMessage(run.l2File), expectedL2);
  const l2Key = keyOf(run.l2File);
  assert.equal(host.files[l2Key]?.content, `${JSON.stringify(expectedL2, null, 2)}\n`);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l2').length, 1);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l1').length, 0);
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
    round, mode: 'estimate' as const, outcome: 'delivered' as const,
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
      thread, round: 1, mode: 'estimate', outcome: 'delivered',
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

void test('runPlDispatch traces a single l2 delivery and reports L2 availability only', async () => {
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
  assert.equal(run.status, '');
  const trace = await readPoolTrace('mensalidadesAcademia');
  assert.equal(trace.length, 1);
  assert.deepEqual(trace.map(line => line.outcome), ['delivered']);
  assert.deepEqual(trace.map(line => line.to), ['l2']);
});

void test('formatMissingPlannerStatus reports l2 pending when L2 is not available', () => {
  assert.equal(formatMissingPlannerStatus(1, true), '');
  assert.match(
    formatMissingPlannerStatus(1, false),
    /l2 pending \(agentPlannerL2 not available\)\. Requests stayed in the box\./,
  );
});

// A leftover message from a prior accept, unconsumed. wipeModulePool wipes it regardless of
// `mode` — a new plan invalidates an old accept.
const POOL_MSG_UNCONSUMED_IMPLEMENT = {
  from: 'l4' as const, to: 'l2' as const, thread: 'mensalidadesAcademia-20260918103000', round: 1 as const,
  mode: 'implement' as const, subject: 'Changed artifacts of mensalidadesAcademia',
  artifacts: ['module.defs.ts'],
  body: 'Evaluate and dispatch. The recipient decides what to do with these artifacts.',
};

void test('wipeModulePool empties the boxes, removes web artifacts, and records poolWiped', async () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  const pipeline = seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pool/l2', shortName: '20260918103000_mensalidadesAcademia-20260918103000_1', extension: '.json' },
    `${JSON.stringify(POOL_MSG_UNCONSUMED_IMPLEMENT, null, 2)}\n`,
  );
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pool/l2/web', shortName: 'menu', extension: '.json' },
    '{"schemaVersion":"x"}\n',
  );
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pool/l1/web', shortName: 'needs', extension: '.json' },
    '{"schemaVersion":"x"}\n',
  );
  assert.equal(listPoolBox('mensalidadesAcademia', 'l2').length, 1);
  assert.equal(listPoolWebFiles('mensalidadesAcademia', 'l2').length, 1);

  const wiped = await wipeModulePool('mensalidadesAcademia', new Date(Date.UTC(2026, 8, 20, 12, 0, 0)));
  assert.equal(listPoolBox('mensalidadesAcademia', 'l2').length, 0);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l1').length, 0);
  assert.equal(listPoolWebFiles('mensalidadesAcademia', 'l2').length, 0);
  assert.equal(listPoolWebFiles('mensalidadesAcademia', 'l1').length, 0);
  const state = JSON.parse(pipeline.content) as { poolWiped: string[]; pool: Array<{ outcome: string }> };
  assert.deepEqual(state.poolWiped, wiped);
  assert.equal(state.poolWiped.some(path => path.endsWith('/menu.json')), true);
  assert.equal(state.poolWiped.some(path => path.endsWith('/needs.json')), true);
  assert.equal(state.pool.some(line => line.outcome === 'processed'), true);
});

// p4_19: host-disk-only files stay out of artifacts, the box, the web files and the wipe; the index
// gains no entry. Positive control: the same kind of file in the index shows up.
void test('listPlArtifacts, runPlDispatch artifacts, pool listings and wipe ignore host-disk-only files', async () => {
  const host = installHost();
  const unlinked: string[] = [];
  const disk = [
    { project: PROJECT, level: 4, folder: 'mensalidadesAcademia', shortName: 'diskOnly', extension: '.defs.ts' },
    { project: PROJECT, level: 4, folder: 'mensalidadesAcademia/pool/l2', shortName: '20260918090000_mensalidadesAcademia-20260918090000_1', extension: '.json' },
    { project: PROJECT, level: 4, folder: 'mensalidadesAcademia/pool/l2/web', shortName: 'diskMenu', extension: '.json' },
  ];
  const stor = (globalThis as unknown as { mls: { stor: { localStor: Record<string, unknown> } } }).mls.stor;
  stor.localStor.listFolder = (project: number, level: number, folder: string) =>
    disk.filter(item => item.project === project && item.level === level
      && (item.folder === folder || item.folder.startsWith(`${folder}/`)));
  const deleteInIndex = stor.localStor.deleteFile as (file: Stored) => void;
  stor.localStor.deleteFile = (file: Stored) => { unlinked.push(`${file.folder}/${file.shortName}`); deleteInIndex(file); };
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  seed(host, { level: 4, folder: 'mensalidadesAcademia/pool/l2/web', shortName: 'menu', extension: '.json' }, '{}\n');
  const keysBefore = Object.keys(host.files).sort();

  assert.deepEqual(listPlArtifacts('mensalidadesAcademia'), ['module.defs.ts']);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l2').length, 0);
  assert.deepEqual(listPoolWebFiles('mensalidadesAcademia', 'l2').map(file => file.shortName), ['menu']);
  assert.deepEqual(Object.keys(host.files).sort(), keysBefore);

  const wiped = await wipeModulePool('mensalidadesAcademia', new Date(Date.UTC(2026, 8, 20, 12, 0, 0)));
  assert.deepEqual(wiped, ['l4/mensalidadesAcademia/pool/l2/web/menu.json']);
  assert.deepEqual(unlinked, ['mensalidadesAcademia/pool/l2/web/menu']);

  const run = await runPlDispatch('mensalidadesAcademia', new Date(Date.UTC(2026, 8, 20, 12, 5, 0)));
  assert.equal(run.artifacts.includes('diskOnly.defs.ts'), false);
  assert.equal(run.artifacts.includes('module.defs.ts'), true);
});

void test('L2 and L1 step prompts require a non-empty file — empty file is not kind:step (ramification B)', () => {
  // Step prompt contract read by the L2/L1 planners: a step needs non-empty `moduleName`, `thread` and `file`;
  // `moduleName` alone is an entry. Checked here on the JSON itself (p4_21: no import of another agent).
  const isStep = (prompt: string): boolean => {
    const raw = JSON.parse(prompt) as Record<string, unknown>;
    const text = (key: string): string => (typeof raw[key] === 'string' ? (raw[key] as string).trim() : '');
    return Boolean(text('moduleName') && text('thread') && text('file'));
  };
  const empty = plStepPrompt('mensalidadesAcademia', 'mensalidadesAcademia-20260918103000', '');
  assert.equal(isStep(empty), false);
  assert.equal((JSON.parse(empty) as { moduleName: string }).moduleName, 'mensalidadesAcademia');
  const filled = plStepPrompt(
    'mensalidadesAcademia',
    'mensalidadesAcademia-20260918103000',
    'l4/mensalidadesAcademia/pool/l2/20260918103000_mensalidadesAcademia-20260918103000_1.json',
  );
  assert.equal(isStep(filled), true);
});

void test('round-1 invoke steps are only L2 r1 with the step prompt shape — L1 waits for the box', async () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  seed(host, { level: 2, folder: 'agentPlannerL2', shortName: 'agentPlannerL2', extension: '.ts' }, '');
  seed(host, { level: 2, folder: 'agentPlannerL1', shortName: 'agentPlannerL1', extension: '.ts' }, '');
  const now = new Date(Date.UTC(2026, 8, 18, 10, 30, 0));
  const run = await runPlDispatch('mensalidadesAcademia', now);
  const steps = createRound1InvokeSteps('mensalidadesAcademia', run);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].agentName, PL_L2_AGENT);
  assert.equal(steps[0].planning?.planId, plRoundPlanId('l2', 1));
  assert.deepEqual(steps[0].planning?.dependsOn, []);
  const l2Prompt = JSON.parse(String(steps[0].prompt)) as { moduleName: string; thread: string; file: string; candidate: string };
  assert.equal(l2Prompt.moduleName, 'mensalidadesAcademia');
  assert.equal(l2Prompt.thread, run.thread);
  assert.equal(l2Prompt.file, run.l2Path);
  assert.equal(l2Prompt.candidate, '');
  assert.equal(steps.some(step => step.agentName === PL_L1_AGENT), false);
});

void test('plInvokeOutput is done only when L2 wrote menu.json plus l2→l1, or L1 wrote a reply or backend.json', async () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  const thread = 'mensalidadesAcademia-20260918103000';
  const at = new Date(Date.UTC(2026, 8, 18, 10, 30, 0));
  assert.equal(await plInvokeOutput('l2', 'mensalidadesAcademia', thread), 'no-output');
  assert.equal(await plInvokeOutput('l1', 'mensalidadesAcademia', thread), 'no-output');
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pool/l2/web', shortName: 'menu', extension: '.json' },
    '{}\n',
  );
  assert.equal(await plInvokeOutput('l2', 'mensalidadesAcademia', thread), 'no-output');
  await writePoolMessage('mensalidadesAcademia', {
    from: 'l2', to: 'l1', thread, round: 1, mode: 'estimate',
    subject: 'needs', artifacts: ['pool/l1/web/needs.json'], body: 'needs',
  }, at);
  assert.equal(await plInvokeOutput('l2', 'mensalidadesAcademia', thread), 'done');
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pool/l2/web', shortName: 'backend', extension: '.json' },
    '{}\n',
  );
  assert.equal(await plInvokeOutput('l1', 'mensalidadesAcademia', thread), 'done');
});

void test('plInvokeOutput also treats a side as done via pool/<side>/pipeline.json complete on thread (p4_16)', async () => {
  const host = installHost();
  const moduleName = 'fixturePlannerP416';
  seed(host, { level: 4, folder: moduleName, shortName: 'module', extension: '.defs.ts' }, '');
  seed(
    host,
    { level: 4, folder: `${moduleName}/pipeline`, shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  const thread = `${moduleName}-20260928100000`;
  const otherThread = `${moduleName}-20260928090000`;

  // L2: menu.json + pool/l2/pipeline.json complete on thread, no l2→l1 message left → done.
  seed(host, { level: 4, folder: `${moduleName}/pool/l2/web`, shortName: 'menu', extension: '.json' }, '{}\n');
  seed(
    host,
    { level: 4, folder: `${moduleName}/pool/l2`, shortName: 'pipeline', extension: '.json' },
    JSON.stringify({ thread, status: 'complete' }),
  );
  assert.equal(await plInvokeOutput('l2', moduleName, thread), 'done');

  // Pipeline on a different thread does not count.
  assert.equal(await plInvokeOutput('l2', moduleName, otherThread), 'no-output');

  // Pipeline present but not complete does not count.
  seed(
    host,
    { level: 4, folder: `${moduleName}/pool/l2`, shortName: 'pipeline', extension: '.json' },
    JSON.stringify({ thread, status: 'inProgress' }),
  );
  assert.equal(await plInvokeOutput('l2', moduleName, thread), 'no-output');

  // L1: pool/l1/pipeline.json complete on thread, no reply message, no backend.json → done.
  seed(
    host,
    { level: 4, folder: `${moduleName}/pool/l1`, shortName: 'pipeline', extension: '.json' },
    JSON.stringify({ thread, status: 'complete' }),
  );
  assert.equal(await plInvokeOutput('l1', moduleName, thread), 'done');

  // Pipeline on a different thread does not count.
  assert.equal(await plInvokeOutput('l1', moduleName, otherThread), 'no-output');

  // Pipeline present but not complete does not count.
  seed(
    host,
    { level: 4, folder: `${moduleName}/pool/l1`, shortName: 'pipeline', extension: '.json' },
    JSON.stringify({ thread, status: 'draft' }),
  );
  assert.equal(await plInvokeOutput('l1', moduleName, thread), 'no-output');
});

void test('runPlDispatch and buildPlPoolMessage always tag mode: estimate — L4 never writes implement', async () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  const now = new Date(Date.UTC(2026, 8, 27, 10, 0, 0));
  const built = buildPlPoolMessage('mensalidadesAcademia', 'l2', nextThread('mensalidadesAcademia', now), ['module.defs.ts']);
  assert.equal(built.mode, 'estimate');
  const run = await runPlDispatch('mensalidadesAcademia', now);
  assert.equal((await readPoolMessage(run.l2File)).mode, 'estimate');
  const trace = await readPoolTrace('mensalidadesAcademia');
  assert.deepEqual(trace.map(line => line.mode), ['estimate']);
});

const EFFORT_THREAD = 'mensalidadesAcademia-20260918103000';

function effortMessage(round: number) {
  return {
    from: 'l2', to: 'l4', thread: EFFORT_THREAD, round, mode: 'estimate',
    subject: 'Effort ready for review', artifacts: ['pool/l4/web/effort.json'], body: 'Effort ready for review.',
  };
}

void test('processPlEffortBox processes and deletes a fresh l2→l4 effort message below round 3', async () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  const at = new Date(Date.UTC(2026, 8, 27, 10, 0, 0));
  await writePoolMessage('mensalidadesAcademia', effortMessage(1), at);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l4').length, 1);

  const result = await processPlEffortBox('mensalidadesAcademia', EFFORT_THREAD, at);
  assert.deepEqual(result.disputed, []);
  assert.equal(result.processed.length, 1);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l4').length, 0);
  const trace = await readPoolTrace('mensalidadesAcademia');
  assert.deepEqual(trace.map(line => line.outcome), ['processed']);
});

void test('processPlEffortBox at round 3 disputes and keeps the message; a second call does not re-trace it', async () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  const at = new Date(Date.UTC(2026, 8, 27, 10, 0, 0));
  await writePoolMessage('mensalidadesAcademia', effortMessage(3), at);

  const first = await processPlEffortBox('mensalidadesAcademia', EFFORT_THREAD, at);
  assert.equal(first.processed.length, 0);
  assert.equal(first.disputed.length, 1);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l4').length, 1);
  const trace = await readPoolTrace('mensalidadesAcademia');
  assert.deepEqual(trace.map(line => line.outcome), ['disputed']);

  const second = await processPlEffortBox('mensalidadesAcademia', EFFORT_THREAD, new Date(at.getTime() + 1000));
  assert.equal(second.disputed.length, 1);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l4').length, 1);
  const traceAfter = await readPoolTrace('mensalidadesAcademia');
  assert.equal(traceAfter.length, 1, 'an already-disputed message is not re-traced');
});
