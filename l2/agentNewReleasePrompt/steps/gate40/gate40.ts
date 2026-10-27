/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/gate40/gate40.ts" enhancement="_blank" />

import { NRP_AGENT_NAME, NRP_CANDIDATE_REL, parseNrpInvocation } from '/_102035_/l2/agentNewReleasePrompt/helpers/invocation.js';
import { loadNrpArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/artifacts.js';
import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import {
  buildNrpRepairHumanPrompt,
  buildNrpRepairTool,
  checkNrpGates,
  classifyNrpGateIssues,
  nrpGateAction,
  NRP_REPAIR_SYSTEM_PROMPT,
  overlayNrpEdits,
  type NrpAppliedEdit,
  type NrpGateIssue,
} from '/_102035_/l2/agentNewReleasePrompt/helpers/releaseGate.js';
import { pipelineJsonFileForProject, setModuleRoot } from '/_102035_/l2/solution/fs.js';
import { unwrapNs4FlexibleWorkerPayload } from '/_102035_/l2/solution/helpers/ns4WorkerTools.js';
import {
  NrpEditRefusal,
  normalizeNrpEdit,
  nrpFileScope,
} from '/_102035_/l2/agentNewReleasePrompt/steps/edit30/edit30.js';
import {
  NRP_ARTIFACT_KINDS,
  type NrpArtifactKind,
  type NrpTriage,
  normalizeNrpTriage,
  recordNrpTriageRefusal,
} from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';
import { createWrite50Step } from '/_102035_/l2/agentNewReleasePrompt/steps/write50/write50.js';

export interface NrpGateCursor {
  moduleName: string;
  request: string;
  triage: NrpTriage;
  applied: NrpAppliedEdit[];
  repaired: NrpArtifactKind[];
  modelCalls: number;
}

export function createGate40Step(cursor: NrpGateCursor): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    nextSteps: [],
    status: 'waiting_human_input',
    agentName: NRP_AGENT_NAME,
    stepTitle: cursor.repaired.length ? `Repair ${cursor.repaired[cursor.repaired.length - 1]}` : 'Verify the edit',
    prompt: JSON.stringify({ moduleName: cursor.moduleName, request: cursor.request, nrpGate: cursor }),
    rags: [],
    planning: { planId: 'gate40', dependsOn: ['edit30-done'], executionMode: 'sequential', executionHost: 'client' },
  };
}

export async function beforeNrpGateStep(
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
    const cursor = readCursor(String(step.prompt || ''), project);
    setModuleRoot(cursor.moduleName, `${cursor.moduleName}/${NRP_CANDIDATE_REL}`);
    const baseArtifacts = await loadNrpArtifacts(cursor.moduleName);
    const merged = overlayNrpEdits(baseArtifacts, cursor.applied);
    const issues = gateIssues(baseArtifacts, merged);
    const decision = nrpGateAction(issues, cursor.triage.artifacts, cursor.repaired);
    if (decision.action === 'write') {
      return [
        {
          type: 'add-step', ...base, step: createWrite50Step({
            moduleName: cursor.moduleName,
            project,
            request: cursor.request,
            triage: cursor.triage,
            artifacts: merged,
            applied: cursor.applied,
            issues,
            allowWrite: true,
            modelCalls: cursor.modelCalls,
          }),
        },
        done(base, step, hookSequential, 'gate40 passed. write50 will record the version.'),
      ];
    }
    if (decision.action === 'stop' || !decision.kind) {
      return [
        {
          type: 'add-step', ...base, step: {
            type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
            stepTitle: 'Verification failed',
            result: JSON.stringify({ written: false, reason: 'Verification failed. Nothing was written.', issues }),
            planning: { planId: 'gate40-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
          } as mls.msg.AIResultStep,
        },
        done(base, step, hookSequential, 'gate40 failed again. Nothing was written.'),
      ];
    }
    const tool = buildNrpRepairTool();
    const scope = nrpFileScope(merged, decision.kind, cursor.triage);
    return [{
      type: 'prompt_ready',
      args: String(step.prompt || ''),
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: NRP_REPAIR_SYSTEM_PROMPT,
      humanPrompt: buildNrpRepairHumanPrompt(cursor.request, decision.kind, issues, scope.files),
      tools: [tool],
      toolChoice: { type: 'function', function: { name: tool.function.name } },
    }];
  } catch (error) {
    console.error('[agentNewReleasePrompt] gate40 failed', error);
    return [fail(context, parentStep, step, hookSequential, error)];
  }
}

