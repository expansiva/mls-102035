/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.ts" enhancement="_blank" />

import { NRP_AGENT_NAME, NRP_CANDIDATE_REL, parseNrpInvocation } from '/_102035_/l2/agentNewReleasePrompt/helpers/invocation.js';
import { loadNrpArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/artifacts.js';
import { buildNrpIndex, type NrpCompactIndex } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import { displayPath, pipelineJsonFileForProject, setModuleRoot, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { createNs4FlexibleWorkerTool, unwrapNs4FlexibleWorkerPayload } from '/_102035_/l2/solution/helpers/ns4WorkerTools.js';
import { createEdit30Step, planNrpEditOrders } from '/_102035_/l2/agentNewReleasePrompt/steps/edit30/edit30.js';

export const NRP_TRIAGE_TOOL = 'submitNrpTriage' as const;
export const NRP_TRIAGE_CLARIFICATION_MAX = 1000;

const SECRET_KEY = /token|secret|password|authorization|api[-_]?key|credential/iu;
const triageNotes = new WeakMap<NrpTriage, string[]>();

export class NrpTriageRefusal extends Error {
  readonly raw: unknown;

  constructor(message: string, raw: unknown) {
    super(message);
    this.name = 'NrpTriageRefusal';
    this.raw = raw;
  }
}

export const NRP_ARTIFACT_KINDS = ['ontology', 'rules', 'journeys', 'access', 'workflows', 'integration'] as const;
export type NrpArtifactKind = typeof NRP_ARTIFACT_KINDS[number];

export const NRP_MECHANICAL_OPS = ['setOptional', 'setRequired', 'remove', 'setScalar'] as const;
export type NrpMechanicalOp = typeof NRP_MECHANICAL_OPS[number];

export interface NrpMechanicalMark {
  op: NrpMechanicalOp;
  targetId: string;
  fieldId: string;
  value: string;
}

/** Every field is required. A missing meaning is null or []. No single-value optional. */
export interface NrpTriage {
  valid: boolean;
  reason: string | null;
  clarification: string | null;
  artifacts: NrpArtifactKind[];
  targets: string[];
  intent: string | null;
  mechanical: NrpMechanicalMark[];
}

export const NRP_TRIAGE_SCHEMA: Record<string, unknown> = {
  $id: 'https://collab.codes/schemas/agentNewReleasePrompt/triage/2026-10-27-nrp-triage-v1',
  type: 'object',
  additionalProperties: false,
  required: ['valid', 'reason', 'clarification', 'artifacts', 'targets', 'intent', 'mechanical'],
  properties: {
    valid: { type: 'boolean' },
    reason: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
    clarification: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
    artifacts: { type: 'array', items: { type: 'string', enum: [...NRP_ARTIFACT_KINDS] } },
    targets: { type: 'array', items: { type: 'string', minLength: 1 } },
    intent: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
    mechanical: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['op', 'targetId', 'fieldId', 'value'],
        properties: {
          op: { type: 'string', enum: [...NRP_MECHANICAL_OPS] },
          targetId: { type: 'string', minLength: 1 },
          fieldId: { type: 'string' },
          value: { type: 'string' },
        },
      },
    },
  },
};

export const NRP_TRIAGE_SYSTEM_PROMPT = `<!-- modelType: reasoning -->
Decide whether one free-text request can change the L4 specification that is being edited.
The index you receive lists only that specification: entities and their fields, rules, journeys, access grants, workflows, and integration events.
You do not edit anything. You only classify the request.

Call submitNrpTriage. Every property is required.
- valid is true only when the request asks for a concrete change inside that specification.
- valid is false when the request is empty, too vague to name a change, or about anything outside the specification (presentation, layout, colors, buttons, infrastructure, deployment).
- reason explains an invalid request. Use null when the request is valid.
- clarification is one question for the user when the request contradicts an indexed rule or can mean two different specification changes. Otherwise null. A clarification means valid is false, artifacts is [], targets is [], intent is null, and mechanical is [].
- artifacts lists the kinds the change would touch. Use [] when the request stops here. Kinds: ontology, rules, journeys, access, workflows, integration.
- targets lists ids copied from the index. Use [] when there is no id to name. A new id is allowed only when the request explicitly asks to add it.
- intent is one sentence of the change to apply. Use null when the request stops here.
- mechanical lists changes the code can apply without a model: setOptional, setRequired, remove, or setScalar. Use [] when a model must write the artifact, or when the request stops here.
  Each mark has op, targetId, fieldId (empty string when the mark is not a field), and value (empty string when the op carries no new scalar).

Do not restate the index. Do not invent an example module.`;

export function buildNrpTriageHumanPrompt(request: string, index: NrpCompactIndex): string {
  return `Request:\n${request}\n\nIndex:\n${JSON.stringify(index)}`;
}

export function buildNrpTriageTool(): mls.msg.LLMTool {
  return createNs4FlexibleWorkerTool(
    NRP_TRIAGE_TOOL,
    'Classify one request against the L4 index. Do not edit artifacts.',
    NRP_TRIAGE_SCHEMA,
  );
}

