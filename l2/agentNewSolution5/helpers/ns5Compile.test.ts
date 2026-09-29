/// <mls fileReference="_102035_/l2/agentNewSolution5/helpers/ns5Compile.test.ts" enhancement="_blank"/>

// p4_20: the Studio compiler is the last gate of a step that writes a `.defs.ts`. The compiler here is
// SIMULATED (`mls.l2.typescript.compile` on a stub registry), the same surface the Studio and the
// `collabmsg` host expose; nothing compiles from disk.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  NS5_DEFS_WRITING_STEPS,
  NS5_NO_COMPILE_CAPABILITY,
  compileNs5Defs,
  ns5CompileBlockers,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Compile.js';
import { afterNs5RulesPromptStep } from '/_102035_/l2/agentNewSolution5/steps/rules40/agentNs5Rules.js';
import { ns5Module10OwnsExistingDefs } from '/_102035_/l2/agentNewSolution5/steps/module10/agentNs5Module.js';
import { draftFile, pipelineFile, rulesFile } from '/_102035_/l2/solution/fs.js';
import type { Ns5CompileRecord, Ns5PipelineState } from '/_102035_/l2/solution/types.js';

const g = globalThis as unknown as Record<string, any>;
const priorMls = g.mls;
after(() => { g.mls = priorMls; });

const PROJECT = 102047;
const MODULE = 'compileProbe';
const TYPES_KEY = '102035_2_solution/types.ts';
const ONTOLOGY_TYPES_KEY = '102034_1_mdm/defs/ontologyTypes.ts';

type Info = { project: number; level: number; folder: string; shortName: string; extension: string };
const keyOf = (info: Info) => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;

interface Host {
  store: Record<string, string>;
  compiled: string[];
}

/**
 * A Studio-shaped host: stor files over an in-memory store, an editor registry `getOrCreateModel`
 * fills, and — when `compiler` — a `mls.l2.typescript.compile` that reports TS1360 on any text
 * containing `BROKEN` (what `as const satisfies <Type>` reports for a value that does not fit).
 */
