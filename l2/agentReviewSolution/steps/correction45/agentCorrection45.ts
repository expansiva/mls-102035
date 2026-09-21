/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/correction45/agentCorrection45.ts" enhancement="_blank" />

import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { parseReviewInvocation } from '/_102035_/l2/agentReviewSolution/helpers/invocation.js';
import { reviewSnapshotFromContext } from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';
import { reviewTaskStateFromContext } from '/_102035_/l2/agentReviewSolution/helpers/reviewTaskState.js';
import {
  CORRECTION45_PRIVATE_STATE_VERSION,
  MAX_CORRECTION45_PRIVATE_STATE_CHARS,
  correct45Directed,
  parseCorrection45PrivateState,
  type Correction45PrivateState,
} from '/_102035_/l2/agentReviewSolution/steps/correction45/correction45.js';
import {
  assertReconcileStateIntegrity,
  assertValidateStateForCorrection,
  createValidate40RetryStep,
  parseValidate40PrivateState,
  readPrivateReconcileResult,
  resolveValidate40Draft,
  validate40TerminalPlanId,
} from '/_102035_/l2/agentReviewSolution/steps/validate40/agentValidate40.js';

export async function beforeCorrection45Step(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const invocation = parseReviewInvocation(String(step.prompt || ''), mls.actualProject || 0);
    const frozen = reviewSnapshotFromContext(context);
    const taskState = await reviewTaskStateFromContext(context, frozen);
    const reconciled = readPrivateReconcileResult(context);
    assertReconcileStateIntegrity(reconciled, frozen, invocation, taskState);
    const attempt = correctionAttemptOf(step);
    const source = await resolveValidate40Draft(context, reconciled, attempt - 1);
    if (source.correctionState.correctionAttemptsUsed !== attempt - 1) {
      throw new Error('correction45 attempt does not continue the persisted request counter.');
    }
    const sourcePlanId = validate40TerminalPlanId(attempt - 1);
    const validation = readValidationResult(context, sourcePlanId);
    assertValidateStateForCorrection(validation, reconciled, source.draft, source.correctionState);
    const corrected = correct45Directed(source.base, source.draft, validation.validation, source.correctionState);
    const privateState: Correction45PrivateState = {
      schemaVersion: CORRECTION45_PRIVATE_STATE_VERSION,
      project: reconciled.project,
      moduleName: reconciled.moduleName,
      baseId: reconciled.baseId,
      changeId: reconciled.changeId,
      revisionId: reconciled.revisionId,
      requestRevision: reconciled.requestRevision,
      originalHashes: { ...reconciled.originalHashes },
      candidateHashes: { ...reconciled.candidateHashes },
      validationContextHash: reconciled.validationContextHash,
      sourceValidationPlanId: sourcePlanId,
      ...corrected,
    };
    const serialized = JSON.stringify(privateState);
    if (serialized.length > MAX_CORRECTION45_PRIVATE_STATE_CHARS) {
      throw new Error('correction45 result exceeds the private task-state size limit.');
    }
    parseCorrection45PrivateState(serialized);
    const correctedPlanId = `correction45-private-result-${attempt}`;
    const terminalPlanId = `correction45-private-terminal-${attempt - 1}`;
    const intents: mls.msg.AgentIntent[] = [addStep(context, parentStep, {
      type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
      stepTitle: corrected.attempted ? `Private directed correction ${attempt}/3` : 'Private correction diagnostic',
      result: serialized,
      planning: {
        planId: corrected.attempted ? correctedPlanId : terminalPlanId,
        dependsOn: [], executionMode: 'manual_later', executionHost: 'client',
      },
    } as mls.msg.AIResultStep)];
    if (corrected.attempted) {
      intents.push(addStep(context, parentStep, createValidate40RetryStep(String(step.prompt || ''), attempt)));
    }
    intents.push(status(
      context,
      parentStep,
      step,
      hookSequential,
      'completed',
      corrected.attempted
        ? `correction45 applied ${corrected.mutations.length} directed mutation(s); attempt ${attempt}/3 persisted.`
        : 'correction45 found no safe directed mutation; draft and correction counter preserved.',
    ));
    return intents;
  } catch (error) {
    return [status(context, parentStep, step, hookSequential, 'failed', errorMessage(error))];
  }
}

function correctionAttemptOf(step: mls.msg.AIAgentStep): number {
  const match = /^correction45-attempt-(\d+)$/u.exec(step.planning?.planId || '');
  const attempt = match ? Number(match[1]) : 0;
  if (!Number.isSafeInteger(attempt) || attempt < 1 || attempt > 3) throw new Error('Invalid correction45 step identity.');
  return attempt;
}

function readValidationResult(context: mls.msg.ExecutionContext, planId: string) {
  const matches = getAllSteps(context.task?.iaCompressed?.nextSteps).filter((item): item is mls.msg.AIResultStep =>
    item.type === 'result' && item.status === 'completed' && item.planning?.planId === planId);
  if (matches.length !== 1) throw new Error(`Expected exactly one completed ${planId} result.`);
  return parseValidate40PrivateState(matches[0].result);
}

function addStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIPayload,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, step,
  };
}

function status(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  statusValue: mls.msg.AIStepStatus,
  traceMsg: string,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, stepId: step.stepId,
    hookSequential, status: statusValue, cleaner: 'input_output', traceMsg,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
