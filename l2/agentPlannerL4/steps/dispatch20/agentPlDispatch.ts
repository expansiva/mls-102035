/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/dispatch20/agentPlDispatch.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import {
  createPlInvokeStep,
  createPlLoopWaitStep,
  existingModuleName,
  invokePlanId,
  PL_L1_AGENT,
  PL_L2_AGENT,
  runPlDispatch,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import {
  addPlStep,
  PL_STEP_HOOKS,
  plStatusMessage,
  updateStatus,
} from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';

export async function beforePlDispatchPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const moduleName = existingModuleName(memoryString(context, 'moduleName') || moduleNameFromPrompt(step))
    || memoryString(context, 'moduleName')
    || moduleNameFromPrompt(step);
  const result = await runPlDispatch(moduleName, new Date());
  const intents: mls.msg.AgentIntent[] = [];
  const childIds: string[] = [];

  if (result.invokeL2) {
    const planId = invokePlanId('l2', result.thread, 1);
    childIds.push(planId);
    intents.push(addPlStep(context, parentStep, createPlInvokeStep({
      agentName: PL_L2_AGENT,
      moduleName,
      thread: result.thread,
      file: result.l2Path,
      planId,
    })));
  }
  if (result.invokeL1) {
    const planId = invokePlanId('l1', result.thread, 1);
    childIds.push(planId);
    intents.push(addPlStep(context, parentStep, createPlInvokeStep({
      agentName: PL_L1_AGENT,
      moduleName,
      thread: result.thread,
      file: result.l1Path,
      planId,
    })));
  }

  if (childIds.length) {
    const plannedLoop = getAllSteps(context.task?.iaCompressed?.nextSteps).find(
      item => item.planning?.planId === 'loop30' && item.status !== 'completed' && item.status !== 'failed',
    );
    if (plannedLoop) {
      intents.push(updateStatus(
        context,
        parentStep,
        plannedLoop,
        hookSequential,
        'completed',
        'loop waits on planner steps',
      ));
    }
    intents.push(addPlStep(context, parentStep, createPlLoopWaitStep(moduleName, childIds, 1)));
  }

  if (result.status) intents.push(plStatusMessage(agent, context, result.status));
  intents.push(doneAnchor(context, parentStep, moduleName, result.thread, result.artifacts.length));
  intents.push(updateStatus(
    context,
    parentStep,
    step,
    hookSequential,
    'completed',
    `dispatch20 wrote pool/l2 and pool/l1 (${result.artifacts.length} artifacts).`,
  ));
  return intents;
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
): mls.msg.AgentIntentAddStep {
  return addPlStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Dispatch done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({ moduleName, thread, artifactCount, completedStep: 'dispatch20', nextStep: 'loop30' }),
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
