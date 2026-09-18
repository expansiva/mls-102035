/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/loop30/agentPlLoop.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import {
  applyPlLoopDecision,
  createPlInvokeStep,
  createPlLoopWaitStep,
  existingModuleName,
  gatherPlLoopDecision,
  invokePlanId,
  nextLoopWaitTick,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import {
  addPlStep,
  planIdOf,
  PL_STEP_HOOKS,
  plStatusMessage,
  updateStatus,
} from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';

export async function beforePlLoopPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const alreadyDone = getAllSteps(context.task?.iaCompressed?.nextSteps).some(
    item => item.planning?.planId === 'loop30-done',
  );
  if (alreadyDone) {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'loop30 already finished.')];
  }

  const moduleName = existingModuleName(memoryString(context, 'moduleName') || moduleNameFromPrompt(step))
    || memoryString(context, 'moduleName')
    || moduleNameFromPrompt(step);
  const decision = await gatherPlLoopDecision(moduleName);
  await applyPlLoopDecision(moduleName, decision, new Date());

  const intents: mls.msg.AgentIntent[] = [];
  const childIds: string[] = [];
  for (const item of decision.invoke) {
    const planId = invokePlanId(item.box, item.thread, item.round);
    childIds.push(planId);
    intents.push(addPlStep(context, parentStep, createPlInvokeStep({
      agentName: item.agentName,
      moduleName,
      thread: item.thread,
      file: item.path,
      planId,
    })));
  }

  if (childIds.length) {
    intents.push(addPlStep(
      context,
      parentStep,
      createPlLoopWaitStep(moduleName, childIds, nextLoopWaitTick(planIdOf(step))),
    ));
  } else {
    if (decision.status) intents.push(plStatusMessage(agent, context, decision.status));
    intents.push(doneAnchor(context, parentStep, moduleName, decision.status, decision.maxRound));
  }

  intents.push(updateStatus(
    context,
    parentStep,
    step,
    hookSequential,
    'completed',
    decision.status || `loop30 scheduled ${childIds.length} planner step(s).`,
  ));
  return intents;
}

export async function afterPlLoopPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const message = 'loop30 is deterministic and must never receive an LLM response.';
  return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
}

function doneAnchor(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  status: string,
  maxRound: number,
): mls.msg.AgentIntentAddStep {
  return addPlStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Loop done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({ moduleName, status, maxRound, completedStep: 'loop30', nextStep: '' }),
    planning: { planId: 'loop30-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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

PL_STEP_HOOKS.loop30 = {
  beforePromptStep: beforePlLoopPromptStep,
  afterPromptStep: afterPlLoopPromptStep,
};
