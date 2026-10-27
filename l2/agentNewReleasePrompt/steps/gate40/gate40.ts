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
  nrpIndexOnlyRepairMessage,
  nrpIssueKey,
  nrpIssueLines,
  nrpIssueOwner,
  nrpKindCatalog,
  nrpRepairPromptFiles,
  nrpRepairRoundCounts,
  type NrpRepairRound,
  NRP_REPAIR_SYSTEM_PROMPT,
  overlayNrpEdits,
  type NrpAppliedEdit,
  type NrpGateIssue,
  type NrpRepairFile,
} from '/_102035_/l2/agentNewReleasePrompt/helpers/releaseGate.js';
import { applyNrpMechanical } from '/_102035_/l2/agentNewReleasePrompt/helpers/mechanical.js';
import { pipelineJsonFileForProject, setModuleRoot } from '/_102035_/l2/solution/fs.js';
import { unwrapNs4FlexibleWorkerPayload } from '/_102035_/l2/solution/helpers/ns4WorkerTools.js';
import {
  NrpEditRefusal,
  normalizeNrpEdit,
  nrpFileScope,
  nrpIndexFileGaps,
  nrpShapeReference,
  NRP_JOURNEY_SHAPE,
  NRP_ONTOLOGY_SHAPE,
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
  repaired: NrpRepairRound[];
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
    stepTitle: cursor.repaired.length ? `Repair ${cursor.repaired[cursor.repaired.length - 1].kind}` : 'Verify the edit',
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
            repairRounds: cursor.repaired,
          }),
        },
        done(base, step, hookSequential, `gate40 passed. write50 will record the version. Rounds: ${roundNote(cursor.repaired)}.`),
      ];
    }
    if (decision.action === 'stop' || !decision.kind) {
      const reason = decision.reason
        ? `${decision.reason} Nothing was written.`
        : 'Verification failed. Nothing was written.';
      return [
        {
          type: 'add-step', ...base, step: {
            type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
            stepTitle: 'Verification failed',
            result: JSON.stringify({
              written: false,
              reason,
              issues,
              repairRounds: nrpRepairRoundCounts(cursor.repaired),
            }),
            planning: { planId: 'gate40-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
          } as mls.msg.AIResultStep,
        },
        done(base, step, hookSequential, `${reason} Rounds: ${roundNote(cursor.repaired)}.`),
      ];
    }
    const tool = buildNrpRepairTool();
    const marks = applyNrpMechanical(baseArtifacts, cursor.triage.mechanical).textMarks;
    const scope = repairScope(merged, decision.kind, cursor.triage, marks, issues);
    const reference = scope.creates.length ? nrpShapeReference(merged, decision.kind) : null;
    const shape = reference
      ? { rule: decision.kind === 'journeys' ? NRP_JOURNEY_SHAPE : NRP_ONTOLOGY_SHAPE, file: reference }
      : null;
    return [{
      type: 'prompt_ready',
      args: String(step.prompt || ''),
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: NRP_REPAIR_SYSTEM_PROMPT,
      humanPrompt: buildNrpRepairHumanPrompt(
        cursor.request,
        decision.kind,
        issues,
        nrpKindCatalog(merged, decision.kind),
        nrpAllowed(scope),
        shape,
        earlierLines(cursor.repaired, decision.kind),
      ),
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
    const marks = applyNrpMechanical(baseArtifacts, cursor.triage.mechanical).textMarks;
    const scope = repairScope(merged, decision.kind, cursor.triage, marks, issues);
    const payload = unwrapNs4FlexibleWorkerPayload(step.interaction.payload[0]);
    const artifact = acceptNrpRepair(decision.kind, issues, scope, payload);
    const next: NrpGateCursor = {
      ...cursor,
      applied: [...cursor.applied, { mode: 'model', kind: decision.kind, artifact }],
      repaired: [...cursor.repaired, roundOf(decision.kind, issues)],
      modelCalls: cursor.modelCalls + 1,
    };
    const spent = next.repaired.filter(round => round.kind === decision.kind).length;
    return [
      { type: 'add-step', ...base, step: createGate40Step(next) },
      done(base, step, hookSequential, `gate40 repair round ${spent} of ${decision.kind}.`),
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

function repairScope(
  artifacts: NrpModuleArtifacts,
  kind: NrpArtifactKind,
  triage: NrpTriage,
  marks: ReturnType<typeof applyNrpMechanical>['textMarks'],
  issues: readonly NrpGateIssue[],
) {
  const scope = nrpFileScope(artifacts, kind, triage, marks);
  const extras = nrpRepairPromptFiles(kind, issues, nrpKindCatalog(artifacts, kind));
  const files = scope.files.slice();
  const present = scope.present.slice();
  for (const extra of extras) {
    if (files.some(file => file.id === extra.id)) continue;
    files.push(extra);
    present.push(extra.id);
  }
  return { ...scope, files, present };
}

function acceptNrpRepair(
  kind: NrpArtifactKind,
  issues: readonly NrpGateIssue[],
  scope: { present: string[]; creates: string[]; files: NrpRepairFile[] },
  payload: unknown,
): { files: NrpRepairFile[] } {
  const artifact = normalizeNrpEdit(kind, payload, scope);
  const indexOnly = nrpIndexOnlyRepairMessage(kind, issues, artifact.files);
  if (indexOnly) throw new NrpEditRefusal(indexOnly, payload);
  const gaps = nrpIndexFileGaps(kind, scope, artifact.files);
  if (gaps.messages.length) throw new NrpEditRefusal(gaps.messages.join('\n'), payload);
  return artifact;
}

function nrpAllowed(scope: { present: string[]; creates: string[] }): string[] {
  const ids = [...scope.present];
  for (const id of scope.creates) if (!ids.includes(id)) ids.push(id);
  return ids;
}

function roundOf(kind: NrpArtifactKind, issues: readonly NrpGateIssue[]): NrpRepairRound {
  const owned = issues.filter(issue => !issue.baseline && nrpIssueOwner(issue) === kind);
  return {
    kind,
    keys: owned.map(nrpIssueKey),
    lines: nrpIssueLines(issues, kind),
  };
}

function earlierLines(rounds: readonly NrpRepairRound[], kind: NrpArtifactKind): string[] {
  const prior = rounds.filter(round => round.kind === kind);
  return prior.length ? prior[prior.length - 1].lines : [];
}

function roundNote(rounds: readonly NrpRepairRound[]): string {
  const counts = nrpRepairRoundCounts(rounds);
  const text = Object.entries(counts).map(([kind, count]) => `${kind}=${count}`).join(', ');
  return text || 'none';
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
  const repaired = roundsOf(body.repaired);
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

function roundsOf(value: unknown): NrpRepairRound[] {
  if (!Array.isArray(value)) throw new Error('Gate repaired must be an array.');
  return value.map(item => {
    const root = record(item, 'Repair round');
    const kind = root.kind;
    if (typeof kind !== 'string' || !NRP_ARTIFACT_KINDS.includes(kind as NrpArtifactKind)) {
      throw new Error('Repair round has an unknown kind.');
    }
    return {
      kind: kind as NrpArtifactKind,
      keys: stringList(root.keys, 'Repair round keys'),
      lines: stringList(root.lines, 'Repair round lines'),
    };
  });
}

function stringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(`${label} must be a list of strings.`);
  }
  return value as string[];
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
