/// <mls fileReference="_102035_/l2/solution/poolPlan.ts" enhancement="_blank"/>

/**
 * One type per plan file of the pool (the pool contract is the l4's): the shape each producer writes today.
 * Producers and readers import from here; a reader that ignores fields uses `Pick`, a reader that
 * normalizes from disk uses `PoolRaw`. A field only one side declares stays out and is a divergence.
 *
 * - `pool/l2/web/menu.json`   — producer agentPlannerL2 menu20
 * - `pool/l1/web/needs.json`  — producer agentPlannerL2 needs30
 * - `pool/l2/web/backend.json` — producer agentPlannerL1 plan20
 * - `pool/l2/web/effort.json` — producer agentPlannerL2 effort40
 * - `pool/l4/l4diff.json` — producer agentPlannerL4 plDiff
 * - `pool/l4/changeEffort.json` — producer agentPlannerL4 (p4_34)
 */

/** A plan file as read from disk, before the reader's own normalization: known keys, unknown values. */
export type PoolRaw<T> = { [K in keyof T]?: unknown };

export const POOL_DEVICES = ['web'] as const;
export type PoolDevice = typeof POOL_DEVICES[number];

/** Plan status shared by backend.json and effort.json. */
export const POOL_PLAN_STATUSES = ['toCreate', 'toUpdate', 'toRemove', 'done'] as const;
export type PoolPlanStatus = typeof POOL_PLAN_STATUSES[number];

/** Endpoint kind shared by backend.json and effort.json. */
export const POOL_ENDPOINT_KINDS = ['qry', 'cmd'] as const;
export type PoolEndpointKind = typeof POOL_ENDPOINT_KINDS[number];

export const POOL_TEST_SUPPORT_OWNERS = ['L1', 'runtime'] as const;
export type PoolTestSupportOwner = typeof POOL_TEST_SUPPORT_OWNERS[number];

// ---------------------------------------------------------------- menu.json

export const MENU_SCHEMA_VERSION = '2026-09-20-p2-menu-v2.2' as const;
export const MENU_NODE_KINDS = ['hub', 'page', 'group'] as const;
export type MenuNodeKind = typeof MENU_NODE_KINDS[number];
export const MENU_ORGANISM_KINDS = [
  'list', 'detail', 'form', 'summary', 'highlights', 'timeline', 'actions', 'inbox', 'alerts',
] as const;
export type MenuOrganismKind = typeof MENU_ORGANISM_KINDS[number];
export const MENU_ACTIONS = ['new', 'change', 'keep', 'remove'] as const;
export type MenuAction = typeof MENU_ACTIONS[number];

export interface MenuOrganism {
  kind: MenuOrganismKind;
  text: string;
}

export interface MenuHubNode {
  id: string;
  kind: 'hub';
  label: string;
  context: string;
  text: string;
  children: MenuNode[];
}

export interface MenuPageNode {
  id: string;
  kind: 'page';
  label: string;
  organisms: MenuOrganism[];
}

export interface MenuGroupNode {
  id: string;
  kind: 'group';
  label: string;
  text: string;
  children: MenuNode[];
}

export type MenuNode = MenuHubNode | MenuPageNode | MenuGroupNode;

export type MenuStampedHubNode = Omit<MenuHubNode, 'children'> & {
  action: MenuAction;
  children: MenuStampedNode[];
};
export type MenuStampedPageNode = MenuPageNode & { action: MenuAction };
export type MenuStampedGroupNode = Omit<MenuGroupNode, 'children'> & {
  action: MenuAction;
  children: MenuStampedNode[];
};
export type MenuStampedNode = MenuStampedHubNode | MenuStampedPageNode | MenuStampedGroupNode;

export interface PoolMenuMeta {
  journeys: Record<string, string[]>;
  processes: Record<string, string[]>;
  /** Kept record (entityId from recordsKept) → pages that maintain it. Read by needs30. */
  records: Record<string, string[]>;
}

export interface PoolMenuFileMeta extends PoolMenuMeta {
  removed: MenuStampedNode[];
}

export interface PoolMenuFile {
  schemaVersion: typeof MENU_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  device: PoolDevice;
  tree: MenuStampedNode[];
  authorities: Record<string, string[]>;
  meta: PoolMenuFileMeta;
}

// ---------------------------------------------------------------- needs.json

export const POOL_NEEDS_SCHEMA_VERSION = '2026-09-21-p2-needs-v1' as const;
export const POOL_NEEDS_OPERATIONS = ['create', 'update', 'transition', 'delete'] as const;
export type PoolNeedsOperation = typeof POOL_NEEDS_OPERATIONS[number];
export const POOL_NEEDS_SCOPES = ['own', 'related', 'organization'] as const;
export type PoolNeedsScope = typeof POOL_NEEDS_SCOPES[number];
export const POOL_NEEDS_FAMILIES = ['mdm', 'ddm', 'tdm'] as const;
export type PoolNeedsFamily = typeof POOL_NEEDS_FAMILIES[number];

