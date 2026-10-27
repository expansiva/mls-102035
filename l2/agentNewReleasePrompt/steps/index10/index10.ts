/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/index10/index10.ts" enhancement="_blank" />

import { parseNrpInvocation } from '/_102035_/l2/agentNewReleasePrompt/helpers/invocation.js';
import { loadNrpArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/artifacts.js';
import { buildNrpIndex } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import { setModuleRoot } from '/_102035_/l2/solution/fs.js';
import { NRP_CANDIDATE_REL } from '/_102035_/l2/agentNewReleasePrompt/helpers/invocation.js';
import { createTriage20Step } from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';

export async function beforeNrpIndexStep(
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
    setModuleRoot(invocation.moduleName, `${invocation.moduleName}/${NRP_CANDIDATE_REL}`);
    const artifacts = await loadNrpArtifacts(invocation.moduleName);
    const index = buildNrpIndex(artifacts);
    const bytes = new TextEncoder().encode(JSON.stringify(index)).length;
    return [
      {
        type: 'add-step', ...base, step: {
          type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
          stepTitle: 'Index ready',
          result: JSON.stringify({ index, bytes, nextStep: 'triage20' }),
          planning: { planId: 'index10-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
        } as mls.msg.AIResultStep,
      },
      {
        type: 'update-status', ...base, stepId: step.stepId, hookSequential, status: 'completed',
        cleaner: 'input_output',
        traceMsg: `index10: ${index.entities.length} entities, ${index.rules.length} rules, ${bytes} bytes.`,
      },
      { type: 'add-step', ...base, step: createTriage20Step(String(step.prompt || '')) },
    ];
  } catch (error) {
    console.error('[agentNewReleasePrompt] index10 failed', error);
    return [{
      type: 'update-status', ...base, stepId: step.stepId, hookSequential, status: 'failed',
      cleaner: 'input_output',
      traceMsg: error instanceof Error ? error.message : String(error),
    }];
  }
}