function installHost(options: { compiler: boolean; withoutKeys?: string[]; withoutRulesDefs?: boolean; opaqueRulesDefs?: boolean; l2Twin?: boolean }): Host {
  const store: Record<string, string> = {};
  const compiled: string[] = [];
  const files: Record<string, any> = {};
  const models: Record<string, any> = {};
  // Same formula as the Studio (`cfe editor.ts` getKeyModel) and the collabmsg host: the level only for l1, no extension.
  const keyModel = (project: number, shortName: string, folder: string, level: number) =>
    `_${project}_${level === 1 ? '1_' : ''}${folder ? `${folder}_` : ''}${shortName}`;
  const addFile = (info: Info, content: string) => {
    const key = keyOf(info);
    store[key] = content;
    files[key] = {
      ...info,
      status: 'changed',
      getContent: async () => store[key],
      getOrCreateModel: async () => {
        const modelTs = {
          key,
          model: { getValue: () => store[key], setValue: (value: string) => { store[key] = value; } },
          compilerResults: { errors: [] as unknown[], prodDTS: '' },
        };
        models[keyModel(info.project, info.shortName, info.folder, info.level)] = { ts: modelTs };
        return modelTs;
      },
    };
  };
  addFile({ project: 102035, level: 2, folder: 'solution', shortName: 'types', extension: '.ts' },
    "import type { MdmDefField } from '/_102034_/l1/mdm/defs/ontologyTypes.js';\nexport type Ns5RulesArtifactV2 = { rules: Record<string, string> };\n");
  addFile({ project: 102034, level: 1, folder: 'mdm/defs', shortName: 'ontologyTypes', extension: '.ts' }, 'export type MdmDefField = string;\n');
  const pipeline: Ns5PipelineState = {
    schemaVersion: '2026-09-10-ns5-pipeline-v1',
    flowId: 'agentNewSolution5',
    moduleName: MODULE,
    status: 'inProgress',
    steps: {},
    sourcePrompt: 'probe',
    invocation: { fast: true, module: MODULE, rebuildAll: false },
    updatedAt: '2026-09-29T00:00:00.000Z',
  } as Ns5PipelineState;
  g.mls = {
    actualProject: PROJECT,
    events: { addEventListener() { /* noop */ }, removeEventListener() { /* noop */ }, dispatch() { /* noop */ } },
    stor: {
      files,
      getKeyToFile: keyOf,
      localStor: { setContent: async (file: Info, value: { content: string }) => { store[keyOf(file)] = value.content; } },
    },
    editor: {
      models,
      getKeyModel: keyModel,
      deleteModels: (project: number, shortName: string, folder: string, _release: boolean, level: number) => {
        delete models[keyModel(project, shortName, folder, level)];
      },
    },
    l2: options.compiler
      ? {
        typescript: {
          compile: async (modelTs: { key: string; model: { getValue: () => string }; compilerResults: { errors: unknown[]; prodDTS: string } }) => {
            compiled.push(modelTs.key);
            const broken = modelTs.model.getValue().includes('BROKEN');
            modelTs.compilerResults.errors = broken
              ? [{ code: 1360, messageText: "Type '{...}' does not satisfy the expected type 'Ns5RulesArtifactV2'." }]
              : [];
            modelTs.compilerResults.prodDTS = 'export {};';
            return !broken;
          },
        },
      }
      : {},
  };
  // Files the step writes already have an index entry, so the stub never needs createStorFile.
  addFile(pipelineFile(MODULE), `${JSON.stringify(pipeline, null, 2)}\n`);
  addFile(draftFile(MODULE, 'rules40'), '');
  addFile(rulesFile(MODULE), '');
  // Same project/folder/name one layer down, with a text the compiler rejects: a model looked up at
  // the wrong level would compile THIS one.
  if (options.l2Twin) addFile({ ...rulesFile(MODULE), level: 2 }, 'BROKEN');
  // A file just created in the Studio can have no remote content yet: `getContent` answers nothing
  // while the model already holds the text.
  if (options.opaqueRulesDefs) files[rulesDefsKey()].getContent = async () => undefined;
  for (const key of [...(options.withoutKeys || []), ...(options.withoutRulesDefs ? [rulesDefsKey()] : [])]) {
    delete files[key];
    delete store[key];
  }
  return { store, compiled };
}

function readPipelineOf(host: Host): Ns5PipelineState {
  return JSON.parse(host.store[keyOf(pipelineFile(MODULE))]) as Ns5PipelineState;
}

async function runRules40(description: string, repairAttempt: number) {
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: 'plan',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentNewSolution5',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const step: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 40,
    interaction: { input: [], payload: [{ rules: [{ ruleId: 'discountWithinTotal', description }] }] } as unknown as mls.msg.AIAgentStep['interaction'],
    stepTitle: 'Rules',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentNewSolution5',
    prompt: JSON.stringify({ planId: 'rules40', moduleName: MODULE, repairAttempt }),
    rags: [],
    planning: { planId: 'rules40', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  root.nextSteps = [step];
  const context = {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [root], longMemory: { moduleName: MODULE } } },
  } as unknown as mls.msg.ExecutionContext;
  const intents = await afterNs5RulesPromptStep({ agentName: 'agentNewSolution5' } as IAgentMeta, context, root, step, 1);
  const status = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  const added = intents.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  return { status, added };
}

// Lazy: the module path depends on `mls.actualProject`, set by installHost.
const rulesDefsKey = () => keyOf(rulesFile(MODULE));
const RULES_DEFS_SOURCE = "import type { Ns5RulesArtifactV2 } from '/_102035_/l2/solution/types.js';\n"
  + 'export const probeRules = { rules: {} } as const satisfies Ns5RulesArtifactV2;\n';

