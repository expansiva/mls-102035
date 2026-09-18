/// <mls fileReference="_102035_/l2/agentNewSolution5/agentNewSolution5.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readPipeline } from '/_102035_/l2/solution/fs.js';
import type { Ns5Invocation, Ns5StepId } from '/_102035_/l2/solution/types.js';
import {
  NS5_AGENT_NAME,
  buildNs5PlannedSteps,
  existingModuleName,
  isNs5StepId,
  moduleTokenOk,
  ns5EntryRefusal,
  parseNs5Invocation,
  startNs5Pipeline,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import {
  drainWaitingSiblings,
  hooksFor,
  markAwaitingStep,
  ns5StatusMessage,
  planIdOf,
  updateStatus,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Dispatch.js';
import '/_102035_/l2/agentNewSolution5/steps/module10/agentNs5Module.js';
import '/_102035_/l2/agentNewSolution5/steps/journeys20/agentNs5Journeys.js';
import '/_102035_/l2/agentNewSolution5/steps/ontology30/agentNs5Ontology.js';
import '/_102035_/l2/agentNewSolution5/steps/rules40/agentNs5Rules.js';
import '/_102035_/l2/agentNewSolution5/steps/workflows50/agentNs5Workflows.js';
import '/_102035_/l2/agentNewSolution5/steps/access60/agentNs5Access.js';
import '/_102035_/l2/agentNewSolution5/steps/integration70/agentNs5Integration.js';
import '/_102035_/l2/agentNewSolution5/steps/finalize80/agentNs5Finalize.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: NS5_AGENT_NAME,
    agentProject: 102035,
    agentFolder: 'agentNewSolution5',
    agentDescription: 'L4 v5 source compiler — six business sources, no derived artifacts',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
    beforeClarificationStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseNs5Invocation(userPrompt || '');
  const existing = invocation.module && moduleTokenOk(invocation.module) ? existingModuleName(invocation.module) : '';
  const refusal = ns5EntryRefusal(invocation, existing);
  if (refusal) return statusTask(agent, context, refusal);

  const moduleName = existing || invocation.module;
  const flags: Ns5Invocation = { fast: invocation.fast, module: moduleName, rebuildAll: invocation.rebuildAll };
  if (moduleName) await startNs5Pipeline(moduleName, invocation.prompt, flags, invocation.rebuildAll);

  const addMessage: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: 'agentNewSolution5 deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.' },
        { type: 'human', content: invocation.prompt || moduleName },
      ],
      taskTitle: `plan ${moduleName || 'new module'}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'newSolution5',
        flowName: NS5_AGENT_NAME,
        moduleName,
        sourcePrompt: invocation.prompt,
        ...(invocation.fast ? { fastMode: 'true' } : {}),
        ...(invocation.rebuildAll ? { rebuildAll: 'true' } : {}),
      },
    },
  };

  const steps = buildNs5PlannedSteps(moduleName).map(step => addStepIntent(context, step));
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
  const hooks = hooksFor(planId, args, step.prompt);
  if (hooks?.beforePromptStep) return hooks.beforePromptStep(agent, context, parentStep, step, hookSequential, args);
  if (isNs5StepId(planId)) return notImplemented(context, parentStep, step, hookSequential, planId);
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
  const hooks = hooksFor(planId, args, step.prompt);
  if (hooks?.afterPromptStep) return hooks.afterPromptStep(agent, context, parentStep, step, hookSequential, args);
  if (isNs5StepId(planId)) return notImplemented(context, parentStep, step, hookSequential, planId);
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed (no model).')];
}

async function beforeClarificationStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
): Promise<HTMLElement> {
  const planId = typeof step.planning?.planId === 'string' ? step.planning.planId : '';
  const hooks = hooksFor(planId);
  if (hooks?.beforeClarificationStep) {
    return hooks.beforeClarificationStep(agent, context, parentStep, step, hookSequential, json);
  }
  throw new Error(`Clarification is reserved and not implemented for step ${planId || '(missing)'}.`);
}

async function notImplemented(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  stepId: Ns5StepId,
): Promise<mls.msg.AgentIntent[]> {
  const moduleName = memoryString(context, 'moduleName') || moduleNameFromPrompt(step);
  if (moduleName) {
    const pipeline = await readPipeline(moduleName);
    if (pipeline) await markAwaitingStep(pipeline, stepId);
  }
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
  const addMessage = ns5StatusMessage(agent, context, message);
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