export function nrpTriageNotes(triage: NrpTriage): string[] {
  return triageNotes.get(triage) || [];
}

export function normalizeNrpTriage(value: unknown): NrpTriage {
  try {
    const root = record(value);
    const valid = root.valid;
    if (typeof valid !== 'boolean') throw new Error('Triage valid must be a boolean.');
    const reason = nullableText(root.reason, 'reason');
    const clarification = nullableText(root.clarification, 'clarification');
    const intent = nullableText(root.intent, 'intent');
    const artifacts = kinds(root.artifacts);
    const targets = texts(root.targets, 'targets');
    const mechanical = marks(root.mechanical);
    const triage: NrpTriage = { valid, reason, clarification, artifacts, targets, intent, mechanical };
    const notes = settleShape(triage);
    if (notes.length) triageNotes.set(triage, notes);
    return triage;
  } catch (error) {
    if (error instanceof NrpTriageRefusal) throw error;
    throw new NrpTriageRefusal(error instanceof Error ? error.message : String(error), value);
  }
}

/** Last whole sentence that fits, otherwise the last word, otherwise a hard cut. */
export function clipNrpClarification(text: string): { text: string; clipped: boolean } {
  const trimmed = text.trim();
  if (trimmed.length <= NRP_TRIAGE_CLARIFICATION_MAX) return { text: trimmed, clipped: false };
  let end = -1;
  const limit = Math.min(trimmed.length, NRP_TRIAGE_CLARIFICATION_MAX);
  for (let index = 0; index < limit; index += 1) {
    const mark = trimmed[index];
    if ((mark === '.' || mark === '?' || mark === '!') && (index + 1 === trimmed.length || /\s/u.test(trimmed[index + 1]))) {
      end = index + 1;
    }
  }
  if (end > 0) return { text: trimmed.slice(0, end).trim(), clipped: true };
  const space = trimmed.lastIndexOf(' ', NRP_TRIAGE_CLARIFICATION_MAX);
  const cut = space > 0 ? space : NRP_TRIAGE_CLARIFICATION_MAX;
  return { text: trimmed.slice(0, cut).trim(), clipped: true };
}

export async function recordNrpTriageRefusal(
  info: Ns5FileInfo,
  reason: string,
  raw: unknown,
  writer: (file: Ns5FileInfo, value: unknown) => Promise<unknown> = writeJson,
): Promise<string> {
  const citation = displayPath(info);
  await writer(info, { reason, raw: redact(raw) });
  return citation;
}

export function createTriage20Step(prompt: string): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    nextSteps: [],
    status: 'waiting_human_input',
    agentName: NRP_AGENT_NAME,
    stepTitle: 'Triage the request',
    prompt,
    rags: [],
    planning: { planId: 'triage20', dependsOn: ['index10-done'], executionMode: 'sequential', executionHost: 'client' },
  };
}

export async function beforeNrpTriageStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const project = mls.actualProject || 0;
    const invocation = parseNrpInvocation(String(step.prompt || ''), project);
    setModuleRoot(invocation.moduleName, `${invocation.moduleName}/${NRP_CANDIDATE_REL}`);
    const index = buildNrpIndex(await loadNrpArtifacts(invocation.moduleName));
    const tool = buildNrpTriageTool();
    return [{
      type: 'prompt_ready',
      args: String(step.prompt || ''),
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: NRP_TRIAGE_SYSTEM_PROMPT,
      humanPrompt: buildNrpTriageHumanPrompt(invocation.request, index),
      tools: [tool],
      toolChoice: { type: 'function', function: { name: tool.function.name } },
    }];
  } catch (error) {
    console.error('[agentNewReleasePrompt] triage20 prompt failed', error);
    return [fail(context, parentStep, step, hookSequential, error)];
  }
}

export async function afterNrpTriageStep(
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
    const payload = unwrapNs4FlexibleWorkerPayload(step.interaction?.payload?.[0]);
    const triage = normalizeNrpTriage(payload);
    const stopped = !triage.valid;
    const intents: mls.msg.AgentIntent[] = [
      {
        type: 'add-step', ...base, step: {
          type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
          stepTitle: stopped ? 'Triage stopped' : 'Triage accepted',
          result: JSON.stringify({ triage, nextStep: stopped ? null : 'edit30', notes: nrpTriageNotes(triage) }),
          planning: { planId: 'triage20-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
        } as mls.msg.AIResultStep,
      },
    ];
    if (!stopped) {
      const project = mls.actualProject || 0;
      const invocation = parseNrpInvocation(String(step.prompt || ''), project);
      setModuleRoot(invocation.moduleName, `${invocation.moduleName}/${NRP_CANDIDATE_REL}`);
      const orders = planNrpEditOrders(await loadNrpArtifacts(invocation.moduleName), triage);
      const [first, ...rest] = orders;
      if (first) {
        intents.push({
          type: 'add-step', ...base, step: createEdit30Step(invocation.moduleName, invocation.request, {
            ...first,
            rest: rest.map(order => ({ mode: order.mode, kind: order.kind })),
            applied: [],
          }),
        });
      }
    }
    intents.push({
      type: 'update-status', ...base, stepId: step.stepId, hookSequential, status: 'completed',
      cleaner: 'input_output',
      traceMsg: stopped
        ? `triage20 stopped: ${triage.clarification || triage.reason || 'invalid request'}.`
        : `triage20: ${triage.artifacts.join(', ') || 'no artifacts'}.`,
    });
    return intents;
  } catch (error) {
    console.error('[agentNewReleasePrompt] triage20 result rejected', error);
    const cited = await citeRefusal(step, error);
    return [fail(context, parentStep, step, hookSequential, cited)];
  }
}

