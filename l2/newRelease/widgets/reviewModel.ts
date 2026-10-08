/// <mls fileReference="_102035_/l2/newRelease/widgets/reviewModel.ts" enhancement="_blank" />

import type { MenuReadStatus } from '/_102035_/l2/newRelease/helpers/menuReader.js';
import type { ReviewArtifactRead } from '/_102035_/l2/newRelease/helpers/backendReader.js';
import type { NewReleaseModuleData } from '/_102035_/l2/newRelease/helpers/l4Reader.js';
import type { L4ImplementationHashes, L4ImplementationPhase, L4ImplementationRecord } from '/_102035_/l2/solution/candidate/moduleImplementation.js';
import { listPoolBoxForProject } from '/_102035_/l2/solution/pool.js';
import { validateChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import {
  MENU_ACTIONS,
  MENU_ORGANISM_KINDS,
  MENU_SCHEMA_VERSION,
  type MenuAction,
  type MenuNodeKind,
  type MenuOrganism,
  type MenuOrganismKind,
  type MenuStampedNode,
} from '/_102035_/l2/solution/poolPlan.js';

export const REVIEW_ALL_ACTORS = 'all';
export type ReviewScreenKind = 'pending' | 'empty' | 'invalid' | 'ready';
export type ReviewNodeScope = 'future' | 'removed';
export type ReviewPrimaryActionKind = 'calculate' | 'retry' | 'continue' | 'unavailable';

export interface ReviewMenu {
  schemaVersion: typeof MENU_SCHEMA_VERSION;
  moduleName: string;
  device: string;
  tree: MenuStampedNode[];
  authorities: Record<string, string[]>;
  removed: MenuStampedNode[];
}

export interface ReviewActorOption {
  key: string;
  actorId: string;
}

export interface ReviewTreeNode {
  id: string;
  kind: MenuNodeKind;
  label: string;
  action: MenuAction;
  children: ReviewTreeNode[];
}

export interface ReviewNodeDetail {
  id: string;
  kind: MenuNodeKind;
  label: string;
  action: MenuAction;
  scope: ReviewNodeScope;
  text: string;
  context: string;
  organisms: MenuOrganism[];
}

export interface ReviewView {
  kind: ReviewScreenKind;
  errorCode: string;
  actors: ReviewActorOption[];
  selectedActor: string;
  selectedId: string;
  selectedScope: ReviewNodeScope;
  tree: ReviewTreeNode[];
  removed: ReviewTreeNode[];
  selected: ReviewNodeDetail | null;
  showContinue: boolean;
  showCalculate: boolean;
}

export interface ReviewInput {
  pendingCount: number;
  readStatus: MenuReadStatus;
  raw?: unknown;
  selectedActor: string;
  selectedId: string;
  selectedScope: ReviewNodeScope;
}

export interface ReviewExpansionState {
  expandedKeys: string[];
  selectedId: string;
}

export interface ReviewPrimaryActionInput {
  viewKind: ReviewScreenKind;
  version: 'asis' | 'tobe' | `release:${string}`;
  loading: boolean;
  current: boolean;
  resultCurrent: boolean;
  backendKind: 'missing' | 'invalid' | 'stale' | 'ready';
  effortKind: 'missing' | 'invalid' | 'counts';
  busy: boolean;
  connected: boolean;
  retry?: boolean;
  retryAvailable?: boolean;
  error: string;
}

export interface ReviewPrimaryActionPlacement {
  placement: 'top' | 'bottom';
  action: ReviewPrimaryActionPresentation;
  announceError: boolean;
}

export interface ReviewPrimaryActionPresentation {
  kind: ReviewPrimaryActionKind;
  labelKey: string;
  descriptionKey: string;
  availabilityKey: string;
  disabled: boolean;
  busy: boolean;
  error: string;
}

export interface ReviewStartSealedRevision {
  request: string;
  sources: readonly { path: string; source: string }[];
  manifest: {
    project: number;
    moduleName: string;
    changeId: string;
    revisionId: string;
    baseId: string;
    requestRevision: number;
    requestHash?: string;
    files: Readonly<Record<string, string>>;
  };
}

export interface ReviewStartPreflightInput {
  project: number;
  moduleName: string;
  changeId: string | null;
  revisionId: string | null;
  request: string;
  userId: string | null;
  hasRun: boolean;
  sealedRevision: ReviewStartSealedRevision | null;
}

export interface ReviewImplementationInput {
  project: number;
  moduleName: string;
  data: Pick<NewReleaseModuleData, 'changeId' | 'revisionId' | 'resultCurrent'> | null;
  runStatus: string | null;
  changeEffort: ReviewArtifactRead;
  hashes: L4ImplementationHashes;
  implementation: L4ImplementationRecord | null;
}

export interface ImplementationProgressPhase {
  name: L4ImplementationPhase['name'];
  status: 'aguardando' | 'executando' | 'concluido' | 'falhou';
  attempt?: L4ImplementationPhase['attempt'];
  changedDefs?: L4ImplementationPhase['changedDefs'];
  error?: string;
  previousAttempts?: L4ImplementationPhase['previousAttempts'];
  podeTentarDeNovo: boolean;
}

/** Agent completion only; this view makes no publication or materialization claim. */
export function implementationProgress(
  record: L4ImplementationRecord | null,
  currentChangeId: string | null,
): ImplementationProgressPhase[] {
  const current = currentChangeId && record?.changeId === currentChangeId ? record : null;
  const phases = current?.phases ?? [];
  return (current?.merged.runAgents ?? []).map((_, index) => {
    const name = `runAgents:${index}`;
    const phase = phases.find(item => item.name === name);
    if (!phase) return { name, status: 'aguardando', podeTentarDeNovo: false };
    return {
      name,
      status: phase.status === 'running' ? 'executando' : phase.status === 'done' ? 'concluido' : 'falhou',
      attempt: phase.attempt,
      ...(phase.status === 'done' ? { changedDefs: phase.changedDefs } : {}),
      ...(phase.status === 'failed' ? { error: phase.error, previousAttempts: phase.previousAttempts } : {}),
      podeTentarDeNovo: phase.status === 'failed' && phase.attempt < 2,
    };
  });
}

/** Presentation gate; acceptance repeats the active revision CAS under the module writer. */
export function canAcceptImplementation(input: ReviewImplementationInput): boolean {
  const { data, implementation, hashes } = input;
  if (!input.project || !input.moduleName || input.runStatus !== 'ready'
    || !data?.resultCurrent || !data.changeId || !data.revisionId) return false;
  const path = `l4/${input.moduleName}/pipeline/changes/${data.changeId}/revisions/${data.revisionId}/l4/pool/l4/changeEffort.json`;
  if (input.changeEffort.status !== 'ok' || input.changeEffort.path !== path || !hashes.changeEffort) return false;
  const checked = validateChangeEffort(input.changeEffort.value);
  if (!checked.ok || checked.file.module !== input.moduleName || checked.file.status !== 'simple'
    || checked.file.merged.regenerateDefs.length > 0) return false;
  if (implementation && (implementation.changeId !== data.changeId
    || implementation.revisionId !== data.revisionId
    || implementation.hashes.changeEffort !== hashes.changeEffort)) return false;
  return (['l4', 'l2', 'l1'] as const).every(box => listPoolBoxForProject(input.project, input.moduleName, box).length === 0);
}

function sortedEntries(record: Readonly<Record<string, string>>): Array<readonly [string, string]> {
  return Object.entries(record).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
}

/** Full fence between the snapshot rendered by preflight and the authoritative click reread. */
export function sameReviewStartSnapshot(
  loaded: ReviewStartSealedRevision | null,
  fresh: ReviewStartSealedRevision | null,
): boolean {
  if (!loaded || !fresh) return false;
  const left = loaded.manifest;
  const right = fresh.manifest;
  if (loaded.request !== fresh.request
    || left.project !== right.project || left.moduleName !== right.moduleName
    || left.changeId !== right.changeId || left.revisionId !== right.revisionId
    || left.baseId !== right.baseId || left.requestRevision !== right.requestRevision
    || left.requestHash !== right.requestHash
    || JSON.stringify(sortedEntries(left.files)) !== JSON.stringify(sortedEntries(right.files))) return false;
  const normalize = (sources: ReviewStartSealedRevision['sources']) => [...sources]
    .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
    .map(item => [item.path, item.source] as const);
  return JSON.stringify(normalize(loaded.sources)) === JSON.stringify(normalize(fresh.sources));
}

/** Synchronous presentation gate; the click repeats the authoritative sealed read before start. */
export function canStartReviewRun(input: ReviewStartPreflightInput): boolean {
  const sealed = input.sealedRevision;
  const manifest = sealed?.manifest;
  return !input.hasRun
    && !!input.userId
    && !!input.request.trim()
    && input.request === input.request.trim()
    && sealed?.request === input.request
    && !!sealed.sources.length
    && manifest?.project === input.project
    && manifest.moduleName === input.moduleName
    && manifest.changeId === input.changeId
    && manifest.revisionId === input.revisionId
    && /^[A-Za-z0-9][A-Za-z0-9-]{0,127}$/u.test(manifest.baseId)
    && Number.isSafeInteger(manifest.requestRevision) && manifest.requestRevision > 0
    && /^sha256:[a-f0-9]{64}$/u.test(manifest.requestHash || '');
}

export function buildReviewActionPresentation(input: ReviewPrimaryActionInput): ReviewPrimaryActionPresentation {
  let kind: ReviewPrimaryActionKind = 'unavailable';
  if (!input.loading && input.current && input.version === 'tobe') {
    if (input.retry && input.retryAvailable) kind = 'retry';
    else if (!input.retry && input.viewKind === 'pending') kind = 'calculate';
    else if (input.viewKind === 'ready' && input.resultCurrent
      && input.backendKind === 'ready' && input.effortKind !== 'invalid') kind = 'continue';
  }
  const labelKey = input.busy
    ? 'review.actionBusy'
    : kind === 'retry' ? 'review.retry'
      : kind === 'calculate' ? 'review.calculate'
      : kind === 'continue' ? 'review.continue'
        : 'review.actionUnavailable';
  const expectsCurrentResult = input.viewKind === 'ready' && input.resultCurrent;
  const descriptionKey = input.loading || !input.current
    ? 'review.actionLoading'
    : input.retry && !input.retryAvailable ? 'review.actionRetryExhausted'
      : kind === 'retry' ? 'review.actionRetryBody'
      : kind === 'calculate' ? 'review.actionCalculateBody'
      : kind === 'continue' ? 'review.actionContinueBody'
        : expectsCurrentResult && input.backendKind === 'missing' ? 'review.actionBackendMissing'
          : expectsCurrentResult && input.backendKind === 'invalid' ? 'review.actionBackendInvalid'
            : expectsCurrentResult && input.backendKind === 'stale' ? 'review.actionBackendStale'
              : expectsCurrentResult && input.effortKind === 'invalid' ? 'review.actionEffortInvalid'
        : 'review.actionUnavailableBody';
  return {
    kind,
    labelKey,
    descriptionKey,
    availabilityKey: input.busy ? 'review.actionBusy' : input.connected ? '' : 'review.actionReadinessBlocked',
    disabled: input.busy || !input.connected || kind === 'unavailable',
    busy: input.busy,
    error: input.error,
  };
}

export function buildReviewActionPlacements(action: ReviewPrimaryActionPresentation): readonly ReviewPrimaryActionPlacement[] {
  return [
    { placement: 'top', action, announceError: true },
    { placement: 'bottom', action, announceError: false },
  ];
}

export function beginReviewPrimaryAction(action: ReviewPrimaryActionPresentation): { accepted: boolean; busy: boolean } {
  return action.disabled || action.busy ? { accepted: false, busy: action.busy } : { accepted: true, busy: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asNonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseAction(value: unknown): MenuAction | null {
  return typeof value === 'string' && (MENU_ACTIONS as readonly string[]).includes(value) ? value as MenuAction : null;
}

function parseOrganism(value: unknown): MenuOrganism | null {
  if (!isRecord(value)) return null;
  const kind = value.kind;
  const text = asNonEmpty(value.text);
  if (typeof kind !== 'string' || !(MENU_ORGANISM_KINDS as readonly string[]).includes(kind) || !text) return null;
  return { kind: kind as MenuOrganismKind, text };
}

function parseNode(value: unknown): MenuStampedNode | null {
  if (!isRecord(value)) return null;
  const id = asNonEmpty(value.id);
  const label = asNonEmpty(value.label);
  const action = parseAction(value.action);
  if (!id || !label || !action) return null;
  if (value.kind === 'page') {
    if (!Array.isArray(value.organisms)) return null;
    const organisms: MenuOrganism[] = [];
    for (const item of value.organisms) {
      const organism = parseOrganism(item);
      if (!organism) return null;
      organisms.push(organism);
    }
    return { id, kind: 'page', label, action, organisms };
  }
  if (value.kind !== 'hub' && value.kind !== 'group') return null;
  if (!Array.isArray(value.children)) return null;
  const children: MenuStampedNode[] = [];
  for (const item of value.children) {
    const child = parseNode(item);
    if (!child) return null;
    children.push(child);
  }
  const text = asNonEmpty(value.text);
  if (!text) return null;
  if (value.kind === 'hub') {
    const context = asNonEmpty(value.context);
    if (!context) return null;
    return { id, kind: 'hub', label, action, context, text, children };
  }
  return { id, kind: 'group', label, action, text, children };
}

function parseAuthorities(value: unknown): Record<string, string[]> | null {
  if (!isRecord(value)) return null;
  const authorities: Record<string, string[]> = {};
  for (const [key, ids] of Object.entries(value)) {
    if (!key || !Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !id)) return null;
    authorities[key] = ids as string[];
  }
  return authorities;
}

function parseForest(value: unknown): MenuStampedNode[] | null {
  if (!Array.isArray(value)) return null;
  const nodes: MenuStampedNode[] = [];
  for (const item of value) {
    const node = parseNode(item);
    if (!node) return null;
    nodes.push(node);
  }
  return nodes;
}

export function parseReviewMenu(raw: unknown): { ok: true; menu: ReviewMenu } | { ok: false; errorCode: string } {
  if (!isRecord(raw)) return { ok: false, errorCode: 'review.error.invalid' };
  if (raw.schemaVersion !== MENU_SCHEMA_VERSION) return { ok: false, errorCode: 'review.error.schema' };
  const moduleName = asNonEmpty(raw.moduleName);
  const device = asNonEmpty(raw.device);
  const tree = parseForest(raw.tree);
  const authorities = parseAuthorities(raw.authorities);
  if (!moduleName || !device || !tree || !authorities || !isRecord(raw.meta)) {
    return { ok: false, errorCode: 'review.error.invalid' };
  }
  const removed = raw.meta.removed === undefined ? [] : parseForest(raw.meta.removed);
  if (!removed) return { ok: false, errorCode: 'review.error.invalid' };
  return { ok: true, menu: { schemaVersion: MENU_SCHEMA_VERSION, moduleName, device, tree, authorities, removed } };
}

export function actorIdFromKey(key: string): string {
  return key.startsWith('actor:') ? key.slice('actor:'.length) : key;
}

export function resolveSelectedActor(actors: ReviewActorOption[], selected: string): string {
  if (selected === REVIEW_ALL_ACTORS) return REVIEW_ALL_ACTORS;
  if (actors.some(actor => actor.key === selected)) return selected;
  return actors[0]?.key || REVIEW_ALL_ACTORS;
}

function toTree(nodes: MenuStampedNode[]): ReviewTreeNode[] {
  return nodes.map(node => ({
    id: node.id,
    kind: node.kind,
    label: node.label,
    action: node.action,
    children: node.kind === 'page' ? [] : toTree(node.children),
  }));
}

function walk(nodes: MenuStampedNode[], visit: (node: MenuStampedNode, ancestors: MenuStampedNode[]) => void, ancestors: MenuStampedNode[] = []): void {
  for (const node of nodes) {
    visit(node, ancestors);
    if (node.kind !== 'page') walk(node.children, visit, [...ancestors, node]);
  }
}

function addDescendants(node: MenuStampedNode, visible: Set<string>): void {
  if (node.kind === 'page') return;
  for (const child of node.children) {
    visible.add(child.id);
    addDescendants(child, visible);
  }
}

function filterVisible(nodes: MenuStampedNode[], visible: Set<string>): MenuStampedNode[] {
  const out: MenuStampedNode[] = [];
  for (const node of nodes) {
    if (!visible.has(node.id)) {
      if (node.kind !== 'page') out.push(...filterVisible(node.children, visible));
      continue;
    }
    if (node.kind === 'page') {
      out.push(node);
      continue;
    }
    out.push({ ...node, children: filterVisible(node.children, visible) });
  }
  return out;
}

export function menuTreeForActor(menu: ReviewMenu, actorKey: string): MenuStampedNode[] {
  if (actorKey === REVIEW_ALL_ACTORS) return menu.tree;
  const explicit = menu.authorities[actorKey] || [];
  const visible = new Set(explicit);
  walk(menu.tree, node => {
    if (visible.has(node.id)) addDescendants(node, visible);
  });
  const filtered = filterVisible(menu.tree, visible);
  const order = new Map(explicit.map((id, index) => [id, index]));
  return [...filtered].sort((left, right) => (order.get(left.id) ?? Number.POSITIVE_INFINITY) - (order.get(right.id) ?? Number.POSITIVE_INFINITY));
}

function indexNodes(nodes: MenuStampedNode[]): Map<string, MenuStampedNode> {
  const found = new Map<string, MenuStampedNode>();
  walk(nodes, node => {
    if (!found.has(node.id)) found.set(node.id, node);
  });
  return found;
}

function containsId(nodes: ReviewTreeNode[], id: string): boolean {
  return nodes.some(node => node.id === id || containsId(node.children, id));
}

export function toggleReviewSelection(
  selectedId: string,
  selectedScope: ReviewNodeScope,
  id: string,
  scope: ReviewNodeScope,
): { selectedId: string; selectedScope: ReviewNodeScope } {
  return selectedId === id && selectedScope === scope
    ? { selectedId: '', selectedScope: scope }
    : { selectedId: id, selectedScope: scope };
}

export function reviewExpansionKey(scope: ReviewNodeScope, id: string): string {
  return `${scope}:${id}`;
}

function ancestorIds(nodes: ReviewTreeNode[], id: string): string[] {
  const found: string[] = [];
  const walk = (list: ReviewTreeNode[], trail: string[]): boolean => {
    for (const node of list) {
      if (node.id === id) {
        found.push(...trail);
        return true;
      }
      if (node.children.length && walk(node.children, [...trail, node.id])) return true;
    }
    return false;
  };
  walk(nodes, []);
  return found;
}

export function openReviewExpansionKeys(expandedKeys: readonly string[], view: ReviewView): Set<string> {
  const keys = new Set(expandedKeys);
  const forest = view.selectedScope === 'removed' ? view.removed : view.tree;
  for (const id of ancestorIds(forest, view.selectedId)) keys.add(reviewExpansionKey(view.selectedScope, id));
  return keys;
}

export function toggleReviewExpansion(
  expandedKeys: readonly string[],
  view: ReviewView,
  id: string,
  scope: ReviewNodeScope,
): ReviewExpansionState {
  const key = reviewExpansionKey(scope, id);
  const wasOpen = openReviewExpansionKeys(expandedKeys, view).has(key);
  const forest = scope === 'removed' ? view.removed : view.tree;
  const closesSelectedAncestor = wasOpen && view.selectedScope === scope && ancestorIds(forest, view.selectedId).includes(id);
  return {
    expandedKeys: wasOpen ? expandedKeys.filter(item => item !== key) : [...expandedKeys, key],
    selectedId: closesSelectedAncestor ? '' : view.selectedId,
  };
}

function detailOf(node: MenuStampedNode, scope: ReviewNodeScope): ReviewNodeDetail {
  return {
    id: node.id,
    kind: node.kind,
    label: node.label,
    action: node.action,
    scope,
    text: node.kind === 'page' ? '' : node.text,
    context: node.kind === 'hub' ? node.context : '',
    organisms: node.kind === 'page' ? node.organisms : [],
  };
}

const EMPTY_VIEW: Omit<ReviewView, 'kind' | 'errorCode' | 'showContinue' | 'showCalculate'> = {
  actors: [],
  selectedActor: REVIEW_ALL_ACTORS,
  selectedId: '',
  selectedScope: 'future',
  tree: [],
  removed: [],
  selected: null,
};

export function buildReviewView(input: ReviewInput): ReviewView {
  if (input.pendingCount > 0) {
    return {
      ...EMPTY_VIEW,
      kind: 'pending',
      errorCode: '',
      showContinue: false,
      showCalculate: true,
    };
  }
  if (input.readStatus === 'missing') {
    return {
      ...EMPTY_VIEW,
      kind: 'empty',
      errorCode: 'review.emptyBody',
      showContinue: false,
      showCalculate: false,
    };
  }
  if (input.readStatus === 'invalid') {
    return {
      ...EMPTY_VIEW,
      kind: 'invalid',
      errorCode: 'review.error.invalid',
      showContinue: false,
      showCalculate: false,
    };
  }
  const parsed = parseReviewMenu(input.raw);
  if (!parsed.ok) {
    return {
      ...EMPTY_VIEW,
      kind: 'invalid',
      errorCode: parsed.errorCode,
      showContinue: false,
      showCalculate: false,
    };
  }
  const actors = Object.keys(parsed.menu.authorities).map(key => ({ key, actorId: actorIdFromKey(key) }));
  const selectedActor = resolveSelectedActor(actors, input.selectedActor);
  const future = menuTreeForActor(parsed.menu, selectedActor);
  const tree = toTree(future);
  const removed = selectedActor === REVIEW_ALL_ACTORS ? toTree(parsed.menu.removed) : [];
  const futureIndex = indexNodes(future);
  const removedIndex = selectedActor === REVIEW_ALL_ACTORS ? indexNodes(parsed.menu.removed) : new Map<string, MenuStampedNode>();
  let selectedScope = input.selectedScope;
  let selectedId = input.selectedId;
  if (selectedScope === 'removed' && !containsId(removed, selectedId)) {
    selectedScope = 'future';
    selectedId = '';
  }
  if (selectedScope === 'future' && !containsId(tree, selectedId)) selectedId = '';
  const selectedNode = selectedScope === 'removed' ? removedIndex.get(selectedId) : futureIndex.get(selectedId);
  return {
    kind: 'ready',
    errorCode: '',
    actors,
    selectedActor,
    selectedId,
    selectedScope,
    tree,
    removed,
    selected: selectedNode ? detailOf(selectedNode, selectedScope) : null,
    showContinue: true,
    showCalculate: false,
  };
}
