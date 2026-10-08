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
import { readChangeRequest } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { moduleFile, readJson } from '/_102035_/l2/solution/fs.js';
import { readL5Config } from '/_102035_/l2/solution/lib.js';
import {
  CHANGE_EFFORT_SCHEMA_VERSION,
  type ChangeEffortFile,
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
  if (candidateRootOf(moduleName)) await recordMaintenanceEffort(moduleName);
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

/** After `l4diff`, on `/candidate` only: ask each master, merge, write `pool/l4/changeEffort.json`, then keep today's dispatch. */
async function recordMaintenanceEffort(moduleName: string): Promise<ChangeEffortFile> {
  const diff = await readJson<L4Diff>(l4diffFile(moduleName, 'l2'));
  if (!diff) throw new Error(`l4diff missing for ${moduleName}`);
  const config = await readL5Config();
  const masters = effortMasters(config ?? {});
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
    untouched: { count: 0, sealHash: '' },
    status: merged.status,
  };
  await writeChangeEffort(moduleName, file);
  return file;
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
