/// <mls fileReference="_102035_/l2/newRelease/widgets/backendReviewModel.ts" enhancement="_blank" />

import type { ReviewArtifactRead } from '/_102035_/l2/newRelease/helpers/backendReader.js';

export const BACKEND_SCHEMA_V11 = '2026-09-21-p1-backend-v1.1';
export const BACKEND_SCHEMA_V1 = '2026-09-21-p1-backend-v1';
export const EFFORT_SCHEMA_V1 = '2026-09-21-p2-effort-v1';

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

export interface BackendReviewView {
  kind: 'missing' | 'invalid' | 'stale' | 'ready';
  errorCode: string;
  schemaVersion: string;
  moduleName: string;
  groups: BackendTableGroup[];
  shared: BackendItem[];
  unassociated: BackendItem[];
  itemCount: number;
}

export interface EffortCount {
  category: 'screens' | 'endpoints' | 'usecases' | 'tables';
  statuses: Array<{ status: string; count: number }>;
}

export interface EffortSummary {
  kind: 'missing' | 'invalid' | 'counts';
  counts: EffortCount[];
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
  schemaVersion: '', moduleName: '', groups: [], shared: [], unassociated: [], itemCount: 0,
};

function invalid(errorCode = 'review.backend.invalid'): BackendReviewView {
  return { ...EMPTY, kind: 'invalid', errorCode };
}

function tableRefsOf(row: Record<string, unknown>, legacy: boolean, fallbackEntity: string, byEntity: Map<string, string[]>): { refs: string[]; noTable: string } | null {
  if (!legacy) {
    const refs = strings(row.tableRefs);
    const noTable = string(row.noTable);
    if (!refs || !['ok', 'mdm', 'none'].includes(noTable) || (refs.length > 0) !== (noTable === 'ok')) return null;
    return { refs: [...new Set(refs)], noTable };
  }
  const matches = byEntity.get(fallbackEntity) ?? [];
  return { refs: matches.length === 1 ? [matches[0]] : [], noTable: 'legacy' };
}

