/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/edit30/edit30.ts" enhancement="_blank" />

import { NRP_AGENT_NAME, NRP_CANDIDATE_REL, parseNrpInvocation } from '/_102035_/l2/agentNewReleasePrompt/helpers/invocation.js';
import { loadNrpArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/artifacts.js';
import { applyNrpMechanical, nrpFreeTextHits, nrpModelKinds, type NrpTextMark } from '/_102035_/l2/agentNewReleasePrompt/helpers/mechanical.js';
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
  attempts?: number;
  editErrors?: string[];
  pendingCreates?: string[];
}

export const NRP_JOURNEY_SHAPE = 'The new file has the same shape as the sibling (schemaVersion, journeyId, business with actorRef, title, goal, entry, steps and outcome).';
export const NRP_ONTOLOGY_SHAPE = 'The new file has the same shape as the sibling (schemaVersion, moduleName, entityId, and the same sections the sibling uses).';
/** Step kinds the journey gate accepts, and the twin rule it enforces. The gate constant is not exported. */
export const NRP_JOURNEY_RULES = 'A journey step kind is locate, inspect, act, decide, or handoff. A new journey cannot share the same actor and the same set of operations (kind plus entity) as another journey. To tell them apart, change the actor, the entity, or the operations (for example, replace locate plus act with one act step that has an effect). Do not invent a step kind.';
/** Shown with the signatures the code already measured for the actor. */
export const NRP_NEW_SIGNATURE_RULE = 'a jornada nova precisa de uma assinatura que não esteja na lista';

export const NRP_EDIT_OPS = ['set', 'add', 'remove', 'create'] as const;
export type NrpEditOp = typeof NRP_EDIT_OPS[number];

export const NRP_EDIT_OP_LIMIT = 40;
export const NRP_EDIT_JSON_LIMIT = 6000;
export const NRP_EDIT_REASON_LIMIT = 300;

export const NRP_EDIT_SCHEMA: Record<string, unknown> = {
  $id: 'https://collab.codes/schemas/agentNewReleasePrompt/edit/2026-10-27-nrp-edit-ops-v1',
  type: 'object',
  additionalProperties: false,
  required: ['operations'],
  properties: {
    operations: {
      type: 'array',
      maxItems: NRP_EDIT_OP_LIMIT,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['file', 'op', 'pointer', 'expectedJson', 'valueJson', 'reason'],
        properties: {
          file: { type: 'string', minLength: 1 },
          op: { type: 'string', enum: [...NRP_EDIT_OPS] },
          pointer: { type: 'string' },
          expectedJson: { type: 'string', maxLength: NRP_EDIT_JSON_LIMIT },
          valueJson: { type: 'string', maxLength: NRP_EDIT_JSON_LIMIT },
          reason: { type: 'string', maxLength: NRP_EDIT_REASON_LIMIT },
        },
      },
    },
  },
};

