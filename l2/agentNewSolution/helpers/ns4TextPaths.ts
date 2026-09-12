/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/ns4TextPaths.ts" enhancement="_blank"/>

/**
 * textPaths are metadata per schemaVersion: the human-prose fields an importer may rewrite.
 * They are not a field on the artifact (principle T).
 */

import { TEXT_PATHS_2026_08_06_ns4_module_v4 } from '/_102035_/l2/agentNewSolution/steps/e1/contracts.js';
import {
  TEXT_PATHS_2026_08_04_ns4_journey_index_v1,
  TEXT_PATHS_2026_08_04_ns4_journey_v1,
  TEXT_PATHS_2026_08_09_ns4_journey_index_v2,
  TEXT_PATHS_2026_08_09_ns4_journey_v2,
  TEXT_PATHS_2026_08_10_ns4_journey_index_v3,
  TEXT_PATHS_2026_08_10_ns4_journey_index_v4,
  TEXT_PATHS_2026_08_10_ns4_journey_v3,
  TEXT_PATHS_2026_08_10_ns4_journey_v4,
  TEXT_PATHS_2026_08_12_ns4_journey_index_v5,
  TEXT_PATHS_2026_08_14_ns4_journey_index_v6,
  TEXT_PATHS_2026_08_14_ns4_journey_realized_v5,
  TEXT_PATHS_2026_08_14_ns4_journey_v5,
  TEXT_PATHS_2026_08_15_ns4_journey_index_v7,
} from '/_102035_/l2/agentNewSolution/steps/e2/contracts.js';
import {
  TEXT_PATHS_2026_08_05_ns4_access_matrix_v1,
  TEXT_PATHS_2026_08_09_ns4_access_matrix_v2,
  TEXT_PATHS_2026_08_10_ns4_access_matrix_v3,
  TEXT_PATHS_2026_08_13_ns4_access_matrix_v4,
} from '/_102035_/l2/agentNewSolution/steps/e3/contracts.js';
import {
  TEXT_PATHS_2026_08_08_ns4_ontology_v3,
  TEXT_PATHS_2026_08_09_ns4_ontology_v4,
  TEXT_PATHS_2026_08_11_ns4_ontology_v6,
  TEXT_PATHS_2026_09_08_ns4_ontology_v7,
} from '/_102035_/l2/agentNewSolution/steps/e4/contracts.js';
import { TEXT_PATHS_2026_09_08_ns4_access_bindings_v1 } from '/_102035_/l2/agentNewSolution/steps/e4b/contracts.js';
import { TEXT_PATHS_2026_08_09_ns4_rules_v2 } from '/_102035_/l2/agentNewSolution/steps/e5/contracts.js';
import { TEXT_PATHS_2026_08_09_ns4_composition_v1 } from '/_102035_/l2/agentNewSolution/steps/e6/contracts.js';
import {
  TEXT_PATHS_2026_08_10_ns4_usecase_index_v2,
  TEXT_PATHS_2026_08_10_ns4_usecase_v2,
  TEXT_PATHS_2026_08_10_ns4_usecase_v3,
  TEXT_PATHS_2026_08_10_ns4_workflow_index_v1,
  TEXT_PATHS_2026_08_10_ns4_workflow_v1,
  TEXT_PATHS_2026_08_11_ns4_workflow_index_v4,
  TEXT_PATHS_2026_08_11_ns4_workflow_v4,
  TEXT_PATHS_2026_08_12_ns4_workflow_index_v5,
  TEXT_PATHS_2026_09_09_ns4_usecase_index_v4,
  TEXT_PATHS_2026_09_09_ns4_usecase_v4,
} from '/_102035_/l2/agentNewSolution/steps/e7/contracts.js';
import { TEXT_PATHS_2026_08_14_ns4_e8_model_v1 } from '/_102035_/l2/agentNewSolution/steps/e8/model.js';
import {
  TEXT_PATHS_2026_08_14_ns4_classic_workspace_v6,
  TEXT_PATHS_CLASSIC_OPERATION,
  TEXT_PATHS_CLASSIC_SITE_MAP,
  TEXT_PATHS_CLASSIC_WORKSPACE,
} from '/_102035_/l2/agentNewSolution/steps/e9/classic.js';

export const TEXT_PATHS_VERSION = '2026-09-09-n14' as const;

