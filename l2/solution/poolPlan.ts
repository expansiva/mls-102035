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