export const NRP_EDIT_SYSTEM_PROMPT = `<!-- modelType: reasoning -->
Edit the L4 files named in the message. You receive only those files, the intent, and the target ids.
Call submitNrpEdit. Return small operations. Do not repeat a file.
operations is a list of {file, op, pointer, expectedJson, valueJson, reason}. Every field is required. Use an empty string when a field does not apply.
op is set, add, remove, or create.
file is the id you were given: the entity id or the journey id, index for that kind's index, or the kind name for a single file: rules, access, workflows, integration.
A file is allowed when triage named it, when the message marks it so its text stops citing a term, or when triage creates it. Stay inside that list.
pointer is an RFC 6901 pointer inside that file. add on a list ends with /- or with an index from 0 through the list length, which inserts before that item. add on an object ends with the new key.
valueJson is one small JSON value, not the file. expectedJson is the current JSON value and is required for set and remove.
create adds a journey file or an ontology entity when Creates lists that id, or when this same list adds that id to the index. Its pointer is empty. When the message includes a sibling, the new file uses that shape. The sibling is a reference, not an example module.
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
  editErrors: readonly string[] = [],
  reference: NrpEditFile | null = null,
  occupied: readonly NrpEditFile[] | null = null,
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
  lines.push(`Allowed files:\n${files.map(file => `${file.id} — ${nrpFileReason(file, kind, marked, creates)}`).join('\n')}`);
  if (kind === 'journeys' && creates.length) {
    lines.push(NRP_JOURNEY_RULES);
    lines.push(nrpOccupiedSignatureBlock(occupied ?? files));
  }
  if (creates.length && reference) {
    const rule = kind === 'journeys' ? NRP_JOURNEY_SHAPE : NRP_ONTOLOGY_SHAPE;
    lines.push(`${rule}\nSibling ${reference.id} (reference only; do not edit it unless it is an allowed file):\n${JSON.stringify(reference.artifact)}`);
  }
  if (editErrors.length) {
    lines.push(`Previous operations were refused:\n${editErrors.join('\n')}\nSubmit a corrected list. The request is unchanged.`);
  }
  lines.push(`Files:\n${files.map(file => `${file.id}\n${JSON.stringify(file.artifact)}`).join('\n')}`);
  return lines.join('\n\n');
}

export function buildNrpEditTool(): mls.msg.LLMTool {
  return createNs4FlexibleWorkerTool(
    NRP_EDIT_TOOL,
    'Return small JSON operations for the named files. Do not return a file.',
    NRP_EDIT_SCHEMA,
  );
}

const SINGLE_FILE: Partial<Record<NrpArtifactKind, true>> = {
  rules: true, access: true, workflows: true, integration: true,
};

export class NrpEditRefusal extends Error {
  readonly raw: unknown;
  readonly createIds: string[];

  constructor(message: string, raw: unknown, createIds: readonly string[] = []) {
    super(message);
    this.name = 'NrpEditRefusal';
    this.raw = raw;
    this.createIds = [...createIds];
  }
}

/** Files the model may see: triage targets, files with a text mark, and files triage creates. */
export function nrpFileScope(
  artifacts: NrpModuleArtifacts,
  kind: NrpArtifactKind,
  triage: NrpTriage,
  textMarks: readonly NrpTextMark[] = [],
  pendingCreates: readonly string[] = [],
): NrpFileScope {
  if (SINGLE_FILE[kind]) {
    const id = kind;
    return { present: [id], creates: [], files: [{ id, artifact: artifactSlice(artifacts, kind) }] };
  }
  if (kind === 'ontology') return ontologyScope(artifacts, triage, textMarks, pendingCreates);
  return journeyScope(artifacts, triage, textMarks, pendingCreates);
}

/** One existing file of this kind, used as the shape of a file the edit creates. */
export function nrpShapeReference(artifacts: NrpModuleArtifacts, kind: NrpArtifactKind): NrpEditFile | null {
  if (kind === 'journeys') {
    const journey = artifacts.journeys[0];
    return journey ? { id: journey.journeyId, artifact: journey } : null;
  }
  if (kind === 'ontology') {
    const entity = artifacts.entities[0];
    return entity ? { id: entity.entityId, artifact: entity } : null;
  }
  return null;
}

/** File id of a text mark. The path is the one `applyNrpMechanical` recorded on the same module. */
export function nrpMarkFileId(artifacts: NrpModuleArtifacts, path: string): string | null {
  const entity = /^\$\.entities\[(\d+)\]/u.exec(path);
  if (entity) return artifacts.entities[Number(entity[1])]?.entityId ?? null;
  const journey = /^\$\.journeys\[(\d+)\]/u.exec(path);
  if (journey) return artifacts.journeys[Number(journey[1])]?.journeyId ?? null;
  if (path.startsWith('$.rules')) return 'rules';
  if (path.startsWith('$.access')) return 'access';
  if (path.startsWith('$.workflows')) return 'workflows';
  if (path.startsWith('$.integration')) return 'integration';
  if (path.startsWith('$.ontologyIndex') || path.startsWith('$.journeyIndex')) return 'index';
  return null;
}

/** Marks whose term is still in the file after this edit. An empty file list leaves every mark. */
export function nrpUnresolvedTextMarks(
  kind: NrpArtifactKind,
  scope: NrpFileScope,
  marks: readonly NrpTextMark[],
  edited: readonly NrpEditFile[],
  artifacts: NrpModuleArtifacts,
): Array<{ file: string; path: string; term: string; text: string }> {
  const byId = new Map(scope.files.map(file => [file.id, file.artifact]));
  for (const file of edited) byId.set(file.id, file.artifact);
  const rows: Array<{ file: string; path: string; term: string; text: string }> = [];
  const seen = new Set<string>();
  for (const mark of marks) {
    if (mark.kind !== kind) continue;
    const file = nrpMarkFileId(artifacts, mark.path);
    if (!file) continue;
    const artifact = byId.get(file);
    if (artifact === undefined) continue;
    for (const hit of nrpFreeTextHits(artifact, [mark.item])) {
      const key = `${file}\n${hit.path}\n${hit.term}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ file, path: hit.path, term: hit.term, text: hit.text });
    }
  }
  return rows;
}

export interface NrpEditOperation {
  file: string;
  op: NrpEditOp;
  pointer: string;
  expectedJson: string;
  valueJson: string;
  reason: string;
}

/** One more model call after a refused operation list. A second refusal stops the edit. */
export function nextNrpEditAfterRefusal(
  order: NrpEditCursor,
  message: string,
  createIds: readonly string[] = [],
): NrpEditCursor | null {
  if ((order.attempts || 0) >= 1) return null;
  const pendingCreates = [...(order.pendingCreates || [])];
  for (const id of createIds) if (!pendingCreates.includes(id)) pendingCreates.push(id);
  return { ...order, attempts: 1, editErrors: [message], pendingCreates };
}

