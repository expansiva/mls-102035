/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/entry10/entry10.ts" enhancement="_blank" />

import { parseNrpInvocation, serializeNrpInvocation } from '/_102035_/l2/agentNewReleasePrompt/helpers/invocation.js';
import { ensureEditRoot } from '/_102035_/l2/agentNewReleasePrompt/helpers/artifacts.js';

export function createIndex10Step(prompt: string): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    nextSteps: [],
    status: 'waiting_human_input',
    agentName: 'agentNewReleasePrompt',
    stepTitle: 'Index the module',
    prompt,
    rags: [],
    planning: { planId: 'index10', dependsOn: ['entry10-done'], executionMode: 'sequential', executionHost: 'client' },
  };
}

export async function beforeNrpEntryStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const base = {
    messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId,
  };
  try {
    const project = mls.actualProject || 0;
    const invocation = parseNrpInvocation(String(step.prompt || ''), project);
    const prepared = await ensureEditRoot(invocation);
    const prompt = serializeNrpInvocation(invocation);
    return [
      {
        type: 'add-step', ...base, step: {
          type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
          stepTitle: 'Entry verified',
          result: JSON.stringify({
            project, moduleName: invocation.moduleName, root: prepared.root,
            copied: prepared.copied, nextStep: 'index10',
          }),
          planning: { planId: 'entry10-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
        } as mls.msg.AIResultStep,
      },
      { type: 'add-step', ...base, step: createIndex10Step(prompt) },
      {
        type: 'update-status', ...base, stepId: step.stepId, hookSequential, status: 'completed',
        cleaner: 'input_output',
        traceMsg: `entry10: edit root ${prepared.root} (copied ${prepared.copied}).`,
      },
    ];
  } catch (error) {
    console.error('[agentNewReleasePrompt] entry10 failed', error);
    return [{
      type: 'update-status', ...base, stepId: step.stepId, hookSequential, status: 'failed',
      cleaner: 'input_output',
      traceMsg: error instanceof Error ? error.message : String(error),
    }];
  }
}
