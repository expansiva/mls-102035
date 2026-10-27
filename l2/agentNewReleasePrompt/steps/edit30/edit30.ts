/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/edit30/edit30.ts" enhancement="_blank" />

import { NRP_AGENT_NAME, NRP_CANDIDATE_REL, parseNrpInvocation } from '/_102035_/l2/agentNewReleasePrompt/helpers/invocation.js';
import { loadNrpArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/artifacts.js';
import { applyNrpMechanical, nrpModelKinds, type NrpTextMark } from '/_102035_/l2/agentNewReleasePrompt/helpers/mechanical.js';
import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import type { NrpAppliedEdit } from '/_102035_/l2/agentNewReleasePrompt/helpers/releaseGate.js';
import { pipelineJsonFileForProject, setModuleRoot } from '/_102035_/l2/solution/fs.js';
import { createNs4FlexibleWorkerTool, unwrapNs4FlexibleWorkerPayload } from '/_102035_/l2/solution/helpers/ns4WorkerTools.js';
import {
  NRP_ARTIFACT_KINDS,
  type NrpArtifactKind,
  type NrpTriage,
  normalizeNrpTriage,
  recordNrpTriageRefusal,
} from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';

export const NRP_EDIT_TOOL = 'submitNrpEdit' as const;

export interface NrpEditOrder {
  mode: 'apply' | 'model';
  kind: NrpArtifactKind | null;
  triage: NrpTriage;
}

export interface NrpEditFollow {
  mode: 'apply' | 'model';
  kind: NrpArtifactKind | null;
}

export interface NrpEditCursor extends NrpEditOrder {
  rest: NrpEditFollow[];
  applied: NrpAppliedEdit[];
}

export const NRP_EDIT_SCHEMA: Record<string, unknown> = {
  $id: 'https://collab.codes/schemas/agentNewReleasePrompt/edit/2026-10-27-nrp-edit-files-v1',
  type: 'object',
  additionalProperties: false,
  required: ['files'],
  properties: {
    files: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'artifactJson'],
        properties: {
          id: { type: 'string', minLength: 1 },
          artifactJson: { type: 'string', minLength: 2 },
        },
      },
    },
  },
};

export const NRP_EDIT_SYSTEM_PROMPT = `<!-- modelType: reasoning -->
Edit the L4 files named in the message. You receive only those files, the intent, and the target ids.
Call submitNrpEdit. Return only the files you changed or created.
files is a list of {id, artifactJson}. artifactJson is that one file as JSON text.
id is the entity id or the journey id, index for that kind's index, or the kind name for a single file: rules, access, workflows, integration.
A new id is allowed only when the message lists it under Creates.
Change only what the request requires. Keep every other value.
When the message lists marked texts, rewrite only those texts so they no longer cite the named item.
Do not invent an example module.`;

export interface NrpEditFile {
  id: string;
  artifact: unknown;
}

export interface NrpFileScope {
  present: string[];
  creates: string[];
  files: NrpEditFile[];
}

export function buildNrpEditHumanPrompt(
  request: string,
  triage: NrpTriage,
  kind: NrpArtifactKind,
  files: readonly NrpEditFile[],
  textMarks: readonly NrpTextMark[] = [],
  creates: readonly string[] = [],
): string {
  const marked = textMarks.filter(mark => mark.kind === kind);
  const lines = [
    `Kind: ${kind}`,
    `Intent: ${triage.intent || ''}`,
    `Targets: ${JSON.stringify(triage.targets)}`,
    `Creates: ${JSON.stringify(creates)}`,
    `Request:\n${request}`,
  ];
  if (marked.length) {
    lines.push(`Marked texts:\n${marked.map(mark => `${mark.path} — adjust the text so it does not cite ${mark.item}: ${JSON.stringify(mark.text)}`).join('\n')}`);
  }
  lines.push(`Files:\n${files.map(file => `${file.id}\n${JSON.stringify(file.artifact)}`).join('\n')}`);
  return lines.join('\n\n');
}

export function buildNrpEditTool(): mls.msg.LLMTool {
  return createNs4FlexibleWorkerTool(
    NRP_EDIT_TOOL,
    'Return the edited artifact as JSON text. One kind only.',
    NRP_EDIT_SCHEMA,
  );
}