void test('rules40: a .defs.ts the Studio compiler rejects schedules the repair with the diagnostic, never approved', async () => {
  const host = installHost({ compiler: true });
  const { status, added } = await runRules40('BROKEN value the compiler rejects.', 0);
  assert.equal(status?.status, 'completed');
  assert.match(String(status?.traceMsg), /rules40 compile scheduled repair 1/);
  assert.equal(added.length, 1);
  const retry = JSON.parse(String((added[0].step as mls.msg.AIAgentStep).prompt));
  assert.equal(retry.repairAttempt, 1);
  assert.match(retry.gateFeedback, /Studio compiler rejected/);
  assert.match(retry.gateFeedback, /rules\.defs\.ts: TS1360/);
  const state = readPipelineOf(host).steps.rules40;
  assert.equal(state?.status, 'running');
  assert.equal(state?.compile?.status, 'errors');
  assert.ok(host.compiled.includes(rulesDefsKey()), 'the written file went through the compiler');
});

void test('rules40: past the repair budget the step fails with the compile error in the pipeline', async () => {
  const host = installHost({ compiler: true });
  const { status, added } = await runRules40('BROKEN again after two repairs.', 2);
  assert.equal(status?.status, 'failed');
  assert.match(String(status?.traceMsg), /TS1360/);
  assert.deepEqual(added.filter(intent => (intent.step as mls.msg.AIAgentStep).planning?.planId?.startsWith('rules40-repair')), []);
  const pipeline = readPipelineOf(host);
  assert.equal(pipeline.status, 'failed');
  assert.equal(pipeline.steps.rules40?.status, 'failed');
  assert.match(String(pipeline.steps.rules40?.error), /rules\.defs\.ts: TS1360/);
});

void test('rules40 positive control: a clean compile approves, with the imports preloaded first', async () => {
  const host = installHost({ compiler: true });
  const { status } = await runRules40('The optional discount cannot exceed the total of active items.', 1);
  assert.equal(status?.status, 'completed');
  assert.match(String(status?.traceMsg), /rules40 approved/);
  const pipeline = readPipelineOf(host);
  assert.equal(pipeline.steps.rules40?.status, 'approved');
  assert.deepEqual(pipeline.steps.rules40?.compile, { status: 'clean', files: 1 });
  // types.ts and what it imports are compiled BEFORE the defs: an unloaded import would be `any`.
  assert.deepEqual(host.compiled, [TYPES_KEY, ONTOLOGY_TYPES_KEY, rulesDefsKey()]);
});

void test('without mls.l2.typescript the step records "no compile capability", never clean', async () => {
  const host = installHost({ compiler: false });
  const { status } = await runRules40('The optional discount cannot exceed the total of active items.', 0);
  assert.equal(status?.status, 'completed');
  const state = readPipelineOf(host).steps.rules40;
  assert.deepEqual(state?.compile, { status: 'unavailable', files: 1, reason: NS5_NO_COMPILE_CAPABILITY });
  assert.deepEqual(host.compiled, []);
});

void test('compileNs5Defs: an import that cannot be loaded is unavailable, not clean', async () => {
  const host = installHost({ compiler: true, withoutKeys: [ONTOLOGY_TYPES_KEY] });
  host.store[rulesDefsKey()] = RULES_DEFS_SOURCE;
  const record = await compileNs5Defs([rulesFile(MODULE)]);
  assert.equal(record.status, 'unavailable');
  assert.match(String(record.reason), /imports not loaded: _102034_\/l1\/mdm\/defs\/ontologyTypes\.ts/);
});

void test('compileNs5Defs: a file with no model is unavailable, not clean', async () => {
  installHost({ compiler: true, withoutRulesDefs: true });
  const record = await compileNs5Defs([rulesFile(MODULE)]);
  assert.equal(record.status, 'unavailable');
  assert.match(String(record.reason), /no model to compile/);
});