export async function afterNrpGateStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (!step.interaction?.payload?.[0]) return [];
  const base = {
    messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId,
  };
  try {
    const project = mls.actualProject || 0;
    const cursor = readCursor(String(step.prompt || ''), project);
    setModuleRoot(cursor.moduleName, `${cursor.moduleName}/${NRP_CANDIDATE_REL}`);
    const baseArtifacts = await loadNrpArtifacts(cursor.moduleName);
    const merged = overlayNrpEdits(baseArtifacts, cursor.applied);
    const issues = gateIssues(baseArtifacts, merged);
    const decision = nrpGateAction(issues, cursor.triage.artifacts, cursor.repaired);
    if (decision.action !== 'repair' || !decision.kind) return [];
    const scope = nrpFileScope(merged, decision.kind, cursor.triage);
    const artifact = normalizeNrpEdit(decision.kind, unwrapNs4FlexibleWorkerPayload(step.interaction.payload[0]), scope);
    const next: NrpGateCursor = {
      ...cursor,
      applied: [...cursor.applied, { mode: 'model', kind: decision.kind, artifact }],
      repaired: [...cursor.repaired, decision.kind],
      modelCalls: cursor.modelCalls + 1,
    };
    return [
      { type: 'add-step', ...base, step: createGate40Step(next) },
      done(base, step, hookSequential, `gate40 repair returned ${decision.kind}.`),
    ];
  } catch (error) {
    console.error('[agentNewReleasePrompt] gate40 repair rejected', error);
    const cited = await citeRepairRefusal(step, error);
    return [fail(context, parentStep, step, hookSequential, cited)];
  }
}

async function citeRepairRefusal(step: mls.msg.AIAgentStep, error: unknown): Promise<unknown> {
  if (!(error instanceof NrpEditRefusal)) return error;
  try {
    const project = mls.actualProject || 0;
    const cursor = readCursor(String(step.prompt || ''), project);
    const info = pipelineJsonFileForProject(project, cursor.moduleName, 'newReleasePrompt-refused');
    const citation = await recordNrpTriageRefusal(info, error.message, error.raw);
    return new NrpEditRefusal(`${error.message} See ${citation}.`, error.raw);
  } catch (writeError) {
    console.error('[agentNewReleasePrompt] gate40 could not record the refused response', writeError);
    const writeMessage = writeError instanceof Error ? writeError.message : String(writeError);
    return new NrpEditRefusal(`${error.message} The refused response was not recorded: ${writeMessage}.`, error.raw);
  }
}

function gateIssues(base: NrpModuleArtifacts, merged: NrpModuleArtifacts): NrpGateIssue[] {
  const kinds = NRP_ARTIFACT_KINDS;
  return classifyNrpGateIssues(checkNrpGates(base, kinds), checkNrpGates(merged, kinds));
}

function readCursor(prompt: string, project: number): NrpGateCursor {
  const invocation = parseNrpInvocation(strip(prompt), project);
  let raw: unknown;
  try { raw = JSON.parse(prompt); }
  catch (error) {
    console.error('[agentNewReleasePrompt] gate prompt is not JSON', error);
    throw new Error('Gate step prompt must be JSON.');
  }
  const root = record(raw, 'Gate step prompt');
  const body = record(root.nrpGate, 'Gate cursor');
  const repaired = texts(body.repaired, 'repaired');
  const modelCalls = body.modelCalls;
  if (typeof modelCalls !== 'number' || modelCalls < 0) throw new Error('Gate modelCalls must be a number.');
  return {
    moduleName: invocation.moduleName,
    request: invocation.request,
    triage: normalizeNrpTriage(body.triage),
    applied: appliedOf(body.applied),
    repaired,
    modelCalls,
  };
}

function appliedOf(value: unknown): NrpAppliedEdit[] {
  if (!Array.isArray(value)) throw new Error('Gate applied must be an array.');
  return value.map(item => {
    const root = record(item, 'Applied edit');
    const mode = root.mode;
    if (mode !== 'apply' && mode !== 'model') throw new Error('Applied edit mode must be apply or model.');
    const kind = root.kind;
    if (kind !== null && (typeof kind !== 'string' || !NRP_ARTIFACT_KINDS.includes(kind as NrpArtifactKind))) {
      throw new Error('Applied edit kind must be an artifact kind or null.');
    }
    return { mode, kind: kind as NrpArtifactKind | null, artifact: root.artifact };
  });
}

function texts(value: unknown, label: string): NrpArtifactKind[] {
  if (!Array.isArray(value)) throw new Error(`Gate ${label} must be an array.`);
  return value.map(item => {
    if (typeof item !== 'string' || !NRP_ARTIFACT_KINDS.includes(item as NrpArtifactKind)) {
      throw new Error(`Gate ${label} has an unknown kind.`);
    }
    return item as NrpArtifactKind;
  });
}

function strip(value: string): string {
  let raw: unknown;
  try { raw = JSON.parse(value); }
  catch (error) {
    console.error('[agentNewReleasePrompt] gate prompt is not JSON', error);
    return value;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return value;
  const { nrpGate: _ignored, ...invocation } = raw as Record<string, unknown>;
  return JSON.stringify(invocation);
}

function done(
  base: { messageId: string; threadId: string; taskId: string; parentStepId: number },
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  traceMsg: string,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status', ...base, stepId: step.stepId, hookSequential,
    status: 'completed', cleaner: 'input_output', traceMsg,
  };
}

function fail(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  error: unknown,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status',
    messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, stepId: step.stepId,
    hookSequential, status: 'failed', cleaner: 'input_output',
    traceMsg: error instanceof Error ? error.message : String(error),
  };
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

export type { NrpGateIssue };