export interface PoolNeedsRead {
  entity: string;
  family: PoolNeedsFamily;
  scope: PoolNeedsScope;
  derived: string[];
  from: string[];
}

export interface PoolNeedsWrite {
  entity: string;
  operation: PoolNeedsOperation;
  transitionRef: string;
  from: string[];
}

export interface PoolNeedsPage {
  pageId: string;
  actors: string[];
  reads: PoolNeedsRead[];
  writes: PoolNeedsWrite[];
}

export interface PoolNeedsFile {
  schemaVersion: typeof POOL_NEEDS_SCHEMA_VERSION;
  moduleName: string;
  device: PoolDevice;
  menuSchema: typeof MENU_SCHEMA_VERSION;
  pages: PoolNeedsPage[];
  meta: { sourceMenu: string; generatedAt: string };
}

// ---------------------------------------------------------------- backend.json

export const POOL_BACKEND_SCHEMA_VERSION = '2026-09-21-p1-backend-v1.2' as const;
export const POOL_BACKEND_OPERATIONS = ['list', 'get', 'create', 'update', 'transition', 'delete', 'custom'] as const;
export type PoolBackendOperation = typeof POOL_BACKEND_OPERATIONS[number];
export const POOL_BACKEND_REMOVED_KINDS = ['usecase', 'port', 'table'] as const;
export type PoolBackendRemovedKind = typeof POOL_BACKEND_REMOVED_KINDS[number];
export const POOL_NO_TABLE = ['ok', 'mdm', 'none'] as const;
export type PoolNoTable = typeof POOL_NO_TABLE[number];
export const POOL_CHANGE_KINDS = ['field', 'rule', 'grant', 'transition', 'process', 'integration', 'entity'] as const;
export type PoolChangeKind = typeof POOL_CHANGE_KINDS[number];
export const POOL_CHANGE_OPS = ['added', 'changed', 'removed'] as const;
export type PoolChangeOp = typeof POOL_CHANGE_OPS[number];

/**
 * One unit of test preparation (data, identity, cleanup). Not a grant nor a rule.
 * `executorRef` / `cleanupRef` stay `''` until an owner references a verified capability;
 * then `gap` names what is missing. Same item in backend.json and effort.json.
 */
export interface PoolTestSupportItem {
  id: string;
  actorRefs: string[];
  entityRefs: string[];
  sourceRefs: string[];
  status: PoolPlanStatus;
  owner: PoolTestSupportOwner;
  executorRef: string;
  cleanupRef: string;
  gap: string;
}

export interface PoolBackendEndpoint {
  route: string;
  page: string;
  kind: PoolEndpointKind;
  usecaseRef: string;
  status: PoolPlanStatus;
  tableRefs: string[];
  noTable: PoolNoTable;
}

export interface PoolBackendUsecase {
  usecaseId: string;
  entity: string;
  operation: PoolBackendOperation;
  /** L4 `transitionId`. Present only when `operation` is `transition`. */
  transitionRef?: string;
  ports: string[];
  status: PoolPlanStatus;
  existing: string;
  reason: string;
  tableRefs: string[];
  noTable: PoolNoTable;
}

export interface PoolBackendPort {
  portId: string;
  entity: string;
  status: PoolPlanStatus;
  tableRefs: string[];
  noTable: PoolNoTable;
}

export interface PoolBackendTable {
  tableId: string;
  entity: string;
  status: PoolPlanStatus;
  tableRefs: string[];
  noTable: PoolNoTable;
}

export interface PoolBackendRemoved {
  kind: PoolBackendRemovedKind;
  id: string;
  status: 'toRemove';
  reason: string;
  tableRefs: string[];
  noTable: PoolNoTable;
}

export interface PoolBackendChange {
  changeId: string;
  kind: PoolChangeKind;
  op: PoolChangeOp;
  entity: string;
  tableRefs: string[];
  noTable: PoolNoTable;
  usecaseRefs: string[];
  reason: string;
  source: string;
}

export interface PoolUnmappedChange {
  changeId: string;
  kind: string;
  source: string;
}

export interface PoolBackendFile {
  schemaVersion: typeof POOL_BACKEND_SCHEMA_VERSION;
  moduleName: string;
  device: PoolDevice;
  sourceNeeds: string;
  inventoryPresent: boolean;
  endpoints: PoolBackendEndpoint[];
  usecases: PoolBackendUsecase[];
  ports: PoolBackendPort[];
  tables: PoolBackendTable[];
  removed: PoolBackendRemoved[];
  changes: PoolBackendChange[];
  testSupport: PoolTestSupportItem[];
  meta: {
    pages: Record<string, string[]>;
    generatedAt: string;
    llmCalled: boolean;
    unmappedChanges: PoolUnmappedChange[];
  };
}

