/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/edit30/edit30.ts" enhancement="_blank" />

import { NRP_AGENT_NAME, NRP_CANDIDATE_REL, parseNrpInvocation } from '/_102035_/l2/agentNewReleasePrompt/helpers/invocation.js';
import { loadNrpArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/artifacts.js';
import { applyNrpMechanical, nrpModelKinds } from '/_102035_/l2/agentNewReleasePrompt/helpers/mechanical.js';
import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import { setModuleRoot } from '/_102035_/l2/solution/fs.js';
import { createNs4FlexibleWorkerTool, unwrapNs4FlexibleWorkerPayload } from '/_102035_/l2/solution/helpers/ns4WorkerTools.js';
import {
  NRP_ARTIFACT_KINDS,
  type NrpArtifactKind,
  type NrpTriage,
  normalizeNrpTriage,
} from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';

export const NRP_EDIT_TOOL = 'submitNrpEdit' as const;

export interface NrpEditOrder {
  mode: 'apply' | 'model';
  kind: NrpArtifactKind | null;
  triage: NrpTriage;
}

export const NRP_EDIT_SCHEMA: Record<string, unknown> = {
  $id: 'https://collab.codes/schemas/agentNewReleasePrompt/edit/2026-10-27-nrp-edit-v1',
  type: 'object',
  additionalProperties: false,
  required: ['artifactJson'],
  properties: {
    artifactJson: { type: 'string', minLength: 2 },
  },
};

export const NRP_EDIT_SYSTEM_PROMPT = `Edit one L4 artifact kind for the request.
You receive that kind only, the intent, and the target ids.
Call submitNrpEdit. artifactJson is the whole artifact after the change, as one JSON object serialized to text.
Change only what the request requires. Keep every other value.
Do not invent an example module.`;

export function buildNrpEditHumanPrompt(
  request: string,
  triage: NrpTriage,
  kind: NrpArtifactKind,
  artifact: unknown,
): string {
  return [
    `Kind: ${kind}`,
    `Intent: ${triage.intent || ''}`,
    `Targets: ${JSON.stringify(triage.targets)}`,
    `Request:\n${request}`,
    `Artifact:\n${JSON.stringify(artifact)}`,
  ].join('\n\n');
}

export function buildNrpEditTool(): mls.msg.LLMTool {
  return createNs4FlexibleWorkerTool(
    NRP_EDIT_TOOL,
    'Return the edited artifact as JSON text. One kind only.',
    NRP_EDIT_SCHEMA,
  );
}

export function artifactSlice(artifacts: NrpModuleArtifacts, kind: NrpArtifactKind): unknown {
  if (kind === 'ontology') return { ontologyIndex: artifacts.ontologyIndex, entities: artifacts.entities };
  if (kind === 'rules') return artifacts.rules;
  if (kind === 'journeys') return { journeyIndex: artifacts.journeyIndex, journeys: artifacts.journeys };
  if (kind === 'access') return artifacts.access;
  if (kind === 'workflows') return artifacts.workflows;
  return artifacts.integration;
}

export function normalizeNrpEdit(kind: NrpArtifactKind, value: unknown): unknown {
  const root = record(value, 'Edit payload');
  const raw = root.artifactJson;
  if (typeof raw !== 'string' || raw.trim().length < 2) throw new Error('Edit artifactJson must be JSON text.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error('[agentNewReleasePrompt] edit artifactJson is not JSON', error);
    throw new Error('Edit artifactJson must be JSON text.');
  }
  assertKind(kind, parsed);
  return parsed;
}

export function encodeNrpEditPrompt(moduleName: string, request: string, order: NrpEditOrder): string {
  return JSON.stringify({ moduleName, request, nrpEdit: order });
}

export function parseNrpEditPrompt(value: string, project: number): { moduleName: string; request: string; order: NrpEditOrder } {
  const invocation = parseNrpInvocation(stripEdit(value), project);
  let raw: unknown;
  try { raw = JSON.parse(value); }
  catch (error) {
    console.error('[agentNewReleasePrompt] edit prompt is not JSON', error);
    throw new Error('Edit step prompt must be JSON.');
  }
  const root = record(raw, 'Edit step prompt');
  const order = readOrder(root.nrpEdit);
  return { moduleName: invocation.moduleName, request: invocation.request, order };
}

export function createEdit30Step(moduleName: string, request: string, order: NrpEditOrder): mls.msg.AIAgentStep {
  const title = order.mode === 'apply' ? 'Apply mechanical edits' : `Edit ${order.kind}`;
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    nextSteps: [],
    status: 'waiting_human_input',
    agentName: NRP_AGENT_NAME,
    stepTitle: title,
    prompt: encodeNrpEditPrompt(moduleName, request, order),
    rags: [],
    planning: { planId: 'edit30', dependsOn: ['triage20-done'], executionMode: 'sequential', executionHost: 'client' },
  };
}

