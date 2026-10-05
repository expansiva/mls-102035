/// <mls fileReference="_102035_/l2/newRelease/widgets/backendReviewModel.ts" enhancement="_blank" />

import type { ReviewArtifactRead } from '/_102035_/l2/newRelease/helpers/backendReader.js';
import {
  POOL_BACKEND_SCHEMA_VERSION,
  POOL_EFFORT_SCHEMA_VERSION,
  POOL_PLAN_STATUSES,
  POOL_TEST_SUPPORT_OWNERS,
  type PoolEffortTotals,
  type PoolPlanStatus,
  type PoolTestSupportItem,
  type PoolTestSupportOwner,
} from '/_102035_/l2/solution/poolPlan.js';

export type BackendItemKind = 'table' | 'usecase' | 'port' | 'endpoint' | 'removed' | 'change' | 'unmapped';
export type BackendTone = 'new' | 'change' | 'keep' | 'remove' | 'unknown';

export interface BackendItem {
  id: string;
  kind: BackendItemKind;
  label: string;
  status: string;
  tone: BackendTone;
  entity: string;
  reason: string;
  source: string;
  tableRefs: string[];
  noTable: string;
  usecaseRefs: string[];
  detail: string;
}

export interface BackendTableGroup {
  tableId: string;
  entity: string;
  items: BackendItem[];
}

export interface BackendTestSupportStatusGroup {
  status: PoolPlanStatus;
  items: PoolTestSupportItem[];
}

export interface BackendTestSupportOwnerGroup {
  owner: PoolTestSupportOwner;
  groups: BackendTestSupportStatusGroup[];
}

export interface BackendReviewView {
  kind: 'missing' | 'invalid' | 'stale' | 'ready';
  errorCode: string;
  schemaVersion: string;
  moduleName: string;
  groups: BackendTableGroup[];
  shared: BackendItem[];
  unassociated: BackendItem[];
  itemCount: number;
  testSupport: BackendTestSupportOwnerGroup[];
}

export interface EffortCount {
  category: 'screens' | 'endpoints' | 'usecases' | 'tables';
  statuses: Array<{ status: string; count: number }>;
}

