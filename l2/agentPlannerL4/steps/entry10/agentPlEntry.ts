/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/entry10/agentPlEntry.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import {
  applyL5PlannerDeps,
  existingModuleName,
  gatherPlEntryFacts,
  parsePlInvocation,
  plEntryRefusal,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import {
  PL_STEP_HOOKS,
  addPlStep,
  drainWaitingSiblings,
  updateStatus,
} from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';

export async function beforePlEntryPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const moduleName = memoryString(context, 'moduleName') || moduleNameFromPrompt(step);
  const invocation = parsePlInvocation(moduleName);
  invocation.fast = memoryString(context, 'fastMode') === 'true';
  if (moduleName) invocation.module = moduleName;
  const facts = await gatherPlEntryFacts(invocation.module);
  const refusal = plEntryRefusal(invocation, facts);
  if (refusal) {
    return [
      addPlStep(context, parentStep, {
        type: 'result',
        stepId: 0,
        status: 'completed',
        interaction: null,
        nextSteps: [],
        stepTitle: 'Status',
        result: refusal,
        planning: { planId: 'status', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
      } as mls.msg.AIResultStep),
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${refusal}`),
      updateStatus(context, parentStep, step, hookSequential, 'completed', refusal),
    ];
  }

  const existing = existingModuleName(invocation.module) || invocation.module;
  const adjusted = await applyL5PlannerDeps(existing);
  const already = getAllSteps(context.task?.iaCompressed?.nextSteps).some(
    item => item.planning?.planId === 'entry10-done',
  );
  const extra = already ? [] : [doneAnchor(context, parentStep, existing, adjusted)];
  const trace = adjusted.length
    ? `entry10 adjusted l5/config.json (${adjusted.join(', ')}).`
    : 'entry10: l5/config.json already lists the planner projects.';
  return [
    ...extra,
    updateStatus(context, parentStep, step, hookSequential, 'completed', trace),
  ];
}

export async function afterPlEntryPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const message = 'entry10 is deterministic and must never receive an LLM response.';
  return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
}

function doneAnchor(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  l5Adjusted: string[],
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'result',
      stepId: 0,
      interaction: null,
      stepTitle: 'Entry done',
      status: 'completed',
      nextSteps: [],
      result: JSON.stringify({ moduleName, l5Adjusted, completedStep: 'entry10', nextStep: 'dispatch20' }),
      planning: { planId: 'entry10-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
    } as mls.msg.AIResultStep,
  };
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

PL_STEP_HOOKS.entry10 = {
  beforePromptStep: beforePlEntryPromptStep,
  afterPromptStep: afterPlEntryPromptStep,
};