function pipelineWith(compile: (stepId: string) => Ns5CompileRecord | undefined): Ns5PipelineState {
  const steps: Ns5PipelineState['steps'] = {};
  for (const stepId of NS5_DEFS_WRITING_STEPS) {
    const record = compile(stepId);
    steps[stepId] = { status: 'approved', updatedAt: 'x', ...(record ? { compile: record } : {}) };
  }
  return { steps } as Ns5PipelineState;
}

void test('finalize80 gate: every writing step clean lets the oracle run; unavailable or missing blocks it', () => {
  assert.deepEqual(ns5CompileBlockers(pipelineWith(() => ({ status: 'clean', files: 1 }))), []);
  const unavailable = ns5CompileBlockers(pipelineWith(stepId => stepId === 'access60'
    ? { status: 'unavailable', files: 1, reason: NS5_NO_COMPILE_CAPABILITY }
    : { status: 'clean', files: 1 }));
  assert.deepEqual(unavailable, [`access60: not compiled (${NS5_NO_COMPILE_CAPABILITY})`]);
  const missing = ns5CompileBlockers(pipelineWith(stepId => stepId === 'rules40' ? undefined : { status: 'clean', files: 1 }));
  assert.deepEqual(missing, ['rules40: no compile recorded']);
});

void test('finalize80 asks the compile gate before the oracle', () => {
  const source = readFileSync(fileURLToPath(new URL('../steps/finalize80/agentNs5Finalize.ts', import.meta.url)), 'utf8');
  const gate = source.indexOf('ns5CompileBlockers(await requirePipeline(moduleName))');
  const oracle = source.indexOf('runNs5Oracle(sources)');
  assert.ok(gate > 0 && oracle > gate, 'ns5CompileBlockers must run before runNs5Oracle');
});

void test('compileNs5Defs: imports are read from the model text, so a root with no stor content still preloads them', async () => {
  const host = installHost({ compiler: true, opaqueRulesDefs: true });
  host.store[rulesDefsKey()] = RULES_DEFS_SOURCE;
  const record = await compileNs5Defs([rulesFile(MODULE)]);
  assert.deepEqual(record, { status: 'clean', files: 1 });
  assert.deepEqual(host.compiled, [TYPES_KEY, ONTOLOGY_TYPES_KEY, rulesDefsKey()]);
});

void test('compileNs5Defs: an l4 file is looked up in stor at level 4, never the l2 file with the same name', async () => {
  const host = installHost({ compiler: true, l2Twin: true });
  host.store[rulesDefsKey()] = RULES_DEFS_SOURCE;
  assert.equal(rulesFile(MODULE).level, 4);
  const record = await compileNs5Defs([rulesFile(MODULE)]);
  assert.deepEqual(record, { status: 'clean', files: 1 });
  assert.match(rulesDefsKey(), /^102047_4_/);
  assert.deepEqual(host.compiled, [TYPES_KEY, ONTOLOGY_TYPES_KEY, rulesDefsKey()]);
});

void test('module10: a repair owns the module.defs.ts of an earlier attempt (compile error, then gate error), never a finished module', () => {
  const running = { steps: { module10: { status: 'running', updatedAt: 'x' } } } as unknown as Ns5PipelineState;
  const approved = { steps: { module10: { status: 'approved', updatedAt: 'x' } } } as unknown as Ns5PipelineState;
  assert.equal(ns5Module10OwnsExistingDefs(0, running), false, 'attempt 0 always goes through the refusal');
  assert.equal(ns5Module10OwnsExistingDefs(2, running), true, 'attempt 2 after compile (0) and gate (1) errors: the state is running, no compile record');
  assert.equal(ns5Module10OwnsExistingDefs(1, approved), false, 'an approved module10 is a finished module');
  assert.equal(ns5Module10OwnsExistingDefs(1, null), false, 'no pipeline, nothing of this run');
});