/**
 * A new index id needs a new file, and a new file needs an index id.
 * The caller retries the edit once with `createIds` before the gate runs.
 */
export function nrpIndexFileGaps(
  kind: NrpArtifactKind,
  scope: NrpFileScope,
  edited: readonly NrpEditFile[],
): { messages: string[]; createIds: string[] } {
  if (kind !== 'journeys' && kind !== 'ontology') return { messages: [], createIds: [] };
  const after = new Map(scope.files.map(file => [file.id, file.artifact]));
  const beforeIds = indexIdSet(kind, after.get('index'));
  const beforeFiles = new Set([...after.keys()].filter(id => id !== 'index'));
  for (const file of edited) after.set(file.id, file.artifact);
  const afterIds = indexIdSet(kind, after.get('index'));
  const afterFiles = new Set([...after.keys()].filter(id => id !== 'index'));
  const messages: string[] = [];
  const createIds: string[] = [];
  for (const id of afterIds) {
    if (beforeIds.has(id) || afterFiles.has(id)) continue;
    messages.push(`Index lists ${id} but the file was not created.`);
    createIds.push(id);
  }
  for (const id of afterFiles) {
    if (beforeFiles.has(id) || afterIds.has(id)) continue;
    messages.push(`File ${id} was created but the index does not list it.`);
  }
  return { messages, createIds };
}

export interface NrpJourneySignature {
  journeyId: string;
  actorRef: string;
  signature: string;
}

/** Ordered `kind:entity` set, joined with `+`. Empty when the journey has no operation. */
export function nrpJourneySignature(file: { id: string; artifact: unknown }): NrpJourneySignature | null {
  if (!isRecord(file.artifact)) return null;
  const business = file.artifact.business;
  if (!isRecord(business) || typeof business.actorRef !== 'string' || !business.actorRef) return null;
  if (!Array.isArray(business.steps)) return null;
  const parts = [...new Set(business.steps.map(step => {
    if (!isRecord(step) || typeof step.kind !== 'string' || typeof step.entity !== 'string') return '';
    return step.kind && step.entity ? `${step.kind}:${step.entity}` : '';
  }).filter(Boolean))].sort();
  if (!parts.length) return null;
  const journeyId = typeof file.artifact.journeyId === 'string' && file.artifact.journeyId
    ? file.artifact.journeyId
    : file.id;
  return { journeyId, actorRef: business.actorRef, signature: parts.join('+') };
}

/** Signatures already used, grouped by actor. `actors` limits the list to the journey being repaired. */
export function nrpOccupiedSignatureBlock(
  files: readonly { id: string; artifact: unknown }[],
  actors: readonly string[] = [],
): string {
  const wanted = actors.length ? new Set(actors) : null;
  const groups = new Map<string, Map<string, string[]>>();
  for (const file of files) {
    if (file.id === 'index') continue;
    const signature = nrpJourneySignature(file);
    if (!signature) continue;
    if (wanted && !wanted.has(signature.actorRef)) continue;
    const bySignature = groups.get(signature.actorRef) || new Map<string, string[]>();
    const ids = bySignature.get(signature.signature) || [];
    if (!ids.includes(signature.journeyId)) ids.push(signature.journeyId);
    bySignature.set(signature.signature, ids);
    groups.set(signature.actorRef, bySignature);
  }
  const lines: string[] = [];
  for (const actor of [...groups.keys()].sort()) {
    const bySignature = groups.get(actor);
    if (!bySignature) continue;
    for (const signature of [...bySignature.keys()].sort()) {
      lines.push(`${actor}: ${signature} em ${bySignature.get(signature)?.join(', ')}`);
    }
  }
  return `Occupied signatures:\n${lines.join('\n') || '(none)'}\n${NRP_NEW_SIGNATURE_RULE}`;
}

/**
 * A created journey that repeats an occupied signature of the same actor.
 * The caller retries the edit once with this text before the gate runs.
 */
export function nrpCreatedTwinMessage(scope: NrpFileScope, edited: readonly NrpEditFile[]): string | null {
  const created = new Set(edited.filter(file => scope.creates.includes(file.id)).map(file => file.id));
  if (!created.size) return null;
  const merged = new Map(scope.files.map(file => [file.id, file.artifact]));
  for (const file of edited) merged.set(file.id, file.artifact);
  const signatures = [...merged.entries()]
    .filter(([id]) => id !== 'index')
    .map(([id, artifact]) => nrpJourneySignature({ id, artifact }))
    .filter((item): item is NrpJourneySignature => !!item);
  const clashes = signatures.filter(item =>
    created.has(item.journeyId)
    && signatures.some(other => other.journeyId !== item.journeyId && other.actorRef === item.actorRef && other.signature === item.signature),
  );
  if (!clashes.length) return null;
  const occupied = [...merged.entries()]
    .filter(([id]) => id !== 'index' && !created.has(id))
    .map(([id, artifact]) => ({ id, artifact }));
  const actors = [...new Set(clashes.map(item => item.actorRef))];
  const why = clashes.map(item => `Journey ${item.journeyId} repeats the occupied signature ${item.signature} of ${item.actorRef}.`).join('\n');
  return `${why}\n${nrpOccupiedSignatureBlock(occupied, actors)}`;
}

