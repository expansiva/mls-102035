/// <mls fileReference="_102035_/l2/agentReviewSolution/agentReviewSolution.ts" enhancement="_102027_/l2/enhancementAgent" />

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { parseReviewInvocation } from '/_102035_/l2/agentReviewSolution/helpers/invocation.js';
import { readReviewEntrySnapshot } from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';
import { captureReviewTaskState } from '/_102035_/l2/agentReviewSolution/helpers/reviewTaskState.js';
import { beforeReviewEntryStep } from '/_102035_/l2/agentReviewSolution/steps/entry10/entry10.js';
import { afterReview20PromptStep, beforeReview20PromptStep } from '/_102035_/l2/agentReviewSolution/steps/review20/agentReview20.js';
import { beforeReconcile30Step } from '/_102035_/l2/agentReviewSolution/steps/reconcile30/agentReconcile30.js';
import { beforeValidate40Step } from '/_102035_/l2/agentReviewSolution/steps/validate40/agentValidate40.js';
import { beforeCorrection45Step } from '/_102035_/l2/agentReviewSolution/steps/correction45/agentCorrection45.js';
import { beforeFinalize50Step } from '/_102035_/l2/agentReviewSolution/steps/finalize50/agentFinalize50.js';

export const REVIEW_AGENT_NAME = 'agentReviewSolution' as const;

export function createAgent(): IAgentAsync {
  return {
    agentName: REVIEW_AGENT_NAME,
    agentProject: 102035,
    agentFolder: 'agentReviewSolution',
    agentDescription: 'Private L4 review with exact-byte, permit-gated conditional candidate publication.',
    visibility: 'private',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

export async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const project = mls.actualProject || 0;
    const invocation = parseReviewInvocation(userPrompt, project);
    const snapshot = await readReviewEntrySnapshot(invocation);
    const reviewPrivateState = await captureReviewTaskState(snapshot);
    const addMessage: mls.msg.AgentIntentAddMessageAI = {
      type: 'add-message-ai', skipRootLLM: true,
      request: {
        action: 'addMessageAI', agentName: agent.agentName,
        inputAI: [
          { type: 'system', content: 'agentReviewSolution deterministic entry; root LLM is skipped.' },
          { type: 'human', content: invocation.request },
        ],
        taskTitle: `Prepare review ${snapshot.moduleName}`,
        threadId: context.message.threadId,
        userMessage: context.message.content,
        longTermMemory: {
          flowName: REVIEW_AGENT_NAME,
          entrySnapshot: JSON.stringify(snapshot),
          reviewPrivateState: JSON.stringify(reviewPrivateState),
        },
      },
    };
    return [addMessage, {
      type: 'add-step', messageId: '', threadId: context.message.threadId, taskId: '', parentStepId: 1,
      step: {
        type: 'agent', stepId: 0, interaction: null, nextSteps: [], status: 'waiting_human_input',
        agentName: REVIEW_AGENT_NAME, stepTitle: 'Verify review input', prompt: JSON.stringify(invocation), rags: [],
        planning: { planId: 'entry10', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
      } as mls.msg.AIAgentStep,
    }];
  } catch (error) {
    return statusOnly(agent, context, error instanceof Error ? error.message : String(error));
  }
}

export async function beforePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (step.planning?.planId === 'entry10') return beforeReviewEntryStep(context, parentStep, step, hookSequential);
  if (step.planning?.planId === 'review20') return beforeReview20PromptStep(context, parentStep, step, hookSequential);
  if (step.planning?.planId === 'reconcile30') return beforeReconcile30Step(context, parentStep, step, hookSequential);
  if (step.planning?.planId === 'validate40') return beforeValidate40Step(context, parentStep, step, hookSequential);
  if (step.planning?.planId?.startsWith('validate40-attempt-')) return beforeValidate40Step(context, parentStep, step, hookSequential);
  if (step.planning?.planId?.startsWith('correction45-attempt-')) return beforeCorrection45Step(context, parentStep, step, hookSequential);
  if (step.planning?.planId === 'finalize50') return beforeFinalize50Step(context, parentStep, step, hookSequential);
  if (!step.planning?.planId) return [update(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed without LLM.')];
  return [update(context, parentStep, step, hookSequential, 'failed', `Review step ${step.planning.planId} is not enabled.`)];
}

export async function afterPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (step.planning?.planId === 'review20') return afterReview20PromptStep(context, parentStep, step, hookSequential);
  if (!step.planning?.planId) return [update(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed without LLM.')];
  return [update(context, parentStep, step, hookSequential, 'failed', `Review step ${step.planning.planId} has no afterPrompt handler.`)];
}

export function update(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg: string,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, stepId: step.stepId,
    hookSequential, status, cleaner: 'input_output', traceMsg,
  };
}

function statusOnly(agent: IAgentMeta, context: mls.msg.ExecutionContext, message: string): mls.msg.AgentIntent[] {
  const addMessage: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai', skipRootLLM: true,
    request: {
      action: 'addMessageAI', agentName: agent.agentName,
      inputAI: [{ type: 'system', content: 'Review entry rejected before LLM work.' }, { type: 'human', content: message }],
      taskTitle: 'Review input rejected', threadId: context.message.threadId,
      userMessage: context.message.content, longTermMemory: { flowName: REVIEW_AGENT_NAME, statusOnly: 'true' },
    },
  };
  return [addMessage, {
    type: 'add-step', messageId: '', threadId: context.message.threadId, taskId: '', parentStepId: 1,
    step: {
      type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [], stepTitle: 'Status', result: message,
      planning: { planId: 'status', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
    } as mls.msg.AIResultStep,
  }];
}