export const TEXT_PATHS_BY_SCHEMA: Record<string, readonly string[]> = {
  '2026-08-06-ns4-module-v4': TEXT_PATHS_2026_08_06_ns4_module_v4,
  '2026-08-14-ns4-journey-v5': TEXT_PATHS_2026_08_14_ns4_journey_v5,
  '2026-08-14-ns4-journey-realized-v5': TEXT_PATHS_2026_08_14_ns4_journey_realized_v5,
  '2026-08-10-ns4-journey-v4': TEXT_PATHS_2026_08_10_ns4_journey_v4,
  '2026-08-10-ns4-journey-v3': TEXT_PATHS_2026_08_10_ns4_journey_v3,
  '2026-08-09-ns4-journey-v2': TEXT_PATHS_2026_08_09_ns4_journey_v2,
  '2026-08-04-ns4-journey-v1': TEXT_PATHS_2026_08_04_ns4_journey_v1,
  '2026-08-15-ns4-journey-index-v7': TEXT_PATHS_2026_08_15_ns4_journey_index_v7,
  '2026-08-14-ns4-journey-index-v6': TEXT_PATHS_2026_08_14_ns4_journey_index_v6,
  '2026-08-12-ns4-journey-index-v5': TEXT_PATHS_2026_08_12_ns4_journey_index_v5,
  '2026-08-10-ns4-journey-index-v4': TEXT_PATHS_2026_08_10_ns4_journey_index_v4,
  '2026-08-10-ns4-journey-index-v3': TEXT_PATHS_2026_08_10_ns4_journey_index_v3,
  '2026-08-09-ns4-journey-index-v2': TEXT_PATHS_2026_08_09_ns4_journey_index_v2,
  '2026-08-04-ns4-journey-index-v1': TEXT_PATHS_2026_08_04_ns4_journey_index_v1,
  '2026-08-09-ns4-access-matrix-v2': TEXT_PATHS_2026_08_09_ns4_access_matrix_v2,
  '2026-08-10-ns4-access-matrix-v3': TEXT_PATHS_2026_08_10_ns4_access_matrix_v3,
  '2026-08-13-ns4-access-matrix-v4': TEXT_PATHS_2026_08_13_ns4_access_matrix_v4,
  '2026-08-05-ns4-access-matrix-v1': TEXT_PATHS_2026_08_05_ns4_access_matrix_v1,
  '2026-09-08-ns4-ontology-v7': TEXT_PATHS_2026_09_08_ns4_ontology_v7,
  '2026-08-11-ns4-ontology-v6': TEXT_PATHS_2026_08_11_ns4_ontology_v6,
  '2026-08-09-ns4-ontology-v4': TEXT_PATHS_2026_08_09_ns4_ontology_v4,
  '2026-08-08-ns4-ontology-v3': TEXT_PATHS_2026_08_08_ns4_ontology_v3,
  '2026-09-08-ns4-access-bindings-v1': TEXT_PATHS_2026_09_08_ns4_access_bindings_v1,
  '2026-08-09-ns4-rules-v2': TEXT_PATHS_2026_08_09_ns4_rules_v2,
  '2026-08-09-ns4-composition-v1': TEXT_PATHS_2026_08_09_ns4_composition_v1,
  '2026-09-09-ns4-usecase-v4': TEXT_PATHS_2026_09_09_ns4_usecase_v4,
  '2026-08-10-ns4-usecase-v3': TEXT_PATHS_2026_08_10_ns4_usecase_v3,
  '2026-08-10-ns4-usecase-v2': TEXT_PATHS_2026_08_10_ns4_usecase_v2,
  '2026-09-09-ns4-usecase-index-v4': TEXT_PATHS_2026_09_09_ns4_usecase_index_v4,
  '2026-08-10-ns4-usecase-index-v2': TEXT_PATHS_2026_08_10_ns4_usecase_index_v2,
  '2026-08-11-ns4-workflow-v4': TEXT_PATHS_2026_08_11_ns4_workflow_v4,
  '2026-08-10-ns4-workflow-v1': TEXT_PATHS_2026_08_10_ns4_workflow_v1,
  '2026-08-12-ns4-workflow-index-v5': TEXT_PATHS_2026_08_12_ns4_workflow_index_v5,
  '2026-08-11-ns4-workflow-index-v4': TEXT_PATHS_2026_08_11_ns4_workflow_index_v4,
  '2026-08-10-ns4-workflow-index-v1': TEXT_PATHS_2026_08_10_ns4_workflow_index_v1,
  '2026-08-14-ns4-e8-model-v1': TEXT_PATHS_2026_08_14_ns4_e8_model_v1,
  '2026-08-14-ns4-classic-workspace-v6': TEXT_PATHS_2026_08_14_ns4_classic_workspace_v6,
};

const NON_ASCII = /[^\x00-\x7F]/;
const IDENT = /^[A-Za-z_][A-Za-z0-9]*$/;