export function normalizeNrpEdit(kind: NrpArtifactKind, value: unknown, scope: NrpFileScope): { files: NrpEditFile[] } {
  try {
    const operations = readOperations(value);
    const working = new Map<string, { artifact: unknown; created: boolean }>();
    for (const file of scope.files) working.set(file.id, { artifact: cloneJson(file.artifact), created: false });
    const creates = operations.filter(operation => operation.op === 'create');
    for (const operation of operations) {
      if (operation.op !== 'create') applyOperation(kind, scope, working, operation);
    }
    for (const operation of creates) applyOperation(kind, scope, working, operation);
    const files: NrpEditFile[] = [];
    for (const [id, item] of working) {
      const before = scope.files.find(file => file.id === id);
      if (!item.created && before && sameJson(before.artifact, item.artifact)) continue;
      assertFile(kind, id, item.artifact);
      files.push({ id, artifact: item.artifact });
    }
    return { files };
  } catch (error) {
    if (error instanceof NrpEditRefusal) throw error;
    throw new NrpEditRefusal(error instanceof Error ? error.message : String(error), value);
  }
}

function readOperations(value: unknown): NrpEditOperation[] {
  const root = record(value, 'Edit payload');
  if (!Array.isArray(root.operations)) throw new Error('Edit payload must list operations.');
  if (root.operations.length > NRP_EDIT_OP_LIMIT) {
    throw new Error(`Edit payload has more than ${NRP_EDIT_OP_LIMIT} operations.`);
  }
  return root.operations.map(item => {
    const row = record(item, 'Edit operation');
    const file = requireText(row.file, 'Edit operation file');
    const op = row.op;
    if (typeof op !== 'string' || !NRP_EDIT_OPS.includes(op as NrpEditOp)) throw new Error('Edit operation op is not set, add, remove, or create.');
    const pointer = requireText(row.pointer, 'Edit operation pointer', true);
    const expectedJson = boundedJson(row.expectedJson, 'expectedJson');
    const valueJson = boundedJson(row.valueJson, 'valueJson');
    const reason = requireText(row.reason, 'Edit operation reason', true);
    if (reason.length > NRP_EDIT_REASON_LIMIT) throw new Error(`Edit operation reason is longer than ${NRP_EDIT_REASON_LIMIT} characters.`);
    return { file, op: op as NrpEditOp, pointer, expectedJson, valueJson, reason };
  });
}

function applyOperation(
  kind: NrpArtifactKind,
  scope: NrpFileScope,
  working: Map<string, { artifact: unknown; created: boolean }>,
  operation: NrpEditOperation,
): void {
  if (operation.op === 'create') {
    createFile(kind, scope, working, operation);
    return;
  }
  if (!scope.present.includes(operation.file) || !working.has(operation.file)) {
    throw new Error(`Edit file ${operation.file} is not a target. Allowed: ${nrpAllowedFiles(scope)}.`);
  }
  const current = working.get(operation.file);
  if (!current) throw new Error(`Edit file ${operation.file} is not a target. Allowed: ${nrpAllowedFiles(scope)}.`);
  const tokens = pointerTokens(operation.pointer);
  assertMutable(tokens);
  if (operation.op === 'add') {
    current.artifact = addAt(current.artifact, tokens, parseJsonText(operation.valueJson, 'valueJson'));
    return;
  }
  const expected = parseJsonText(operation.expectedJson, 'expectedJson');
  if (operation.op === 'remove') {
    current.artifact = removeAt(current.artifact, tokens, expected);
    return;
  }
  current.artifact = setAt(current.artifact, tokens, expected, parseJsonText(operation.valueJson, 'valueJson'));
}