const SINGLE_FILE: Partial<Record<NrpArtifactKind, true>> = {
  rules: true, access: true, workflows: true, integration: true,
};

export class NrpEditRefusal extends Error {
  readonly raw: unknown;

  constructor(message: string, raw: unknown) {
    super(message);
    this.name = 'NrpEditRefusal';
    this.raw = raw;
  }
}

/** Files the model may see: owners of the target ids, plus the kind index when a file is created or removed. */
export function nrpFileScope(artifacts: NrpModuleArtifacts, kind: NrpArtifactKind, triage: NrpTriage): NrpFileScope {
  if (SINGLE_FILE[kind]) {
    const id = kind;
    return { present: [id], creates: [], files: [{ id, artifact: artifactSlice(artifacts, kind) }] };
  }
  if (kind === 'ontology') return ontologyScope(artifacts, triage);
  return journeyScope(artifacts, triage);
}

export function normalizeNrpEdit(kind: NrpArtifactKind, value: unknown, scope: NrpFileScope): { files: NrpEditFile[] } {
  try {
    const root = record(value, 'Edit payload');
    if (!Array.isArray(root.files)) throw new Error('Edit payload must list files.');
    const allowed = new Set([...scope.present, ...scope.creates]);
    const files = root.files.map(item => {
      const row = record(item, 'Edit file');
      const id = row.id;
      if (typeof id !== 'string' || !id.trim()) throw new Error('Edit file id must be text.');
      if (!allowed.has(id)) throw new Error(`Edit file ${id} is not a target and was not created by triage.`);
      const raw = row.artifactJson;
      if (typeof raw !== 'string' || raw.trim().length < 2) throw new Error('Edit artifactJson must be JSON text.');
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        console.error('[agentNewReleasePrompt] edit artifactJson is not JSON', error);
        throw new Error('Edit artifactJson must be JSON text.');
      }
      assertFile(kind, id, parsed);
      return { id, artifact: parsed };
    });
    return { files };
  } catch (error) {
    if (error instanceof NrpEditRefusal) throw error;
    throw new NrpEditRefusal(error instanceof Error ? error.message : String(error), value);
  }
}

function artifactSlice(artifacts: NrpModuleArtifacts, kind: NrpArtifactKind): unknown {
  if (kind === 'rules') return artifacts.rules;
  if (kind === 'access') return artifacts.access;
  if (kind === 'workflows') return artifacts.workflows;
  return artifacts.integration;
}

function ontologyScope(artifacts: NrpModuleArtifacts, triage: NrpTriage): NrpFileScope {
  const known = ontologyIds(artifacts);
  const selected = artifacts.entities.filter(entity =>
    triage.targets.includes(entity.entityId) || ownsAny(entity, triage.targets),
  );
  const creates = triage.targets.filter(id => !known.has(id));
  const removesFile = triage.mechanical.some(mark =>
    mark.op === 'remove' && artifacts.entities.some(entity => entity.entityId === mark.targetId),
  );
  const files: NrpEditFile[] = selected.map(entity => ({ id: entity.entityId, artifact: entity }));
  if (creates.length || removesFile || !files.length) {
    files.push({ id: 'index', artifact: artifacts.ontologyIndex });
  }
  const present = files.map(file => file.id);
  return { present, creates, files };
}

function journeyScope(artifacts: NrpModuleArtifacts, triage: NrpTriage): NrpFileScope {
  const known = new Set<string>();
  for (const journey of artifacts.journeys) {
    known.add(journey.journeyId);
    for (const step of journey.business?.steps || []) known.add(step.stepId);
  }
  for (const entry of artifacts.journeyIndex.journeys || []) known.add(entry.journeyId);
  const selected = artifacts.journeys.filter(journey =>
    triage.targets.includes(journey.journeyId)
    || (journey.business?.steps || []).some(step => triage.targets.includes(step.stepId)),
  );
  const creates = triage.targets.filter(id => !known.has(id));
  const removesFile = triage.mechanical.some(mark =>
    mark.op === 'remove' && artifacts.journeys.some(journey => journey.journeyId === mark.targetId),
  );
  const files: NrpEditFile[] = selected.map(journey => ({ id: journey.journeyId, artifact: journey }));
  if (creates.length || removesFile || !files.length) {
    files.push({ id: 'index', artifact: artifacts.journeyIndex });
  }
  return { present: files.map(file => file.id), creates, files };
}