async function citeRefusal(step: mls.msg.AIAgentStep, error: unknown): Promise<unknown> {
  if (!(error instanceof NrpTriageRefusal)) return error;
  try {
    const project = mls.actualProject || 0;
    const invocation = parseNrpInvocation(String(step.prompt || ''), project);
    const info = pipelineJsonFileForProject(project, invocation.moduleName, 'newReleasePrompt-refused');
    const citation = await recordNrpTriageRefusal(info, error.message, error.raw);
    return new NrpTriageRefusal(`${error.message} See ${citation}.`, error.raw);
  } catch (writeError) {
    console.error('[agentNewReleasePrompt] triage20 could not record the refused response', writeError);
    const writeMessage = writeError instanceof Error ? writeError.message : String(writeError);
    return new NrpTriageRefusal(`${error.message} The refused response was not recorded: ${writeMessage}.`, error.raw);
  }
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

function settleShape(triage: NrpTriage): string[] {
  const notes: string[] = [];
  if (triage.clarification) {
    const clipped = clipNrpClarification(triage.clarification);
    triage.clarification = clipped.text;
    if (clipped.clipped) notes.push(`clarification exceeded ${NRP_TRIAGE_CLARIFICATION_MAX} characters and was cut to a whole sentence`);
    if (!triage.clarification) throw new Error('A clarification needs a question.');
    if (hasChangeFields(triage) || triage.valid || triage.reason) notes.push('Discarded fields.');
    triage.valid = false;
    triage.reason = null;
    clearChanges(triage);
    return notes;
  }
  if (!triage.valid) {
    if (!triage.reason) throw new Error('An invalid request needs a reason.');
    if (hasChangeFields(triage)) notes.push('Discarded fields.');
    clearChanges(triage);
    return notes;
  }
  if (triage.reason || !triage.intent || !triage.artifacts.length) {
    throw new Error('A valid request needs an intent, at least one artifact, and a null reason.');
  }
  return notes;
}

function hasChangeFields(triage: NrpTriage): boolean {
  return !!(triage.intent || triage.artifacts.length || triage.targets.length || triage.mechanical.length);
}

function clearChanges(triage: NrpTriage): void {
  triage.intent = null;
  triage.artifacts = [];
  triage.targets = [];
  triage.mechanical = [];
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return null;
  if (Array.isArray(value)) return value.slice(0, 64).map(item => redact(item, depth + 1));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SECRET_KEY.test(key) ? '[redacted]' : redact(item, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 20_000) return `${value.slice(0, 20_000)}…`;
  return value;
}

function kinds(value: unknown): NrpArtifactKind[] {
  if (!Array.isArray(value)) throw new Error('Triage artifacts must be an array.');
  return value.map(item => {
    if (typeof item !== 'string' || !NRP_ARTIFACT_KINDS.includes(item as NrpArtifactKind)) {
      throw new Error(`Unknown artifact kind: ${String(item)}.`);
    }
    return item as NrpArtifactKind;
  });
}

function texts(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`Triage ${label} must be an array.`);
  return value.map(item => {
    if (typeof item !== 'string' || !item.trim()) throw new Error(`Triage ${label} entries must be non-empty text.`);
    return item;
  });
}

function marks(value: unknown): NrpMechanicalMark[] {
  if (!Array.isArray(value)) throw new Error('Triage mechanical must be an array.');
  return value.map(item => {
    const row = record(item);
    const op = row.op;
    if (typeof op !== 'string' || !NRP_MECHANICAL_OPS.includes(op as NrpMechanicalOp)) {
      throw new Error(`Unknown mechanical op: ${String(op)}.`);
    }
    const targetId = row.targetId;
    if (typeof targetId !== 'string' || !targetId.trim()) throw new Error('A mechanical mark needs a targetId.');
    if (typeof row.fieldId !== 'string' || typeof row.value !== 'string') {
      throw new Error('A mechanical mark needs fieldId and value strings.');
    }
    return { op: op as NrpMechanicalOp, targetId, fieldId: row.fieldId, value: row.value };
  });
}

function nullableText(value: unknown, label: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Triage ${label} must be text or null.`);
  return value.trim();
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Triage payload must be an object.');
  return value as Record<string, unknown>;
}
