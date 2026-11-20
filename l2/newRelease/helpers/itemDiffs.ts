/// <mls fileReference="_102035_/l2/newRelease/helpers/itemDiffs.ts" enhancement="_blank" />

import type { NewReleaseTobeDiff } from '/_102035_/l2/newRelease/tobe.js';
import { stableStringifyTobe } from '/_102035_/l2/solution/candidate/tobeDiff.js';

/** Match a JSON member boundary, so `taskId=one` never marks `taskId=oneMore`. */
export function hasItemDiff(diffs: readonly NewReleaseTobeDiff[], path: string, selectors?: string | readonly string[]): boolean {
  const scopes = typeof selectors === 'string' ? [selectors] : selectors;
  return diffs.some(diff => diff.path === path && diff.entries.some(entry => {
    const jsonPath = entry.jsonPath;
    if (jsonPath === '$.businessHash') return false;
    if (!scopes) return true;
    if (jsonPath === '$') return true;
    return scopes.some(scope => jsonPath === scope || jsonPath.startsWith(`${scope}.`) || jsonPath.startsWith(`${scope}[`));
  }));
}

export function idScope(array: string, key: string, id: string): string {
  return `$.${array}[${key}=${encodeURIComponent(id)}]`;
}

export function connectionScope(connectionId: string, operationId: string): string {
  return `${idScope('connections', 'connectionId', connectionId)}[operationId=${encodeURIComponent(operationId)}]`;
}

/** Root entries contain whole artifacts; compare only the requested connection pair. */
export function hasConnectionDiff(diffs: readonly NewReleaseTobeDiff[], connectionId: string, operationId: string): boolean {
  const scope = connectionScope(connectionId, operationId);
  const member = (value: unknown): unknown => {
    const connections = Array.isArray(value) ? value
      : value && typeof value === 'object' ? (value as { connections?: unknown }).connections : undefined;
    if (!Array.isArray(connections)) return undefined;
    return connections.find(item => item && typeof item === 'object'
      && item.connectionId === connectionId && item.operationId === operationId);
  };
  return diffs.some(diff => diff.path === 'integration.defs.ts' && diff.entries.some(entry => {
    if (entry.jsonPath === '$' || entry.jsonPath === '$.connections')
      return stableStringifyTobe(member(entry.before)) !== stableStringifyTobe(member(entry.after));
    return entry.jsonPath === scope || entry.jsonPath.startsWith(`${scope}.`) || entry.jsonPath.startsWith(`${scope}[`);
  }));
}

export function hasExternalSystemDiff(diffs: readonly NewReleaseTobeDiff[], id: string): boolean {
  const scope = idScope('externalSystems', 'id', id);
  const system = (value: unknown): unknown => {
    const systems = Array.isArray(value) ? value
      : value && typeof value === 'object' ? (value as { externalSystems?: unknown }).externalSystems : undefined;
    if (!Array.isArray(systems)) return undefined;
    return systems.find(item => item && typeof item === 'object' && item.id === id);
  };
  return diffs.some(diff => diff.path === 'integration.defs.ts' && diff.entries.some(entry =>
    entry.jsonPath === '$' || entry.jsonPath === '$.externalSystems'
      ? stableStringifyTobe(system(entry.before)) !== stableStringifyTobe(system(entry.after))
      : entry.jsonPath === scope || entry.jsonPath.startsWith(`${scope}.`) || entry.jsonPath.startsWith(`${scope}[`)));
}

export function ontologyFieldScope(fieldPath: string, v3: boolean): string {
  if (!v3) return idScope('fields', 'fieldId', fieldPath);
  return `$.record.fields.${fieldPath.split('.').join('.fields.')}`;
}

export function ruleScopes(id: string): string[] {
  return [`$.rules.${id}`, idScope('rules', 'ruleId', id)];
}

/** Resolve the diff's data index to a stable pluginId; a full record takes precedence. */
export function hasPluginDiff(diffs: readonly NewReleaseTobeDiff[], plugins: readonly {pluginId: string}[], pluginId: string): boolean {
  if (!pluginId) return false;
  const matchRecord = (value: unknown) => !!value && typeof value === 'object' && !Array.isArray(value)
    && (value as {pluginId?: unknown}).pluginId === pluginId;
  return diffs.some(diff => diff.path === 'integration.defs.ts' && diff.entries.some(entry => {
    if (entry.jsonPath === '$') {
      const before = (entry.before as {plugins?: unknown[]} | undefined)?.plugins || [];
      const after = (entry.after as {plugins?: unknown[]} | undefined)?.plugins || [];
      return [...before, ...after].some(matchRecord);
    }
    const match = /^\$\.plugins\[(\d+)\](?:\.|\[|$)/u.exec(entry.jsonPath);
    if (!match) return false;
    if (entry.jsonPath === `$.plugins[${match[1]}]`) return matchRecord(entry.before) || matchRecord(entry.after);
    if (entry.jsonPath === `$.plugins[${match[1]}].pluginId`) return entry.before === pluginId || entry.after === pluginId;
    return plugins[Number(match[1])]?.pluginId === pluginId;
  }));
}