function ontologyIds(artifacts: NrpModuleArtifacts): Set<string> {
  const ids = new Set<string>();
  for (const entity of artifacts.entities) {
    ids.add(entity.entityId);
    collectIds(entity, ids);
  }
  collectIds(artifacts.ontologyIndex, ids);
  return ids;
}

function ownsAny(entity: NrpModuleArtifacts['entities'][number], targets: readonly string[]): boolean {
  if (!targets.length) return false;
  const ids = new Set<string>();
  collectIds(entity, ids);
  return targets.some(id => ids.has(id));
}

function collectIds(value: unknown, ids: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectIds(item, ids);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const row = value as Record<string, unknown>;
  for (const key of ['entityId', 'fieldId', 'transitionId', 'relationshipId', 'journeyId', 'stepId']) {
    if (typeof row[key] === 'string') ids.add(row[key]);
  }
  const record = row.record;
  if (record && typeof record === 'object' && !Array.isArray(record)) {
    const fields = (record as Record<string, unknown>).fields;
    if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
      for (const [id, field] of Object.entries(fields as Record<string, unknown>)) {
        if (id !== 'details') ids.add(id);
        else if (field && typeof field === 'object' && !Array.isArray(field)) {
          const nested = (field as Record<string, unknown>).fields;
          if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
            for (const child of Object.keys(nested as Record<string, unknown>)) ids.add(`details.${child}`);
          }
        }
      }
    }
  }
  for (const child of Object.values(row)) collectIds(child, ids);
}

export function encodeNrpEditPrompt(moduleName: string, request: string, order: NrpEditCursor): string {
  return JSON.stringify({ moduleName, request, nrpEdit: order });
}