// ---------------------------------------------------------------- effort.json

export const POOL_EFFORT_SCHEMA_VERSION = '2026-09-21-p2-effort-v1.2' as const;
export const POOL_EFFORT_REMOVED_KINDS = ['endpoint', 'usecase', 'table'] as const;
export type PoolEffortRemovedKind = typeof POOL_EFFORT_REMOVED_KINDS[number];

export interface PoolEffortTotalsBucket {
  toCreate: number;
  toUpdate: number;
  toRemove: number;
  done: number;
}

export interface PoolEffortTotals {
  screens: PoolEffortTotalsBucket;
  endpoints: PoolEffortTotalsBucket;
  usecases: PoolEffortTotalsBucket;
  tables: PoolEffortTotalsBucket;
}

export interface PoolEffortScreen {
  pageId: string;
  label: string;
  actors: string[];
  status: PoolPlanStatus;
  endpoints: string[];
}

export interface PoolEffortEndpoint {
  route: string;
  page: string;
  kind: PoolEndpointKind;
  usecaseRef: string;
  status: PoolPlanStatus;
}

export interface PoolEffortUsecase {
  usecaseId: string;
  entity: string;
  operation: string;
  status: PoolPlanStatus;
  existing: string;
}

export interface PoolEffortTable {
  tableId: string;
  entity: string;
  status: PoolPlanStatus;
}

export interface PoolEffortRemoved {
  kind: PoolEffortRemovedKind;
  id: string;
  status: 'toRemove';
}

/** l4diff item that did not reach any page. Reader: the person, in this JSON. */
export interface PoolEffortUnattributed {
  changeId: string;
  kind: string;
  op: string;
  reason: string;
}

export interface PoolEffortFile {
  schemaVersion: typeof POOL_EFFORT_SCHEMA_VERSION;
  moduleName: string;
  device: PoolDevice;
  totals: PoolEffortTotals;
  screens: PoolEffortScreen[];
  endpoints: PoolEffortEndpoint[];
  usecases: PoolEffortUsecase[];
  tables: PoolEffortTable[];
  removed: PoolEffortRemoved[];
  testSupport: PoolTestSupportItem[];
  unattributed: PoolEffortUnattributed[];
  meta: { sourceMenu: string; sourceBackend: string; sourceVersion: string; generatedAt: string };
}

// ---------------------------------------------------------------- l4diff.json

/** Identity of a sealed revision, recorded on the L4 pipeline and both l4diff files. */
export interface PlRevisionIdentity {
  changeId: string;
  revisionId: string;
  baseId: string;
  /** `sha256:` of `manifest.files` JSON with keys sorted. Same digest as `sha256Tobe`. */
  manifestHash: string;
}

export const L4_DIFF_SCHEMA = '2026-09-21-p4-l4diff-v1' as const;

export const L4_DIFF_OPS = ['added', 'changed', 'removed'] as const;
export type L4DiffOp = (typeof L4_DIFF_OPS)[number];

export const L4_DIFF_KINDS = [
  'entity', 'field', 'transition', 'rule', 'grant', 'process', 'task', 'inbound', 'outbound',
] as const;
export type L4DiffKind = (typeof L4_DIFF_KINDS)[number];

