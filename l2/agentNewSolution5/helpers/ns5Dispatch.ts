/// <mls fileReference="_102035_/l2/agentNewSolution5/helpers/ns5Dispatch.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { writePipeline } from '/_102035_/l2/solution/fs.js';
import type { Ns5PipelineState, Ns5StepId } from '/_102035_/l2/solution/types.js';
import { ownerStepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';

export type Ns5StepBeforePrompt = (
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
) => Promise<mls.msg.AgentIntent[]>;

export type Ns5StepAfterPrompt = (
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
) => Promise<mls.msg.AgentIntent[]>;

export type Ns5StepBeforeClarification = (
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
) => Promise<HTMLElement>;

export interface Ns5StepHooks {
  beforePromptStep?: Ns5StepBeforePrompt;
  afterPromptStep?: Ns5StepAfterPrompt;
  beforeClarificationStep?: Ns5StepBeforeClarification;
}

/** Filled by later specs. A missing entry means the step is not implemented yet. */
export const NS5_STEP_HOOKS: Partial<Record<Ns5StepId, Ns5StepHooks>> = {};

export function planIdOf(step: mls.msg.AIAgentStep): string {
  return step.planning?.planId || '';
}

export function hooksFor(planId: string): Ns5StepHooks | undefined {
  const stepId = ownerStepId(planId);
  return stepId ? NS5_STEP_HOOKS[stepId] : undefined;
}

export async function markAwaitingStep(
  pipeline: Ns5PipelineState,
  stepId: Ns5StepId,
): Promise<Ns5PipelineState> {
  const next: Ns5PipelineState = {
    ...pipeline,
    status: 'awaitingStep',
    awaitingStep: stepId,
    updatedAt: new Date().toISOString(),
  };
  await writePipeline(next);
  return next;
}

export function updateStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg: string,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
    cleaner: 'input_output',
    traceMsg,
  };
}

export function drainWaitingSiblings(
  context: mls.msg.ExecutionContext,
  current: mls.msg.AIAgentStep,
  hookSequential: number,
  traceMsg: string,
): mls.msg.AgentIntentUpdateStatus[] {
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  if (!root) return [];
  const intents: mls.msg.AgentIntentUpdateStatus[] = [];
  for (const sibling of walk(root.nextSteps || [])) {
    if (sibling.stepId === current.stepId) continue;
    if (sibling.status === 'completed' || sibling.status === 'failed') continue;
    intents.push(updateStatus(context, root, sibling, hookSequential, 'completed', traceMsg));
  }
  return intents;
}

function walk(steps: mls.msg.AIPayload[]): mls.msg.AIPayload[] {
  const out: mls.msg.AIPayload[] = [];
  for (const step of steps) {
    out.push(step);
    if (step.nextSteps?.length) out.push(...walk(step.nextSteps));
  }
  return out;
}