function createFile(
  kind: NrpArtifactKind,
  scope: NrpFileScope,
  working: Map<string, { artifact: unknown; created: boolean }>,
  operation: NrpEditOperation,
): void {
  if (kind !== 'journeys' && kind !== 'ontology') throw new Error('create only adds a journey file or an ontology entity.');
  const indexed = indexIdSet(kind, working.get('index')?.artifact);
  if (!scope.creates.includes(operation.file) && !indexed.has(operation.file)) {
    throw new Error(`Edit file ${operation.file} is not a target. Allowed: ${nrpAllowedFiles(scope)}.`);
  }
  if (operation.pointer !== '') throw new Error('create uses an empty pointer.');
  if (working.has(operation.file)) throw new Error(`Edit file ${operation.file} already exists.`);
  const artifact = parseJsonText(operation.valueJson, 'valueJson');
  assertFile(kind, operation.file, artifact);
  if (kind === 'journeys') assertNewJourney(artifact);
  working.set(operation.file, { artifact, created: true });
}

function assertNewJourney(value: unknown): void {
  const business = record(record(value, 'Edited file').business, 'Journey business');
  for (const key of ['actorRef', 'title', 'goal', 'entry', 'steps', 'outcome']) {
    if (business[key] === undefined) {
      throw new Error(`A new journey file needs business.${key}, the same shape as the sibling.`);
    }
  }
  if (!Array.isArray(business.steps)) throw new Error('A new journey file needs business.steps, the same shape as the sibling.');
}

function indexIdSet(kind: NrpArtifactKind, index: unknown): Set<string> {
  const ids = new Set<string>();
  if (!index || typeof index !== 'object' || Array.isArray(index)) return ids;
  const key = kind === 'journeys' ? 'journeys' : 'entities';
  const idKey = kind === 'journeys' ? 'journeyId' : 'entityId';
  const rows = (index as Record<string, unknown>)[key];
  if (!Array.isArray(rows)) return ids;
  for (const row of rows) {
    if (typeof row === 'string') ids.add(row);
    else if (row && typeof row === 'object' && typeof (row as Record<string, unknown>)[idKey] === 'string') {
      ids.add((row as Record<string, unknown>)[idKey] as string);
    }
  }
  return ids;
}

const FROZEN_TOKENS = new Set(['schemaVersion', 'moduleName', 'entityId', 'journeyId']);

function assertMutable(tokens: readonly string[]): void {
  if (tokens.some(token => FROZEN_TOKENS.has(token))) {
    throw new Error('set and remove cannot change schemaVersion, moduleName, or the file id.');
  }
}

function pointerTokens(pointer: string): string[] {
  if (pointer === '') throw new Error('Pointer must name a location inside the file.');
  if (!pointer.startsWith('/')) throw new Error(`Pointer ${pointer} is not an RFC 6901 pointer.`);
  return pointer.slice(1).split('/').map(unescapeToken);
}

function unescapeToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function addAt(root: unknown, tokens: readonly string[], value: unknown): unknown {
  if (!tokens.length) throw new Error('add needs a pointer.');
  const parentTokens = tokens.slice(0, -1);
  const leaf = tokens[tokens.length - 1];
  const parent = parentTokens.length ? requireAt(root, parentTokens) : root;
  if (leaf === '-' || /^(0|[1-9]\d*)$/.test(leaf)) {
    if (!Array.isArray(parent)) throw new Error(`Pointer ${formatPointer(parentTokens)} is not a list.`);
    const index = leaf === '-' ? parent.length : Number(leaf);
    if (index > parent.length) throw new Error(`List index ${index} is outside 0..${parent.length}.`);
    const next = cloneJson(root);
    const list = requireAt(next, parentTokens);
    if (!Array.isArray(list)) throw new Error(`Pointer ${formatPointer(parentTokens)} is not a list.`);
    list.splice(index, 0, value);
    return next;
  }
  if (Array.isArray(parent)) throw new Error(`List index ${leaf} is outside 0..${parent.length}.`);
  if (!parent || typeof parent !== 'object') throw new Error(`Pointer ${formatPointer(parentTokens)} does not exist.`);
  if (Object.prototype.hasOwnProperty.call(parent, leaf)) throw new Error(`Key ${leaf} is not free.`);
  const next = cloneJson(root);
  const target = parentTokens.length ? requireAt(next, parentTokens) : next;
  if (!target || typeof target !== 'object' || Array.isArray(target)) {
    throw new Error(`Pointer ${formatPointer(parentTokens)} does not exist.`);
  }
  (target as Record<string, unknown>)[leaf] = value;
  return next;
}

function setAt(root: unknown, tokens: readonly string[], expected: unknown, value: unknown): unknown {
  const current = requireAt(root, tokens);
  if (!sameJson(current, expected)) throw new Error(`expectedJson does not match the current value at ${formatPointer(tokens)}.`);
  if (!tokens.length) return value;
  const next = cloneJson(root);
  const parent = requireAt(next, tokens.slice(0, -1));
  const leaf = tokens[tokens.length - 1];
  writeLeaf(parent, leaf, value);
  return next;
}

