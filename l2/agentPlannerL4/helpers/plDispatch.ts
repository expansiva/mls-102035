/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plDispatch.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { ownerStepId, PL_AGENT_NAME, type PlStepId } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';

export type PlStepBeforePrompt = (
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
) => Promise<mls.msg.AgentIntent[]>;

export type PlStepAfterPrompt = (
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
) => Promise<mls.msg.AgentIntent[]>;

export interface PlStepHooks {
  beforePromptStep?: PlStepBeforePrompt;
  afterPromptStep?: PlStepAfterPrompt;
}

/** Filled by step modules. A missing entry means the step is not implemented yet. */
export const PL_STEP_HOOKS: Partial<Record<PlStepId, PlStepHooks>> = {};

export function planIdOf(step: mls.msg.AIAgentStep): string {
  return step.planning?.planId || '';
}

export function hooksFor(planId: string): PlStepHooks | undefined {
  const stepId = ownerStepId(planId);
  return stepId ? PL_STEP_HOOKS[stepId] : undefined;
}

export function plStatusMessage(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  message: string,
): mls.msg.AgentIntentAddMessageAI {
  return {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: `<!-- modelType: general -->\n${message}` },
        { type: 'human', content: message },
      ],
      taskTitle: 'planner L4',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'plannerL4', flowName: PL_AGENT_NAME, statusOnly: 'true' },
    },
  };
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
  opts?: { onlyUnimplemented?: boolean },
): mls.msg.AgentIntentUpdateStatus[] {
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  if (!root) return [];
  const intents: mls.msg.AgentIntentUpdateStatus[] = [];
  for (const sibling of walk(root.nextSteps || [])) {
    if (sibling.stepId === current.stepId) continue;
    if (sibling.status === 'completed' || sibling.status === 'failed') continue;
    if (opts?.onlyUnimplemented && hooksFor(planIdOf(sibling as mls.msg.AIAgentStep))) continue;
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