export function parseNrpEditPrompt(value: string, project: number): { moduleName: string; request: string; order: NrpEditCursor } {
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

export function createEdit30Step(moduleName: string, request: string, order: NrpEditCursor): mls.msg.AIAgentStep {
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
      const applied: NrpAppliedEdit[] = [...parsed.order.applied, { mode: 'apply', kind: null, artifact: edited.artifacts }];
      return [
        {
          type: 'add-step', ...base, step: {
            type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
            stepTitle: 'Mechanical edits applied',
            result: JSON.stringify({
              mode: 'apply',
              mechanical: parsed.order.triage.mechanical,
              textMarks: edited.textMarks,
              artifacts: edited.artifacts,
              nextStep: 'gate40',
            }),
            planning: { planId: 'edit30-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
          } as mls.msg.AIResultStep,
        },
        { type: 'add-step', ...base, step: nextAfterEdit(parsed.moduleName, parsed.request, parsed.order.triage, applied, parsed.order.rest) },
        {
          type: 'update-status', ...base, stepId: step.stepId, hookSequential, status: 'completed',
          cleaner: 'input_output',
          traceMsg: `edit30 applied ${parsed.order.triage.mechanical.length} mechanical marks.`,
        },
      ];
    }
    const kind = parsed.order.kind;
    if (!kind) throw new Error('A model edit needs an artifact kind.');
    const scope = nrpFileScope(edited.artifacts, kind, parsed.order.triage);
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
      humanPrompt: buildNrpEditHumanPrompt(parsed.request, parsed.order.triage, kind, scope.files, edited.textMarks, scope.creates),
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
    setModuleRoot(parsed.moduleName, `${parsed.moduleName}/${NRP_CANDIDATE_REL}`);
    const loaded = applyNrpMechanical(await loadNrpArtifacts(parsed.moduleName), parsed.order.triage.mechanical);
    const scope = nrpFileScope(loaded.artifacts, parsed.order.kind, parsed.order.triage);
    const artifact = normalizeNrpEdit(parsed.order.kind, payload, scope);
    const applied: NrpAppliedEdit[] = [
      ...parsed.order.applied,
      { mode: 'model', kind: parsed.order.kind, artifact },
    ];
    return [
      {
        type: 'add-step', ...base, step: {
          type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
          stepTitle: `Edited ${parsed.order.kind}`,
          result: JSON.stringify({ mode: 'model', kind: parsed.order.kind, artifact, nextStep: 'gate40' }),
          planning: { planId: 'edit30-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
        } as mls.msg.AIResultStep,
      },
      { type: 'add-step', ...base, step: nextAfterEdit(parsed.moduleName, parsed.request, parsed.order.triage, applied, parsed.order.rest) },
      {
        type: 'update-status', ...base, stepId: step.stepId, hookSequential, status: 'completed',
        cleaner: 'input_output',
        traceMsg: `edit30 model returned ${parsed.order.kind}.`,
      },
    ];
  } catch (error) {
    console.error('[agentNewReleasePrompt] edit30 result rejected', error);
    const cited = await citeEditRefusal(step, error);
    return [fail(context, parentStep, step, hookSequential, cited)];
  }
}

async function citeEditRefusal(step: mls.msg.AIAgentStep, error: unknown): Promise<unknown> {
  if (!(error instanceof NrpEditRefusal)) return error;
  try {
    const project = mls.actualProject || 0;
    const parsed = parseNrpEditPrompt(String(step.prompt || ''), project);
    const info = pipelineJsonFileForProject(project, parsed.moduleName, 'newReleasePrompt-refused');
    const citation = await recordNrpTriageRefusal(info, error.message, error.raw);
    return new NrpEditRefusal(`${error.message} See ${citation}.`, error.raw);
  } catch (writeError) {
    console.error('[agentNewReleasePrompt] edit30 could not record the refused response', writeError);
    const writeMessage = writeError instanceof Error ? writeError.message : String(writeError);
    return new NrpEditRefusal(`${error.message} The refused response was not recorded: ${writeMessage}.`, error.raw);
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

function readOrder(value: unknown): NrpEditCursor {
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
  return {
    mode,
    kind: kind as NrpArtifactKind | null,
    triage,
    rest: follows(root.rest),
    applied: appliedEdits(root.applied),
  };
}

function follows(value: unknown): NrpEditFollow[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('Edit rest must be an array.');
  return value.map(item => {
    const root = record(item, 'Edit rest');
    const mode = root.mode;
    if (mode !== 'apply' && mode !== 'model') throw new Error('Edit rest mode must be apply or model.');
    const kind = root.kind;
    if (kind !== null && (typeof kind !== 'string' || !NRP_ARTIFACT_KINDS.includes(kind as NrpArtifactKind))) {
      throw new Error('Edit rest kind must be an artifact kind or null.');
    }
    return { mode, kind: kind as NrpArtifactKind | null };
  });
}

function appliedEdits(value: unknown): NrpAppliedEdit[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('Edit applied must be an array.');
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

function nextAfterEdit(
  moduleName: string,
  request: string,
  triage: NrpTriage,
  applied: NrpAppliedEdit[],
  rest: NrpEditFollow[],
): mls.msg.AIAgentStep {
  const [head, ...tail] = rest;
  if (head) {
    return createEdit30Step(moduleName, request, { mode: head.mode, kind: head.kind, triage, rest: tail, applied });
  }
  const modelCalls = 1 + applied.filter(edit => edit.mode === 'model').length;
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    nextSteps: [],
    status: 'waiting_human_input',
    agentName: NRP_AGENT_NAME,
    stepTitle: 'Verify the edit',
    prompt: JSON.stringify({
      moduleName,
      request,
      nrpGate: { moduleName, request, triage, applied, repaired: [], modelCalls },
    }),
    rags: [],
    planning: { planId: 'gate40', dependsOn: ['edit30-done'], executionMode: 'sequential', executionHost: 'client' },
  };
}

function assertFile(kind: NrpArtifactKind, id: string, value: unknown): void {
  const root = record(value, 'Edited file');
  if (kind === 'rules' && id === 'rules' && 'rules' in root) return;
  if (kind === 'access' && id === 'access' && Array.isArray(root.grants)) return;
  if (kind === 'workflows' && id === 'workflows' && Array.isArray(root.processes)) return;
  if (kind === 'integration' && id === 'integration' && Array.isArray(root.inbound) && Array.isArray(root.outbound)) return;
  if (kind === 'ontology' && id === 'index' && (Array.isArray(root.entities) || typeof root.schemaVersion === 'string')) return;
  if (kind === 'journeys' && id === 'index' && Array.isArray(root.journeys)) return;
  if ((kind === 'ontology' || kind === 'journeys') && id !== 'index') {
    const named = kind === 'ontology' ? root.entityId : root.journeyId;
    if (named === id) return;
  }
  throw new Error(`Edited ${kind} file ${id} has the wrong shape.`);
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