/** Group only producer-provided references, with a narrow, unambiguous v1 fallback. */
export function buildBackendReview(read: ReviewArtifactRead, stale = false, expectedModuleName = ''): BackendReviewView {
  if (stale) return { ...EMPTY, kind: 'stale', errorCode: '' };
  if (read.status === 'missing') return { ...EMPTY, kind: 'missing', errorCode: '' };
  if (read.status === 'invalid') return invalid();
  const raw = record(read.value);
  if (!raw) return invalid();
  const schema = string(raw.schemaVersion);
  if (schema !== BACKEND_SCHEMA_V11 && schema !== BACKEND_SCHEMA_V1) return invalid('review.backend.schema');
  const legacy = schema === BACKEND_SCHEMA_V1;
  const moduleName = string(raw.moduleName);
  if (!moduleName) return invalid();
  if (raw.device !== 'web' || (expectedModuleName && moduleName !== expectedModuleName)) return invalid('review.backend.context');
  const arrays = ['tables', 'usecases', 'ports', 'endpoints', 'removed'] as const;
  if (arrays.some(name => !Array.isArray(raw[name])) || (!legacy && !Array.isArray(raw.changes))) return invalid();
  const tables = (raw.tables as unknown[]).map(record);
  if (tables.some(table => !table || !string(table.tableId) || !string(table.entity))) return invalid();
  const groups = tables.map(table => ({ tableId: string(table!.tableId), entity: string(table!.entity), items: [] as BackendItem[] }));
  if (!legacy) {
    for (const value of raw.removed as unknown[]) {
      const item = record(value);
      const id = string(item?.id);
      if (item?.kind === 'table' && id && strings(item.tableRefs)?.includes(id) && !groups.some(group => group.tableId === id)) {
        groups.push({ tableId: id, entity: '', items: [] });
      }
    }
  }
  const groupById = new Map(groups.map(group => [group.tableId, group]));
  if (groupById.size !== groups.length) return invalid();
  const byEntity = new Map<string, string[]>();
  for (const group of groups) byEntity.set(group.entity, [...(byEntity.get(group.entity) ?? []), group.tableId]);
  const usecases = (raw.usecases as unknown[]).map(record);
  if (usecases.some(item => !item || !string(item.usecaseId))) return invalid();
  const usecaseById = new Map(usecases.map(item => [string(item!.usecaseId), item!]));
  if (usecaseById.size !== usecases.length) return invalid();
  const rows: BackendItem[] = [];
  const add = (kind: BackendItemKind, row: Record<string, unknown>, id: string, label: string, entity: string, detail = ''): boolean => {
    if (!id) return false;
    const relation = legacy && kind === 'table' ? { refs: [id], noTable: 'legacy' } : tableRefsOf(row, legacy, entity, byEntity);
    if (!relation) return false;
    const status = string(kind === 'change' ? row.op : row.status);
    rows.push({
      id: `${kind}:${id}`, kind, label, status, tone: backendTone(status, kind === 'change'), entity,
      reason: string(row.reason), source: string(row.source), tableRefs: relation.refs, noTable: relation.noTable,
      usecaseRefs: strings(row.usecaseRefs) ?? [], detail,
    });
    return true;
  };
  for (const table of tables) {
    if (!add('table', table!, string(table!.tableId), string(table!.entity), string(table!.entity), string(table!.tableId))) return invalid();
  }
  for (const item of usecases) {
    if (!add('usecase', item!, string(item!.usecaseId), string(item!.usecaseId), string(item!.entity), string(item!.operation))) return invalid();
  }
  for (const value of raw.ports as unknown[]) {
    const item = record(value);
    if (!item || !add('port', item, string(item.portId), string(item.portId), string(item.entity))) return invalid();
  }
  for (const value of raw.endpoints as unknown[]) {
    const item = record(value);
    if (!item) return invalid();
    const ref = string(item.usecaseRef);
    const entity = legacy ? string(usecaseById.get(ref)?.entity) : '';
    if (!add('endpoint', item, string(item.route), string(item.route), entity, ref)) return invalid();
  }
  for (const value of raw.removed as unknown[]) {
    const item = record(value);
    if (!item || !add('removed', item, string(item.id), string(item.id), '', string(item.kind))) return invalid();
  }
  const seenChangeIds = new Set<string>();
  for (const value of (raw.changes as unknown[] | undefined) ?? []) {
    const item = record(value);
    const id = string(item?.changeId);
    if (!item || !id || seenChangeIds.has(id)) return invalid();
    seenChangeIds.add(id);
    if (!add('change', item, id, id, string(item.entity), string(item.kind))) return invalid();
  }
  const meta = record(raw.meta);
  const unmapped = meta?.unmappedChanges;
  if (Array.isArray(unmapped)) {
    for (const value of unmapped) {
      const item = record(value);
      const id = string(item?.changeId);
      if (!item || !id) return invalid();
      rows.push({ id: `unmapped:${id}`, kind: 'unmapped', label: id, status: '', tone: 'unknown', entity: '', reason: '',
        source: string(item.source), tableRefs: [], noTable: 'unmapped', usecaseRefs: [], detail: string(item.kind) });
    }
  }
  const shared: BackendItem[] = [];
  const unassociated: BackendItem[] = [];
  for (const item of rows) {
    if (item.tableRefs.length > 1) shared.push(item);
    else if (item.tableRefs.length === 1 && groupById.has(item.tableRefs[0])) groupById.get(item.tableRefs[0])!.items.push(item);
    else unassociated.push(item);
  }
  return { kind: 'ready', errorCode: '', schemaVersion: schema, moduleName, groups, shared, unassociated, itemCount: rows.length };
}

export function parseEffortSummary(read: ReviewArtifactRead, expectedModuleName = ''): EffortSummary {
  if (read.status === 'missing') return { kind: 'missing', counts: [] };
  if (read.status === 'invalid') return { kind: 'invalid', counts: [] };
  const raw = record(read.value);
  const totals = record(raw?.totals);
  if (raw?.schemaVersion !== EFFORT_SCHEMA_V1 || raw.device !== 'web' || !totals || (expectedModuleName && raw.moduleName !== expectedModuleName)) return { kind: 'invalid', counts: [] };
  const categories = ['screens', 'endpoints', 'usecases', 'tables'] as const;
  const counts: EffortCount[] = [];
  for (const category of categories) {
    const values = record(totals[category]);
    if (!values) continue;
    const statuses = Object.entries(values).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0)
      .map(([status, count]) => ({ status, count }));
    counts.push({ category, statuses });
  }
  return counts.length ? { kind: 'counts', counts } : { kind: 'invalid', counts: [] };
}
