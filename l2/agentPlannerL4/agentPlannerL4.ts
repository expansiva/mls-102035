/// <mls fileReference="_102035_/l2/agentPlannerL4/agentPlannerL4.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PL_AGENT_NAME,
  buildPlPlannedSteps,
  existingModuleName,
  gatherPlEntryFacts,
  isPlStepId,
  parsePlInvocation,
  plEntryRefusal,
  type PlStepId,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import {
  drainWaitingSiblings,
  hooksFor,
  planIdOf,
  plStatusMessage,
  updateStatus,
} from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';
import '/_102035_/l2/agentPlannerL4/steps/entry10/agentPlEntry.js';
import '/_102035_/l2/agentPlannerL4/steps/dispatch20/agentPlDispatch.js';
import '/_102035_/l2/agentPlannerL4/steps/loop30/agentPlLoop.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: PL_AGENT_NAME,
    agentProject: 102035,
    agentFolder: 'agentPlannerL4',
    agentDescription: 'L4 planner — lists module artifacts and dispatches L2/L1 planners through the module pool',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const invocation = parsePlInvocation(userPrompt || '');
  const facts = await gatherPlEntryFacts(invocation.module);
  const refusal = plEntryRefusal(invocation, facts);
  if (refusal) return statusTask(agent, context, refusal);

  const moduleName = existingModuleName(invocation.module) || invocation.module;
  const addMessage: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: 'agentPlannerL4 deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.' },
        { type: 'human', content: moduleName },
      ],
      taskTitle: `plan ${moduleName}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'plannerL4',
        flowName: PL_AGENT_NAME,
        moduleName,
        ...(invocation.fast ? { fastMode: 'true' } : {}),
      },
    },
  };

  const steps = buildPlPlannedSteps(moduleName).map(step => addStepIntent(context, step));
  return [addMessage, ...steps];
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const planId = planIdOf(step);
  const hooks = hooksFor(planId);
  if (hooks?.beforePromptStep) return hooks.beforePromptStep(agent, context, parentStep, step, hookSequential, args);
  if (isPlStepId(planId)) return notImplemented(context, parentStep, step, hookSequential, planId);
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed (no model).')];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const planId = planIdOf(step);
  const hooks = hooksFor(planId);
  if (hooks?.afterPromptStep) return hooks.afterPromptStep(agent, context, parentStep, step, hookSequential, args);
  if (isPlStepId(planId)) return notImplemented(context, parentStep, step, hookSequential, planId);
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed (no model).')];
}

async function notImplemented(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  stepId: PlStepId,
): Promise<mls.msg.AgentIntent[]> {
  const traceMsg = `step ${stepId} not implemented yet`;
  return [
    ...drainWaitingSiblings(context, step, hookSequential, `stopped: awaiting step ${stepId}`, { onlyUnimplemented: true }),
    updateStatus(context, parentStep, step, hookSequential, 'completed', traceMsg),
  ];
}

function addStepIntent(context: mls.msg.ExecutionContext, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: '',
    threadId: context.message.threadId,
    taskId: '',
    parentStepId: 1,
    step,
  };
}

function statusTask(agent: IAgentMeta, context: mls.msg.ExecutionContext, message: string): mls.msg.AgentIntent[] {
  const addMessage = plStatusMessage(agent, context, message);
  const result: mls.msg.AIPayload = {
    type: 'result',
    stepId: 0,
    status: 'completed',
    interaction: null,
    nextSteps: [],
    stepTitle: 'Status',
    result: message,
    planning: { planId: 'status', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIResultStep;
  return [addMessage, addStepIntent(context, result)];
}
