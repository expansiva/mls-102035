/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/dispatch20/agentPlDispatch.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  createRound1InvokeSteps,
  existingModuleName,
  runPlDispatch,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import {
  addPlStep,
  PL_STEP_HOOKS,
  updateStatus,
} from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';

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
  const result = await runPlDispatch(moduleName, new Date());
  const invoke = createRound1InvokeSteps(moduleName, result);
  const missing = result.status;
  const status = missing
    || `pool/l1 and pool/l2 pending for the planners (${result.artifacts.length} artifacts).`;
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
        || `dispatch20 wrote pool/l2 and pool/l1 and created ${invoke.length} planner step(s).`,
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
