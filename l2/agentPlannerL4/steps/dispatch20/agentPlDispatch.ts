/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/dispatch20/agentPlDispatch.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  candidateRootOf,
  createRound1InvokeSteps,
  existingModuleName,
  loadPlRevision,
  runPlDispatch,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { l4diffFile } from '/_102035_/l2/agentPlannerL4/helpers/plDiff.js';
import {
  describeItemEffort,
  effortMasters,
  mergeEffort,
  writeChangeEffort,
} from '/_102035_/l2/agentPlannerL4/helpers/plEffort.js';
import {
  addPlStep,
  PL_STEP_HOOKS,
  updateStatus,
} from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';
import { enumerateModuleLayers } from '/_102035_/l2/solution/candidate/moduleLayers.js';
import { readChangeRequest } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { moduleFile, readJson } from '/_102035_/l2/solution/fs.js';
import { readL5Project } from '/_102035_/l2/solution/lib.js';
import {
  CHANGE_EFFORT_SCHEMA_VERSION,
  type ChangeEffortFile,
  type EffortAnswer,
  type L4Diff,
} from '/_102035_/l2/solution/poolPlan.js';

export async function beforePlDispatchPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const moduleName = existingModuleName(memoryString(context, 'moduleName') || moduleNameFromPrompt(step))
    || memoryString(context, 'moduleName')
    || moduleNameFromPrompt(step);
  if (candidateRootOf(moduleName)) {
    await recordMaintenanceEffort(moduleName);
    return [
      doneAnchor(context, parentStep, moduleName, '', 1, 'pool/l4/changeEffort.json written.', 0),
      updateStatus(context, parentStep, step, hookSequential, 'completed', 'dispatch20 wrote pool/l4/changeEffort.json.'),
    ];
  }
  const result = await runPlDispatch(moduleName, new Date());
  const invoke = createRound1InvokeSteps(moduleName, result);
  const missing = result.status;
  const status = missing
    || `pool/l2 pending for the planner (${result.artifacts.length} artifacts).`;
  return [
    ...invoke.map(child => addPlStep(context, parentStep, child)),
    doneAnchor(context, parentStep, moduleName, result.thread, result.artifacts.length, status, invoke.length),
    updateStatus(
      context,
      parentStep,
      step,
      hookSequential,
      'completed',
      missing
        || `dispatch20 wrote pool/l2 and created ${invoke.length} planner step(s).`,
    ),
  ];
}

export async function afterPlDispatchPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const message = 'dispatch20 is deterministic and must never receive an LLM response.';
  return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
}

function doneAnchor(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  thread: string,
  artifactCount: number,
  status: string,
  invokeCount: number,
): mls.msg.AgentIntentAddStep {
  return addPlStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Dispatch done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({
      moduleName, thread, artifactCount, status, invokeCount,
      completedStep: 'dispatch20', nextStep: 'loop30',
    }),
    planning: { planId: 'dispatch20-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

/** After `l4diff`, on `/candidate` only: ask each master, merge, and write `pool/l4/changeEffort.json`. */
async function recordMaintenanceEffort(moduleName: string): Promise<ChangeEffortFile> {
  const diff = await readJson<L4Diff>(l4diffFile(moduleName, 'l2'));
  if (!diff) throw new Error(`l4diff missing for ${moduleName}`);
  const projectFilePath = 'l5/project.json';
  const projectJson = await readL5Project();
  const masters = effortMasters(projectJson, projectFilePath);
  const revision = await loadPlRevision(moduleName);
  const request = await readChangeRequest(moduleFile(moduleName).project, moduleName);
  const base = { baseId: revision?.baseId ?? '', revisionId: revision?.revisionId ?? '' };
  const perItem = [];
  for (const item of diff.items) {
    const answers = [];
    for (const master of masters) {
      answers.push(await describeItemEffort(master, { module: moduleName, base, item }));
    }
    perItem.push({ item, answers });
  }
  const merged = mergeEffort(perItem);
  const file: ChangeEffortFile = {
    schemaVersion: CHANGE_EFFORT_SCHEMA_VERSION,
    module: moduleName,
    base: { ...base, candidateRoot: candidateRootOf(moduleName) },
    request: { text: request?.text ?? '', items: diff.items },
    masters,
    perItem: merged.perItem,
    merged: merged.merged,
    untouched: await untouchedOf(moduleName, perItem.flatMap(row => row.answers)),
    status: merged.status,
  };
  await writeChangeEffort(moduleName, file);
  return file;
}

/** Module layer files no answer cites. Hash is the review seal digest of `{level, path, sha256}`. */
async function untouchedOf(
  moduleName: string,
  answers: readonly EffortAnswer[],
): Promise<ChangeEffortFile['untouched']> {
  const files = await enumerateModuleLayers(moduleFile(moduleName).project, moduleName);
  const cited = citedLayerKeys(moduleName, answers);
  const kept = files
    .filter(file => !cited.has(`${file.level}:${file.path}`))
    .map(file => ({ level: file.level, path: file.path, sha256: file.sha256 }));
  return { count: kept.length, sealHash: await sha256Text(JSON.stringify(kept)) };
}

function citedLayerKeys(moduleName: string, answers: readonly EffortAnswer[]): Set<string> {
  const keys = new Set<string>();
  for (const answer of answers) {
    for (const unit of [...answer.create, ...answer.regenerateDefs, ...answer.materialize, ...answer.remove]) {
      const key = layerKey(moduleName, unit.path);
      if (key) keys.add(key);
    }
  }
  return keys;
}

function layerKey(moduleName: string, unitPath: string): string | undefined {
  for (const level of [1, 2] as const) {
    const prefix = `l${level}/${moduleName}/`;
    if (unitPath.startsWith(prefix)) return `${level}:${unitPath.slice(prefix.length)}`;
  }
  return undefined;
}

async function sha256Text(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function moduleNameFromPrompt(step: mls.msg.AIAgentStep): string {
  try {
    const parsed = JSON.parse(String(step.prompt || '{}')) as { moduleName?: unknown };
    return typeof parsed.moduleName === 'string' ? parsed.moduleName : '';
  } catch {
    return '';
  }
}

PL_STEP_HOOKS.dispatch20 = {
  beforePromptStep: beforePlDispatchPromptStep,
  afterPromptStep: afterPlDispatchPromptStep,
};