export function textPathsForArtifact(relativePath: string, artifact: unknown): readonly string[] {
  const schema = schemaVersionOf(artifact);
  if (schema && TEXT_PATHS_BY_SCHEMA[schema]) return TEXT_PATHS_BY_SCHEMA[schema];
  const norm = relativePath.replace(/\\/g, '/');
  if (/(^|\/)operations\//.test(norm)) return TEXT_PATHS_CLASSIC_OPERATION;
  if (/(^|\/)workspaces\//.test(norm)) return TEXT_PATHS_CLASSIC_WORKSPACE;
  if (/(^|\/)siteMap\.defs\.ts$/.test(norm)) return TEXT_PATHS_CLASSIC_SITE_MAP;
  return [];
}

export function schemaVersionOf(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const schema = (value as { schemaVersion?: unknown }).schemaVersion;
  return typeof schema === 'string' ? schema : '';
}

export interface StringHit {
  path: string;
  value: string;
}

export function walkStrings(value: unknown, prefix = ''): StringHit[] {
  if (typeof value === 'string') return prefix ? [{ path: prefix, value }] : [];
  if (Array.isArray(value)) {
    const hits: StringHit[] = [];
    value.forEach((item, index) => {
      hits.push(...walkStrings(item, `${prefix}[${index}]`));
    });
    return hits;
  }
  if (value && typeof value === 'object') {
    const hits: StringHit[] = [];
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      hits.push(...walkStrings(child, joinPath(prefix, key)));
    }
    return hits;
  }
  return [];
}

export function pathMatches(path: string, pattern: string): boolean {
  return patternToRegExp(pattern).test(path);
}

export function isCoveredPath(path: string, patterns: readonly string[]): boolean {
  return patterns.some(pattern => pathMatches(path, pattern));
}

export function extractI18n(artifact: unknown, patterns: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const hit of walkStrings(artifact)) {
    if (!hit.value) continue;
    if (!isCoveredPath(hit.path, patterns)) continue;
    out[hit.path] = hit.value;
  }
  return out;
}

export function injectI18n<T>(artifact: T, i18n: Record<string, string>): T {
  const root = cloneJson(artifact);
  for (const [path, text] of Object.entries(i18n)) setByPath(root, path, text);
  return root;
}

export function uncoveredNonAscii(artifact: unknown, patterns: readonly string[]): StringHit[] {
  return walkStrings(artifact).filter(hit => NON_ASCII.test(hit.value) && !isCoveredPath(hit.path, patterns));
}

function joinPath(prefix: string, key: string): string {
  const segment = IDENT.test(key) ? `.${key}` : `["${escapeKey(key)}"]`;
  return prefix ? `${prefix}${segment}` : IDENT.test(key) ? key : `["${escapeKey(key)}"]`;
}

function escapeKey(key: string): string {
  return key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function patternToRegExp(pattern: string): RegExp {
  let source = '';
  for (let index = 0; index < pattern.length; ) {
    if (pattern.startsWith('[].', index)) {
      source += '\\[\\d+\\]\\.';
      index += 3;
      continue;
    }
    if (pattern.startsWith('[]', index) && (index + 2 === pattern.length || pattern[index + 2] !== '.')) {
      source += '\\[\\d+\\]';
      index += 2;
      continue;
    }
    if (pattern.startsWith('.*', index) && (index === 0 || pattern[index - 1] === '.' || index + 2 === pattern.length)) {
      source += '(?:\\["(?:\\\\.|[^"\\\\])+"\\]|\\.[A-Za-z_][A-Za-z0-9]*)';
      index += 2;
      continue;
    }
    const char = pattern[index];
    if ('\\^$|?*+()[]{}'.includes(char) || char === '.') source += `\\${char}`;
    else source += char;
    index += 1;
  }
  return new RegExp(`^${source}$`);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function setByPath(root: unknown, path: string, text: string): void {
  const tokens = tokenizePath(path);
  if (!tokens.length) return;
  let cursor: unknown = root;
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const token = tokens[index];
    if (typeof token === 'number') {
      if (!Array.isArray(cursor)) return;
      cursor = cursor[token];
    } else {
      if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) return;
      cursor = (cursor as Record<string, unknown>)[token];
    }
  }
  const last = tokens[tokens.length - 1];
  if (typeof last === 'number') {
    if (Array.isArray(cursor) && typeof cursor[last] === 'string') cursor[last] = text;
    return;
  }
  if (cursor && typeof cursor === 'object' && !Array.isArray(cursor)) {
    const record = cursor as Record<string, unknown>;
    if (typeof record[last] === 'string') record[last] = text;
  }
}

function tokenizePath(path: string): Array<string | number> {
  const tokens: Array<string | number> = [];
  let index = 0;
  while (index < path.length) {
    if (path[index] === '.') {
      index += 1;
      continue;
    }
    if (path[index] === '[') {
      if (path[index + 1] === '"') {
        let end = index + 2;
        let escaped = false;
        let key = '';
        while (end < path.length) {
          const char = path[end];
          if (escaped) { key += char; escaped = false; }
          else if (char === '\\') escaped = true;
          else if (char === '"') break;
          else key += char;
          end += 1;
        }
        tokens.push(key);
        index = path.indexOf(']', end) + 1;
        continue;
      }
      const close = path.indexOf(']', index);
      tokens.push(Number(path.slice(index + 1, close)));
      index = close + 1;
      continue;
    }
    let end = index;
    while (end < path.length && path[end] !== '.' && path[end] !== '[') end += 1;
    tokens.push(path.slice(index, end));
    index = end;
  }
  return tokens;
}

export { TEXT_PATHS_CLASSIC_OPERATION, TEXT_PATHS_CLASSIC_SITE_MAP, TEXT_PATHS_CLASSIC_WORKSPACE };
