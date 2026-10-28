/// <mls fileReference="_102035_/l2/newRelease/helpers/itemDiffs.ts" enhancement="_blank" />

import type { NewReleaseTobeDiff } from '/_102035_/l2/newRelease/tobe.js';
import { html, nothing } from 'lit';
import type { NewReleaseTranslate } from '/_102035_/l2/newRelease/helpers/i18n.js';

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

export function changedDot(changed: boolean, t: NewReleaseTranslate) {
  return changed ? html`<span class="nr-item__changed" role="img" aria-label=${t('tobe.itemChanged')} title=${t('tobe.itemChanged')}></span>` : nothing;
}
