/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/entry10/entry10.ts" enhancement="_blank" />

import { parseReviewInvocation } from '/_102035_/l2/agentReviewSolution/helpers/invocation.js';
import { assertReviewSnapshotMatches, readReviewEntrySnapshot, reviewSnapshotFromContext } from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';
import { createReview20Step } from '/_102035_/l2/agentReviewSolution/steps/review20/agentReview20.js';

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
    assertReviewSnapshotMatches(reviewSnapshotFromContext(context), snapshot);
    return [
      { type: 'add-step', ...base, step: {
        type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [], stepTitle: 'Entry verified',
        result: JSON.stringify({ project, moduleName: snapshot.moduleName, baseId: snapshot.baseId,
          changeId: snapshot.changeId, revisionId: snapshot.revisionId, requestRevision: snapshot.requestRevision,
          changedPaths: snapshot.changedPaths, status: 'verified', nextStep: 'review20' }),
        planning: { planId: 'entry10-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
      } as mls.msg.AIResultStep },
      { type: 'add-step', ...base, step: createReview20Step(invocation) },
      { type: 'update-status', ...base, stepId: step.stepId, hookSequential, status: 'completed', cleaner: 'input_output',
        traceMsg: 'entry10 verified; private review20 scheduled.' },
    ];
  } catch (error) {
    return [{ type: 'update-status', ...base, stepId: step.stepId, hookSequential, status: 'failed', cleaner: 'input_output',
      traceMsg: error instanceof Error ? error.message : String(error) }];
  }
}