export function planNrpEditOrders(artifacts: NrpModuleArtifacts, triage: NrpTriage): NrpEditOrder[] {
  const orders: NrpEditOrder[] = [];
  if (triage.mechanical.length) orders.push({ mode: 'apply', kind: null, triage });
  for (const kind of nrpModelKinds(artifacts, triage.mechanical, triage.artifacts)) {
    orders.push({ mode: 'model', kind, triage });
  }
  return orders;
}

export async function beforeNrpEditStep(
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
    const parsed = parseNrpEditPrompt(String(step.prompt || ''), project);
    setModuleRoot(parsed.moduleName, `${parsed.moduleName}/${NRP_CANDIDATE_REL}`);
    const edited = applyNrpMechanical(await loadNrpArtifacts(parsed.moduleName), parsed.order.triage.mechanical);
    if (parsed.order.mode === 'apply') {
      return [
        {
          type: 'add-step', ...base, step: {
            type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
            stepTitle: 'Mechanical edits applied',
            result: JSON.stringify({
              mode: 'apply',
              mechanical: parsed.order.triage.mechanical,
              artifacts: edited,
              nextStep: 'gate40',
            }),
            planning: { planId: 'edit30-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
          } as mls.msg.AIResultStep,
        },
        {
          type: 'update-status', ...base, stepId: step.stepId, hookSequential, status: 'completed',
          cleaner: 'input_output',
          traceMsg: `edit30 applied ${parsed.order.triage.mechanical.length} mechanical marks.`,
        },
      ];
    }
    const kind = parsed.order.kind;
    if (!kind) throw new Error('A model edit needs an artifact kind.');
    const tool = buildNrpEditTool();
    return [{
      type: 'prompt_ready',
      args: String(step.prompt || ''),
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: NRP_EDIT_SYSTEM_PROMPT,
      humanPrompt: buildNrpEditHumanPrompt(parsed.request, parsed.order.triage, kind, artifactSlice(edited, kind)),
      tools: [tool],
      toolChoice: { type: 'function', function: { name: tool.function.name } },
    }];
  } catch (error) {
    console.error('[agentNewReleasePrompt] edit30 prompt failed', error);
    return [fail(context, parentStep, step, hookSequential, error)];
  }
}

export async function afterNrpEditStep(
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
    const parsed = parseNrpEditPrompt(String(step.prompt || ''), project);
    if (parsed.order.mode !== 'model' || !parsed.order.kind) throw new Error('A model edit needs an artifact kind.');
    const payload = unwrapNs4FlexibleWorkerPayload(step.interaction.payload[0]);
    const artifact = normalizeNrpEdit(parsed.order.kind, payload);
    return [
      {
        type: 'add-step', ...base, step: {
          type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
          stepTitle: `Edited ${parsed.order.kind}`,
          result: JSON.stringify({ mode: 'model', kind: parsed.order.kind, artifact, nextStep: 'gate40' }),
          planning: { planId: 'edit30-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
        } as mls.msg.AIResultStep,
      },
      {
        type: 'update-status', ...base, stepId: step.stepId, hookSequential, status: 'completed',
        cleaner: 'input_output',
        traceMsg: `edit30 model returned ${parsed.order.kind}.`,
      },
    ];
  } catch (error) {
    console.error('[agentNewReleasePrompt] edit30 result rejected', error);
    return [fail(context, parentStep, step, hookSequential, error)];
  }
}

function stripEdit(value: string): string {
  let raw: unknown;
  try { raw = JSON.parse(value); }
  catch {
    return value;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return value;
  const { nrpEdit: _ignored, ...invocation } = raw as Record<string, unknown>;
  return JSON.stringify(invocation);
}

function readOrder(value: unknown): NrpEditOrder {
  const root = record(value, 'Edit order');
  const mode = root.mode;
  if (mode !== 'apply' && mode !== 'model') throw new Error('Edit mode must be apply or model.');
  const kind = root.kind;
  if (kind !== null && (typeof kind !== 'string' || !NRP_ARTIFACT_KINDS.includes(kind as NrpArtifactKind))) {
    throw new Error('Edit kind must be an artifact kind or null.');
  }
  const triage = normalizeNrpTriage(root.triage);
  if (mode === 'model' && !kind) throw new Error('A model edit needs an artifact kind.');
  if (mode === 'apply' && kind) throw new Error('A mechanical edit has no artifact kind.');
  return { mode, kind: kind as NrpArtifactKind | null, triage };
}

function assertKind(kind: NrpArtifactKind, value: unknown): void {
  const root = record(value, 'Edited artifact');
  const ok = kind === 'ontology'
    ? Array.isArray(root.entities)
    : kind === 'rules'
      ? 'rules' in root
      : kind === 'journeys'
        ? Array.isArray(root.journeys)
        : kind === 'access'
          ? Array.isArray(root.grants)
          : kind === 'workflows'
            ? Array.isArray(root.processes)
            : Array.isArray(root.inbound) && Array.isArray(root.outbound);
  if (!ok) throw new Error(`Edited ${kind} artifact has the wrong shape.`);
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
