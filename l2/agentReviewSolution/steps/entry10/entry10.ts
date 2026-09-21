/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/entry10/entry10.ts" enhancement="_blank" />

import { parseReviewInvocation } from '/_102035_/l2/agentReviewSolution/helpers/invocation.js';
import { readReviewEntrySnapshot } from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';

export async function beforeReviewEntryStep(
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
    const invocation = parseReviewInvocation(String(step.prompt || ''), project);
    const snapshot = await readReviewEntrySnapshot(invocation);
    const frozen = context.task?.iaCompressed?.longMemory?.entrySnapshot;
    if (typeof frozen !== 'string') throw new Error('Review entry snapshot is missing from the task.');
    const first = JSON.parse(frozen) as typeof snapshot;
    if (first.project !== snapshot.project || first.moduleName !== snapshot.moduleName || first.baseId !== snapshot.baseId
      || first.changeId !== snapshot.changeId || first.revisionId !== snapshot.revisionId || first.request !== snapshot.request
      || JSON.stringify(first.candidateHashes) !== JSON.stringify(snapshot.candidateHashes)) {
      throw new Error('L4 revision conflict: candidate changed after the review task was created.');
    }
    return [
      { type: 'add-step', ...base, step: {
        type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [], stepTitle: 'Entry verified',
        result: JSON.stringify({ project, moduleName: snapshot.moduleName, baseId: snapshot.baseId,
          changeId: snapshot.changeId, revisionId: snapshot.revisionId, requestRevision: snapshot.requestRevision,
          changedPaths: snapshot.changedPaths, status: 'prepared-only', nextStep: null }),
        planning: { planId: 'entry10-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
      } as mls.msg.AIResultStep },
      { type: 'update-status', ...base, stepId: step.stepId, hookSequential, status: 'completed', cleaner: 'input_output',
        traceMsg: 'entry10 verified; review execution is not enabled yet.' },
    ];
  } catch (error) {
    return [{ type: 'update-status', ...base, stepId: step.stepId, hookSequential, status: 'failed', cleaner: 'input_output',
      traceMsg: error instanceof Error ? error.message : String(error) }];
  }
}