export interface L4DiffItem {
  changeId: string;
  kind: L4DiffKind;
  op: L4DiffOp;
  entity: string;
  source: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Prose on a v3 field and on an enum value (`Ns5OntologyFieldV3` / `Ns5OntologyValueV3`):
 * `title` and `description` only. `type`, `derived`, `required` and the value code are not text.
 * `values` is not in this list: a label edit is text, an added or removed code is not.
 */
export const L4_TEXT_ATTRIBUTES = ['title', 'description'] as const;
export type L4TextAttribute = (typeof L4_TEXT_ATTRIBUTES)[number];

function isL4TextAttribute(key: string): key is L4TextAttribute {
  return (L4_TEXT_ATTRIBUTES as readonly string[]).includes(key);
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function enumValueEntry(value: unknown): { code: string; attrs: Record<string, unknown> } | undefined {
  if (typeof value === 'string') return { code: value, attrs: { value } };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const attrs = value as Record<string, unknown>;
  if (typeof attrs.value !== 'string') return undefined;
  return { code: attrs.value, attrs };
}

/** Same codes; every differing key on a value is a text attribute. */
function enumValuesTextOnly(before: unknown, after: unknown): boolean {
  if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) return false;
  const beforeByCode = new Map<string, Record<string, unknown>>();
  const afterByCode = new Map<string, Record<string, unknown>>();
  for (const raw of before) {
    const entry = enumValueEntry(raw);
    if (!entry || beforeByCode.has(entry.code)) return false;
    beforeByCode.set(entry.code, entry.attrs);
  }
  for (const raw of after) {
    const entry = enumValueEntry(raw);
    if (!entry || afterByCode.has(entry.code)) return false;
    afterByCode.set(entry.code, entry.attrs);
  }
  if (beforeByCode.size !== afterByCode.size) return false;
  for (const [code, beforeAttrs] of beforeByCode) {
    const afterAttrs = afterByCode.get(code);
    if (!afterAttrs) return false;
    const keys = new Set([...Object.keys(beforeAttrs), ...Object.keys(afterAttrs)]);
    for (const key of keys) {
      if (sameJson(beforeAttrs[key], afterAttrs[key])) continue;
      if (!isL4TextAttribute(key)) return false;
    }
  }
  return true;
}

/** True only for a `field` `changed` item whose every difference is text (field or enum label). */
export function isTextOnlyChange(item: L4DiffItem): boolean {
  if (item.kind !== 'field' || item.op !== 'changed') return false;
  const before = item.before;
  const after = item.after;
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return false;
  if (Array.isArray(before) || Array.isArray(after)) return false;
  const beforeRecord = before as Record<string, unknown>;
  const afterRecord = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]);
  for (const key of keys) {
    if (sameJson(beforeRecord[key], afterRecord[key])) continue;
    if (key === 'values') {
      if (!enumValuesTextOnly(beforeRecord[key], afterRecord[key])) return false;
      continue;
    }
    if (!isL4TextAttribute(key)) return false;
  }
  return true;
}

export interface L4Diff {
  schemaVersion: typeof L4_DIFF_SCHEMA;
  moduleName: string;
  base: string;
  candidate: string;
  /** Null on a canonical run and on a manual root (`tobe/plan`). */
  revision: PlRevisionIdentity | null;
  items: L4DiffItem[];
}

// ---------------------------------------------------------------- changeEffort.json

export const CHANGE_EFFORT_SCHEMA_VERSION = '2026-10-08-p4-change-effort-v1' as const;

export const EFFORT_UNIT_KINDS = ['page', 'route', 'usecase', 'entity', 'request', 'table', 'shared', 'contract'] as const;
export const EFFORT_MASTER_KINDS = ['l2', 'l1'] as const;
export const EFFORT_ANSWER_STATUSES = ['computed', 'abend'] as const;
export const CHANGE_EFFORT_STATUSES = ['simple', 'blocked'] as const;

export interface EffortUnitRef {
  kind: (typeof EFFORT_UNIT_KINDS)[number];
  id: string;
  /** Product def that identifies the unit, relative to the master's project, with the level prefix. Not the materialized file and not a folder. L1: the unit `.defs.ts`. L2 `page`: `l2/<mod>/web/contracts/<pageId>.defs.ts`; shared and page11 follow from `pageId`. */
  path: string;
}

export interface EffortAgentRef {
  agent: string;
  command: string;
}

export interface EffortMaster {
  project: string;
  kind: (typeof EFFORT_MASTER_KINDS)[number];
  device: PoolDevice;
}

/** What each master `describeEffort` receives. How imports this; it does not copy the type. */
export interface EffortInput {
  module: string;
  base: { baseId: string; revisionId: string };
  item: L4DiffItem;
}

export interface EffortAnswer {
  master: EffortMaster;
  item: string;
  status: (typeof EFFORT_ANSWER_STATUSES)[number];
  regenerateDefs: EffortUnitRef[];
  materialize: EffortUnitRef[];
  runAgents: EffortAgentRef[];
  abend?: { reason: string };
}

export interface ChangeEffortMerged {
  regenerateDefs: Array<EffortUnitRef & { project: string }>;
  materialize: Array<EffortUnitRef & { project: string }>;
  runAgents: EffortAgentRef[];
  abend: Array<{ item: string; master: EffortMaster; reason: string }>;
}

export interface ChangeEffortFile {
  schemaVersion: typeof CHANGE_EFFORT_SCHEMA_VERSION;
  module: string;
  base: { baseId: string; revisionId: string; candidateRoot: string };
  request: { text: string; items: L4DiffItem[] };
  masters: EffortMaster[];
  perItem: Array<{ item: string; answers: EffortAnswer[] }>;
  merged: ChangeEffortMerged;
  untouched: { count: number; sealHash: string };
  status: (typeof CHANGE_EFFORT_STATUSES)[number];
}