function removeAt(root: unknown, tokens: readonly string[], expected: unknown): unknown {
  if (!tokens.length) throw new Error('remove needs a pointer.');
  const current = requireAt(root, tokens);
  if (!sameJson(current, expected)) throw new Error(`expectedJson does not match the current value at ${formatPointer(tokens)}.`);
  const next = cloneJson(root);
  const parent = requireAt(next, tokens.slice(0, -1));
  const leaf = tokens[tokens.length - 1];
  if (Array.isArray(parent)) {
    if (!/^(0|[1-9]\d*)$/.test(leaf)) throw new Error(`Pointer ${formatPointer(tokens)} does not exist.`);
    parent.splice(Number(leaf), 1);
    return next;
  }
  if (!parent || typeof parent !== 'object') throw new Error(`Pointer ${formatPointer(tokens)} does not exist.`);
  delete (parent as Record<string, unknown>)[leaf];
  return next;
}

function requireAt(root: unknown, tokens: readonly string[]): unknown {
  let current = root;
  const walked: string[] = [];
  for (const token of tokens) {
    walked.push(token);
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(token) || Number(token) >= current.length) {
        throw new Error(`Pointer ${formatPointer(walked)} does not exist.`);
      }
      current = current[Number(token)];
      continue;
    }
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, token)) {
      throw new Error(`Pointer ${formatPointer(walked)} does not exist.`);
    }
    current = (current as Record<string, unknown>)[token];
  }
  return current;
}

function writeLeaf(parent: unknown, leaf: string, value: unknown): void {
  if (Array.isArray(parent)) {
    if (!/^(0|[1-9]\d*)$/.test(leaf) || Number(leaf) >= parent.length) {
      throw new Error(`Pointer does not exist.`);
    }
    parent[Number(leaf)] = value;
    return;
  }
  if (!parent || typeof parent !== 'object') throw new Error('Pointer does not exist.');
  (parent as Record<string, unknown>)[leaf] = value;
}