export interface EffortSummary {
  kind: 'missing' | 'invalid' | 'counts';
  counts: EffortCount[];
  totals: PoolEffortTotals;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function string(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function strings(value: unknown): string[] | null {
  return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : null;
}

function items(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const EMPTY_TOTALS: PoolEffortTotals = {
  screens: { toCreate: 0, toUpdate: 0, toRemove: 0, done: 0 },
  endpoints: { toCreate: 0, toUpdate: 0, toRemove: 0, done: 0 },
  usecases: { toCreate: 0, toUpdate: 0, toRemove: 0, done: 0 },
  tables: { toCreate: 0, toUpdate: 0, toRemove: 0, done: 0 },
};

export function backendTone(status: string, changeOp = false): BackendTone {
  if (changeOp) {
    if (status === 'added') return 'new';
    if (status === 'changed') return 'change';
    if (status === 'removed') return 'remove';
    return 'unknown';
  }
  if (status === 'toCreate') return 'new';
  if (status === 'toUpdate') return 'change';
  if (status === 'done') return 'keep';
  if (status === 'toRemove') return 'remove';
  return 'unknown';
}

const EMPTY: Omit<BackendReviewView, 'kind' | 'errorCode'> = {
  schemaVersion: '', moduleName: '', groups: [], shared: [], unassociated: [], itemCount: 0, testSupport: [],
};

function invalid(errorCode = 'review.backend.invalid'): BackendReviewView {
  return { ...EMPTY, kind: 'invalid', errorCode };
}

function tableRefsOf(row: Record<string, unknown>): { refs: string[]; noTable: string } | null {
  const refs = strings(row.tableRefs);
  const noTable = string(row.noTable);
  if (!refs || !['ok', 'mdm', 'none'].includes(noTable) || (refs.length > 0) !== (noTable === 'ok')) return null;
  return { refs: [...new Set(refs)], noTable };
}

function testSupportItem(value: unknown): PoolTestSupportItem | null {
  const row = record(value);
  if (!row) return null;
  const actorRefs = strings(row.actorRefs);
  const entityRefs = strings(row.entityRefs);
  const sourceRefs = strings(row.sourceRefs);
  const status = string(row.status);
  const owner = string(row.owner);
  const id = string(row.id);
  if (!id || !actorRefs || !entityRefs || !sourceRefs) return null;
  if (!POOL_PLAN_STATUSES.includes(status as PoolPlanStatus)) return null;
  if (!POOL_TEST_SUPPORT_OWNERS.includes(owner as PoolTestSupportOwner)) return null;
  if (typeof row.executorRef !== 'string' || typeof row.cleanupRef !== 'string' || typeof row.gap !== 'string') return null;
  return {
    id, actorRefs, entityRefs, sourceRefs,
    status: status as PoolPlanStatus,
    owner: owner as PoolTestSupportOwner,
    executorRef: row.executorRef,
    cleanupRef: row.cleanupRef,
    gap: row.gap,
  };
}

function groupTestSupport(items: PoolTestSupportItem[]): BackendTestSupportOwnerGroup[] {
  const groups: BackendTestSupportOwnerGroup[] = [];
  for (const owner of POOL_TEST_SUPPORT_OWNERS) {
    const owned = items.filter(item => item.owner === owner);
    if (!owned.length) continue;
    const byStatus: BackendTestSupportStatusGroup[] = [];
    for (const status of POOL_PLAN_STATUSES) {
      const statusItems = owned.filter(item => item.status === status);
      if (statusItems.length) byStatus.push({ status, items: statusItems });
    }
    groups.push({ owner, groups: byStatus });
  }
  return groups;
}

/** Group only producer-provided references. Rows without them stay explicitly unassociated. */
export function buildBackendReview(read: ReviewArtifactRead, stale = false, expectedModuleName = ''): BackendReviewView {
  if (stale) return { ...EMPTY, kind: 'stale', errorCode: '' };
  if (read.status === 'missing') return { ...EMPTY, kind: 'missing', errorCode: '' };
  if (read.status === 'invalid') return invalid();
  const raw = record(read.value);
  if (!raw) return invalid();
  const schema = string(raw.schemaVersion);
  if (schema !== POOL_BACKEND_SCHEMA_VERSION) return invalid('review.backend.schema');
  const moduleName = string(raw.moduleName);
  if (!moduleName) return invalid();
  if (raw.device !== 'web' || (expectedModuleName && moduleName !== expectedModuleName)) return invalid('review.backend.context');
  const arrays = ['tables', 'usecases', 'ports', 'endpoints', 'removed', 'changes', 'testSupport'] as const;
  if (arrays.some(name => !Array.isArray(raw[name]))) return invalid();
  const tables = (raw.tables as unknown[]).map(record);
  if (tables.some(table => !table || !string(table.tableId) || !string(table.entity))) return invalid();
  const groups = tables.map(table => ({ tableId: string(table!.tableId), entity: string(table!.entity), items: [] as BackendItem[] }));
  for (const value of raw.removed as unknown[]) {
    const item = record(value);
    const id = string(item?.id);
    if (item?.kind === 'table' && id && strings(item.tableRefs)?.includes(id) && !groups.some(group => group.tableId === id)) {
      groups.push({ tableId: id, entity: '', items: [] });
    }
  }
  const groupById = new Map(groups.map(group => [group.tableId, group]));
  if (groupById.size !== groups.length) return invalid();
  const usecases = (raw.usecases as unknown[]).map(record);
  if (usecases.some(item => !item || !string(item.usecaseId))) return invalid();
  if (new Set(usecases.map(item => string(item!.usecaseId))).size !== usecases.length) return invalid();
  const support: PoolTestSupportItem[] = [];
  for (const value of raw.testSupport as unknown[]) {
    const item = testSupportItem(value);
    if (!item) return invalid();
    support.push(item);
  }
  const meta = record(raw.meta);
  const unmappedChanges: Array<{ changeId: string; kind: string; source: string }> = [];
  if (Array.isArray(meta?.unmappedChanges)) {
    for (const value of meta.unmappedChanges) {
      const item = record(value);
      const id = string(item?.changeId);
      if (!item || !id) return invalid();
      unmappedChanges.push({ changeId: id, kind: string(item.kind), source: string(item.source) });
    }
  }
  const rows: BackendItem[] = [];
  const add = (kind: BackendItemKind, row: Record<string, unknown>, id: string, label: string, entity: string, detail = ''): boolean => {
    if (!id) return false;
    const relation = tableRefsOf(row);
    if (!relation) return false;
    const status = string(kind === 'change' ? row.op : row.status);
    rows.push({
      id: `${kind}:${id}`, kind, label, status, tone: backendTone(status, kind === 'change'), entity,
      reason: string(row.reason), source: string(row.source), tableRefs: relation.refs, noTable: relation.noTable,
      usecaseRefs: strings(row.usecaseRefs) ?? [], detail,
    });
    return true;
  };
  for (const value of items(raw.tables)) {
    const row = record(value);
    const id = string(row?.tableId);
    if (!row || !id || !add('table', row, id, string(row.entity), string(row.entity), id)) return invalid();
  }
  for (const value of items(raw.usecases)) {
    const row = record(value);
    const id = string(row?.usecaseId);
    if (!row || !id || !add('usecase', row, id, id, string(row.entity), string(row.operation))) return invalid();
  }
  for (const value of items(raw.ports)) {
    const row = record(value);
    const id = string(row?.portId);
    if (!row || !id || !add('port', row, id, id, string(row.entity))) return invalid();
  }
  for (const value of items(raw.endpoints)) {
    const row = record(value);
    const id = string(row?.route);
    if (!row || !id || !add('endpoint', row, id, id, '', string(row.usecaseRef))) return invalid();
  }
  for (const value of items(raw.removed)) {
    const row = record(value);
    const id = string(row?.id);
    if (!row || !id || !add('removed', row, id, id, '', string(row.kind))) return invalid();
  }
  const seenChangeIds = new Set<string>();
  for (const value of items(raw.changes)) {
    const row = record(value);
    const id = string(row?.changeId);
    if (!row || !id || seenChangeIds.has(id)) return invalid();
    seenChangeIds.add(id);
    if (!add('change', row, id, id, string(row.entity), string(row.kind))) return invalid();
  }
  for (const item of unmappedChanges) {
    rows.push({ id: `unmapped:${item.changeId}`, kind: 'unmapped', label: item.changeId, status: '', tone: 'unknown', entity: '', reason: '',
      source: item.source, tableRefs: [], noTable: 'unmapped', usecaseRefs: [], detail: item.kind });
  }
  const shared: BackendItem[] = [];
  const unassociated: BackendItem[] = [];
  for (const item of rows) {
    if (item.tableRefs.length > 1) shared.push(item);
    else if (item.tableRefs.length === 1 && groupById.has(item.tableRefs[0])) groupById.get(item.tableRefs[0])!.items.push(item);
    else unassociated.push(item);
  }
  return {
    kind: 'ready', errorCode: '', schemaVersion: schema, moduleName, groups, shared, unassociated,
    itemCount: rows.length, testSupport: groupTestSupport(support),
  };
}

function invalidEffort(): EffortSummary {
  return { kind: 'invalid', counts: [], totals: EMPTY_TOTALS };
}

export function parseEffortSummary(read: ReviewArtifactRead, expectedModuleName = ''): EffortSummary {
  if (read.status === 'missing') return { kind: 'missing', counts: [], totals: EMPTY_TOTALS };
  if (read.status === 'invalid') return invalidEffort();
  const raw = record(read.value);
  const totals = record(raw?.totals);
  const moduleName = typeof raw?.moduleName === 'string' && raw.moduleName.trim() ? raw.moduleName : '';
  if (raw?.schemaVersion !== POOL_EFFORT_SCHEMA_VERSION || raw?.device !== 'web' || !moduleName || !totals
    || (expectedModuleName && moduleName !== expectedModuleName)) return invalidEffort();
  const categories = ['screens', 'endpoints', 'usecases', 'tables'] as const;
  const statuses = ['toCreate', 'toUpdate', 'toRemove', 'done'] as const;
  if (Object.keys(totals).length !== categories.length || Object.keys(totals).some(category => !categories.includes(category as typeof categories[number]))) {
    return invalidEffort();
  }
  const counts: EffortCount[] = [];
  const parsedTotals: PoolEffortTotals = {
    screens: { toCreate: 0, toUpdate: 0, toRemove: 0, done: 0 },
    endpoints: { toCreate: 0, toUpdate: 0, toRemove: 0, done: 0 },
    usecases: { toCreate: 0, toUpdate: 0, toRemove: 0, done: 0 },
    tables: { toCreate: 0, toUpdate: 0, toRemove: 0, done: 0 },
  };
  for (const category of categories) {
    const values = record(totals[category]);
    if (!values || Object.keys(values).length !== statuses.length
      || Object.keys(values).some(status => !statuses.includes(status as typeof statuses[number]))) return invalidEffort();
    const parsed: Array<{ status: string; count: number }> = [];
    for (const status of statuses) {
      const count = values[status];
      if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) return invalidEffort();
      parsed.push({ status, count });
    }
    counts.push({ category, statuses: parsed });
    parsedTotals[category] = {
      toCreate: parsed[0].count,
      toUpdate: parsed[1].count,
      toRemove: parsed[2].count,
      done: parsed[3].count,
    };
  }
  return { kind: 'counts', counts, totals: parsedTotals };
}
