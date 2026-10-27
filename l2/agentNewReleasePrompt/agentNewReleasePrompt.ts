/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/agentNewReleasePrompt.ts" enhancement="_102027_/l2/enhancementAgent" />

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  NRP_AGENT_NAME,
  parseNrpInvocation,
  serializeNrpInvocation,
} from '/_102035_/l2/agentNewReleasePrompt/helpers/invocation.js';
import { beforeNrpEntryStep } from '/_102035_/l2/agentNewReleasePrompt/steps/entry10/entry10.js';
import { beforeNrpIndexStep } from '/_102035_/l2/agentNewReleasePrompt/steps/index10/index10.js';
import { afterNrpTriageStep, beforeNrpTriageStep } from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: NRP_AGENT_NAME,
    agentProject: 102035,
    agentFolder: 'agentNewReleasePrompt',
    agentDescription: 'Turn a free-text request into edits of the L4 version in editing.',
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
    const invocation = parseNrpInvocation(userPrompt, project);
    const addMessage: mls.msg.AgentIntentAddMessageAI = {
      type: 'add-message-ai', skipRootLLM: true,
      request: {
        action: 'addMessageAI', agentName: agent.agentName,
        inputAI: [
          { type: 'system', content: 'agentNewReleasePrompt deterministic entry; root LLM is skipped.' },
          { type: 'human', content: invocation.request },
        ],
        taskTitle: `Prompt edit ${invocation.moduleName}`,
        threadId: context.message.threadId,
        userMessage: context.message.content,
        longTermMemory: {
          flowName: NRP_AGENT_NAME,
          moduleName: invocation.moduleName,
        },
      },
    };
    return [addMessage, {
      type: 'add-step', messageId: '', threadId: context.message.threadId, taskId: '', parentStepId: 1,
      step: {
        type: 'agent', stepId: 0, interaction: null, nextSteps: [], status: 'waiting_human_input',
        agentName: NRP_AGENT_NAME, stepTitle: 'Prepare edit root',
        prompt: serializeNrpInvocation(invocation), rags: [],
        planning: { planId: 'entry10', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
      } as mls.msg.AIAgentStep,
    }];
  } catch (error) {
    console.error('[agentNewReleasePrompt] implicit entry rejected', error);
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
  if (step.planning?.planId === 'entry10') return beforeNrpEntryStep(context, parentStep, step, hookSequential);
  if (step.planning?.planId === 'index10') return beforeNrpIndexStep(context, parentStep, step, hookSequential);
  if (step.planning?.planId === 'triage20') return beforeNrpTriageStep(context, parentStep, step, hookSequential);
  if (!step.planning?.planId) {
    return [update(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed without LLM.')];
  }
  return [update(context, parentStep, step, hookSequential, 'failed', `Step ${step.planning.planId} is not enabled.`)];
}

export async function afterPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (step.planning?.planId === 'triage20') return afterNrpTriageStep(context, parentStep, step, hookSequential);
  return [];
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
      inputAI: [{ type: 'system', content: 'Prompt entry rejected before LLM work.' }, { type: 'human', content: message }],
      taskTitle: 'Prompt edit rejected',
      threadId: context.message.threadId,
      userMessage: context.message.content,
    },
  };
  return [addMessage, {
    type: 'add-step', messageId: '', threadId: context.message.threadId, taskId: '', parentStepId: 1,
    step: {
      type: 'result', stepId: 0, interaction: null, nextSteps: [], status: 'completed',
      stepTitle: 'Status', result: message,
      planning: { planId: 'status', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIResultStep,
  }];
}