function formatPointer(tokens: readonly string[]): string {
  if (!tokens.length) return '/';
  return `/${tokens.map(token => token.replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;
}

function parseJsonText(value: string, label: string): unknown {
  if (!value.trim()) throw new Error(`Edit operation ${label} must be JSON text.`);
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error(`[agentNewReleasePrompt] edit ${label} is not JSON`, error);
    throw new Error(`Edit operation ${label} must be JSON text.`);
  }
}

function boundedJson(value: unknown, label: string): string {
  const text = requireText(value, `Edit operation ${label}`, true);
  if (text.length > NRP_EDIT_JSON_LIMIT) throw new Error(`Edit operation ${label} is longer than ${NRP_EDIT_JSON_LIMIT} characters.`);
  return text;
}

function requireText(value: unknown, label: string, allowEmpty = false): string {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  if (!allowEmpty && !value.trim()) throw new Error(`${label} must be text.`);
  return value;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function artifactSlice(artifacts: NrpModuleArtifacts, kind: NrpArtifactKind): unknown {
  if (kind === 'rules') return artifacts.rules;
  if (kind === 'access') return artifacts.access;
  if (kind === 'workflows') return artifacts.workflows;
  return artifacts.integration;
}

function nrpAllowedFiles(scope: NrpFileScope): string {
  const ids = [...scope.present];
  for (const id of scope.creates) if (!ids.includes(id)) ids.push(id);
  return ids.join(', ') || '(none)';
}

function nrpFileReason(
  file: NrpEditFile,
  kind: NrpArtifactKind,
  marks: readonly NrpTextMark[],
  creates: readonly string[],
): string {
  const serialized = JSON.stringify(file.artifact);
  const terms = [...new Set(marks.filter(mark => mark.kind === kind && serialized.includes(mark.text)).map(mark => mark.item))];
  if (terms.length) return `marked: adjust the text so it does not cite ${terms.join(', ')}`;
  if (creates.includes(file.id)) return 'created by triage';
  return 'named by triage';
}

function markedFileIds(artifacts: NrpModuleArtifacts, kind: NrpArtifactKind, textMarks: readonly NrpTextMark[]): Set<string> {
  const ids = new Set<string>();
  for (const mark of textMarks) {
    if (mark.kind !== kind) continue;
    const id = nrpMarkFileId(artifacts, mark.path);
    if (id) ids.add(id);
  }
  return ids;
}

function fileCreates(
  artifacts: NrpModuleArtifacts,
  kind: NrpArtifactKind,
  known: ReadonlySet<string>,
  targets: readonly string[],
  pendingCreates: readonly string[],
): string[] {
  const creates: string[] = [];
  const push = (id: string) => {
    if (id && !creates.includes(id)) creates.push(id);
  };
  for (const id of targets) {
    if (!known.has(id) && !existsOutside(artifacts, kind, id)) push(id);
  }
  for (const id of idsMissingFiles(artifacts, kind)) push(id);
  for (const id of pendingCreates) push(id);
  return creates;
}

function idsMissingFiles(artifacts: NrpModuleArtifacts, kind: NrpArtifactKind): string[] {
  if (kind === 'journeys') {
    const have = new Set(artifacts.journeys.map(journey => journey.journeyId));
    return (artifacts.journeyIndex.journeys || []).map(entry => entry.journeyId).filter(id => id && !have.has(id));
  }
  const have = new Set(artifacts.entities.map(entity => entity.entityId));
  return [...indexIdSet('ontology', artifacts.ontologyIndex)].filter(id => !have.has(id));
}

function existsOutside(artifacts: NrpModuleArtifacts, kind: NrpArtifactKind, id: string): boolean {
  if (kind !== 'rules') {
    const rules = artifacts.rules as { rules?: unknown };
    if (Array.isArray(rules.rules) && rules.rules.some(item => isRecord(item) && item.ruleId === id)) return true;
    if (isRecord(rules.rules) && Object.prototype.hasOwnProperty.call(rules.rules, id)) return true;
  }
  if (kind !== 'journeys') {
    for (const journey of artifacts.journeys) {
      if (journey.journeyId === id) return true;
      if ((journey.business?.steps || []).some(step => step.stepId === id)) return true;
    }
  }
  if (kind !== 'ontology' && ontologyIds(artifacts).has(id)) return true;
  if (kind !== 'access') {
    if ((artifacts.access.actors || []).some(actor => actor.actorId === id)) return true;
    if ((artifacts.access.grants || []).some(grant => grant.grantId === id)) return true;
  }
  if (kind !== 'workflows') {
    for (const process of artifacts.workflows.processes || []) {
      if (process.processId === id) return true;
      if ((process.tasks || []).some(task => task.taskId === id)) return true;
    }
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function ontologyScope(
  artifacts: NrpModuleArtifacts,
  triage: NrpTriage,
  textMarks: readonly NrpTextMark[],
  pendingCreates: readonly string[],
): NrpFileScope {
  const known = ontologyIds(artifacts);
  const marked = markedFileIds(artifacts, 'ontology', textMarks);
  const selected = artifacts.entities.filter(entity =>
    triage.targets.includes(entity.entityId) || ownsAny(entity, triage.targets) || marked.has(entity.entityId),
  );
  const creates = fileCreates(artifacts, 'ontology', known, triage.targets, pendingCreates);
  const removesFile = triage.mechanical.some(mark =>
    mark.op === 'remove' && artifacts.entities.some(entity => entity.entityId === mark.targetId),
  );
  const files: NrpEditFile[] = selected.map(entity => ({ id: entity.entityId, artifact: entity }));
  if (creates.length || removesFile || !files.length || triage.targets.some(id => !known.has(id))) {
    files.push({ id: 'index', artifact: artifacts.ontologyIndex });
  }
  const present = files.map(file => file.id);
  return { present, creates, files };
}

function journeyScope(
  artifacts: NrpModuleArtifacts,
  triage: NrpTriage,
  textMarks: readonly NrpTextMark[],
  pendingCreates: readonly string[],
): NrpFileScope {
  const known = new Set<string>();
  for (const journey of artifacts.journeys) {
    known.add(journey.journeyId);
    for (const step of journey.business?.steps || []) known.add(step.stepId);
  }
  for (const entry of artifacts.journeyIndex.journeys || []) known.add(entry.journeyId);
  const marked = markedFileIds(artifacts, 'journeys', textMarks);
  const selected = artifacts.journeys.filter(journey =>
    triage.targets.includes(journey.journeyId)
    || (journey.business?.steps || []).some(step => triage.targets.includes(step.stepId))
    || marked.has(journey.journeyId),
  );
  const creates = fileCreates(artifacts, 'journeys', known, triage.targets, pendingCreates);
  const removesFile = triage.mechanical.some(mark =>
    mark.op === 'remove' && artifacts.journeys.some(journey => journey.journeyId === mark.targetId),
  );
  const files: NrpEditFile[] = selected.map(journey => ({ id: journey.journeyId, artifact: journey }));
  if (creates.length || removesFile || !files.length || triage.targets.some(id => !known.has(id)) || pendingCreates.length) {
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
  for (const kind of nrpModelKinds(artifacts, triage.mechanical, triage.artifacts, triage.mechanicalOnly)) {
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
    const scope = nrpFileScope(edited.artifacts, kind, parsed.order.triage, edited.textMarks, parsed.order.pendingCreates || []);
    const tool = buildNrpEditTool();
    const reference = scope.creates.length ? nrpShapeReference(edited.artifacts, kind) : null;
    const occupied = kind === 'journeys'
      ? edited.artifacts.journeys.map(journey => ({ id: journey.journeyId, artifact: journey }))
      : null;
    return [{
      type: 'prompt_ready',
      args: String(step.prompt || ''),
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: NRP_EDIT_SYSTEM_PROMPT,
      humanPrompt: buildNrpEditHumanPrompt(
        parsed.request, parsed.order.triage, kind, scope.files, edited.textMarks, scope.creates, parsed.order.editErrors || [], reference, occupied,
      ),
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
    const scope = nrpFileScope(loaded.artifacts, parsed.order.kind, parsed.order.triage, loaded.textMarks, parsed.order.pendingCreates || []);
    const artifact = normalizeNrpEdit(parsed.order.kind, payload, scope);
    const gaps = nrpIndexFileGaps(parsed.order.kind, scope, artifact.files);
    if (gaps.messages.length) {
      throw new NrpEditRefusal(gaps.messages.join('\n'), payload, gaps.createIds);
    }
    if (parsed.order.kind === 'journeys') {
      const twin = nrpCreatedTwinMessage(scope, artifact.files);
      if (twin) throw new NrpEditRefusal(twin, payload);
    }
    const pendingTextMarks = nrpUnresolvedTextMarks(parsed.order.kind, scope, loaded.textMarks, artifact.files, loaded.artifacts);
    const applied: NrpAppliedEdit[] = [
      ...parsed.order.applied,
      { mode: 'model', kind: parsed.order.kind, artifact },
    ];
    return [
      {
        type: 'add-step', ...base, step: {
          type: 'result', stepId: 0, status: 'completed', interaction: null, nextSteps: [],
          stepTitle: `Edited ${parsed.order.kind}`,
          result: JSON.stringify({
            mode: 'model',
            kind: parsed.order.kind,
            artifact,
            pendingTextMarks,
            ...(pendingTextMarks.length ? { note: 'citações que ficaram' } : {}),
            nextStep: 'gate40',
          }),
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
    const retry = retryEdit(step, cited);
    if (retry) {
      return [
        { type: 'add-step', ...base, step: retry },
        {
          type: 'update-status', ...base, stepId: step.stepId, hookSequential, status: 'completed',
          cleaner: 'input_output',
          traceMsg: cited instanceof Error ? cited.message : String(cited),
        },
      ];
    }
    return [fail(context, parentStep, step, hookSequential, cited)];
  }
}

function retryEdit(step: mls.msg.AIAgentStep, error: unknown): mls.msg.AIAgentStep | null {
  if (!(error instanceof NrpEditRefusal)) return null;
  try {
    const project = mls.actualProject || 0;
    const parsed = parseNrpEditPrompt(String(step.prompt || ''), project);
    const next = nextNrpEditAfterRefusal(parsed.order, error.message, error.createIds);
    if (!next) return null;
    return createEdit30Step(parsed.moduleName, parsed.request, next);
  } catch (retryError) {
    console.error('[agentNewReleasePrompt] edit30 could not plan a retry', retryError);
    return null;
  }
}

async function citeEditRefusal(step: mls.msg.AIAgentStep, error: unknown): Promise<unknown> {
  if (!(error instanceof NrpEditRefusal)) return error;
  try {
    const project = mls.actualProject || 0;
    const parsed = parseNrpEditPrompt(String(step.prompt || ''), project);
    const info = pipelineJsonFileForProject(project, parsed.moduleName, 'newReleasePrompt-refused');
    const citation = await recordNrpTriageRefusal(info, error.message, error.raw);
    return new NrpEditRefusal(`${error.message} See ${citation}.`, error.raw, error.createIds);
  } catch (writeError) {
    console.error('[agentNewReleasePrompt] edit30 could not record the refused response', writeError);
    const writeMessage = writeError instanceof Error ? writeError.message : String(writeError);
    return new NrpEditRefusal(`${error.message} The refused response was not recorded: ${writeMessage}.`, error.raw, error.createIds);
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
    attempts: readAttempts(root.attempts),
    editErrors: readErrors(root.editErrors),
    pendingCreates: readErrors(root.pendingCreates),
  };
}

function readAttempts(value: unknown): number {
  if (value === undefined) return 0;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error('Edit attempts must be a whole number.');
  return value;
}

function readErrors(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error('Edit errors must be a list of text.');
  return value;
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

export function assertFile(kind: NrpArtifactKind, id: string, value: unknown): void {
  const root = record(value, 'Edited file');
  if (kind === 'rules' && id === 'rules' && rulesShape(root.rules)) return;
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

/** v1 is a list of {ruleId, description}. v2 is a map of ruleId to one sentence. */
function rulesShape(rules: unknown): boolean {
  if (Array.isArray(rules)) {
    return rules.every(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      const row = item as Record<string, unknown>;
      return typeof row.ruleId === 'string' && typeof row.description === 'string';
    });
  }
  if (!rules || typeof rules !== 'object') return false;
  return Object.values(rules as Record<string, unknown>).every(item => typeof item === 'string');
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
