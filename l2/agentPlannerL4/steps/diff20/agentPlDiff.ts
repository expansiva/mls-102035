/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/diff20/agentPlDiff.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { existingModuleName } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { runPlDiff } from '/_102035_/l2/agentPlannerL4/helpers/plDiff.js';
import {
  addPlStep,
  PL_STEP_HOOKS,
  updateStatus,
} from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';

export async function beforePlDiffPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const moduleName = existingModuleName(memoryString(context, 'moduleName') || moduleNameFromPrompt(step))
    || memoryString(context, 'moduleName')
    || moduleNameFromPrompt(step);
  const diff = await runPlDiff(moduleName);
  const status = `diff20: ${diff.items.length} item(s); base ${diff.base || '(none)'}; candidate ${diff.candidate || '(none)'}.`;
  return [
    doneAnchor(context, parentStep, moduleName, diff.base, diff.candidate, diff.items.length),
    updateStatus(context, parentStep, step, hookSequential, 'completed', status),
  ];
}

export async function afterPlDiffPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const message = 'diff20 is deterministic and must never receive an LLM response.';
  return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
}

function doneAnchor(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  base: string,
  candidate: string,
  itemCount: number,
): mls.msg.AgentIntentAddStep {
  return addPlStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Diff done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({
      moduleName, base, candidate, itemCount,
      completedStep: 'diff20', nextStep: 'dispatch20',
    }),
    planning: { planId: 'diff20-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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

PL_STEP_HOOKS.diff20 = {
  beforePromptStep: beforePlDiffPromptStep,
  afterPromptStep: afterPlDiffPromptStep,
};
