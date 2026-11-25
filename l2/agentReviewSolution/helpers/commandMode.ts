/// <mls fileReference="_102035_/l2/agentReviewSolution/helpers/commandMode.ts" enhancement="_blank" />

/** Task long memory flag the entry sets when the review is asked by command (`@@agentReviewSolution <module>`), not by the screen. */
export const REVIEW_BY_COMMAND_KEY = 'reviewByCommand' as const;

/**
 * l4_p4_166: the screen can show a question and wait for the person, so it keeps the step that waits. A command has no
 * one to answer: the question ends the task. Same rule as the other agents (a question of the agent ends its task).
 */
export function reviewByCommand(context: mls.msg.ExecutionContext): boolean {
  const memory = context.task?.iaCompressed?.longMemory as Record<string, unknown> | undefined;
  return memory?.[REVIEW_BY_COMMAND_KEY] === 'true';
}

/** The task ends `completed` with `refused: <step>: <clarification|invalid>` and the diagnostic, with no step waiting for a person. */
export function reviewCommandRefusal(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  stepName: string,
  kind: 'clarification' | 'invalid',
  diagnostic: string,
): mls.msg.AgentIntent[] {
  const text = `refused: ${stepName}: ${kind}\n${diagnostic}`.slice(0, 6000);
  return [
    {
      type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId,
      taskId: context.task?.PK || '', parentStepId: parentStep.stepId,
      step: {
        type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
        stepTitle: 'Review refused', result: text,
        planning: { planId: `${stepName}-refused`, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
      } as mls.msg.AIResultStep,
    },
    {
      type: 'update-status', messageId: context.message.orderAt, threadId: context.message.threadId,
      taskId: context.task?.PK || '', parentStepId: parentStep.stepId, stepId: step.stepId,
      hookSequential, status: 'completed', cleaner: 'input_output', traceMsg: `${stepName} ended as ${kind}: the review was refused (by command).`,
    },
  ];
}
