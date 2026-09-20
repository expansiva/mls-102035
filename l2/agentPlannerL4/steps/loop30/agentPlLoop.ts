/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/loop30/agentPlLoop.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import {
  applyPlLoopDecision,
  existingModuleName,
  gatherPlLoopDecision,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import {
  addPlStep,
  PL_STEP_HOOKS,
  updateStatus,
} from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';
import { listPoolBox } from '/_102035_/l2/solution/pool.js';

export async function beforePlLoopPromptStep(
  _agent: IAgentMeta,
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
  // Suspension: do not invoke other planners. Keep disputed recording so the round rule stays live.
  await applyPlLoopDecision(moduleName, { ...decision, invoke: [] }, new Date());
  const l1Count = listPoolBox(moduleName, 'l1').length;
  const l2Count = listPoolBox(moduleName, 'l2').length;
  const status = decision.status
    || `pool/l1 ${l1Count} pending, pool/l2 ${l2Count} pending. Dispatch to other planners is suspended.`;

  return [
    doneAnchor(context, parentStep, moduleName, status, decision.maxRound, l1Count, l2Count),
    updateStatus(context, parentStep, step, hookSequential, 'completed', status),
  ];
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
  l1Count: number,
  l2Count: number,
): mls.msg.AgentIntentAddStep {
  return addPlStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Loop done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({
      moduleName, status, maxRound, l1Count, l2Count, completedStep: 'loop30', nextStep: '',
    }),
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
