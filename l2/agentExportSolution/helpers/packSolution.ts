/// <mls fileReference="_102035_/l2/agentExportSolution/helpers/packSolution.ts" enhancement="_blank"/>

import { extractNs4ClassicJsonObject, parseNs4ClassicDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import { normalizeNs4ModuleName } from '/_102035_/l2/agentNewSolution/helpers/ns4Core.js';
import {
  extractI18n,
  injectI18n,
  TEXT_PATHS_VERSION,
  textPathsForArtifact,
} from '/_102035_/l2/agentNewSolution/helpers/ns4TextPaths.js';
import { sha256Ns4 } from '/_102035_/l2/agentNewSolution/steps/e2/contracts.js';
import { encodeStoredZip, type ZipEntry } from '/_102035_/l2/agentExportSolution/helpers/storedZip.js';

export const SOLUTION_MANIFEST_SCHEMA = '2026-09-09-solution-v1' as const;
export const PROJECT_PLACEHOLDER = '{project}' as const;

const HASH_KEY = /Hash$/;
const HEADER_L4 = /fileReference="_(\d{6})_\/l4\//;

export interface SolutionModuleInput {
  moduleName: string;
  sourceLanguage: string;
  sourcePrompt: string;
  files: Array<{ relativePath: string; content: string }>;
}

export interface SolutionPackInput {
  modules: SolutionModuleInput[];
  sourceProjectId: number;
  level1SchemaVersion: string;
  level1Roles: Array<{ mdmSubtype: string; role: string; namespace: string }>;
  actors: Array<{ moduleName: string; actorId: string; kind: string }>;
  platformCommit: string;
  catalogDescription?: string;
}

export interface SolutionManifest {
  schemaVersion: typeof SOLUTION_MANIFEST_SCHEMA;
  textPathsVersion: typeof TEXT_PATHS_VERSION;
  platformCommit: string;
  sourceProjectPlaceholder: typeof PROJECT_PLACEHOLDER;
  level1SchemaVersion: string;
  sourceLanguage: string;
  catalog: { description: string };
  modules: Array<{
    moduleName: string;
    order: number;
    sourceLanguage: string;
    sourcePrompt: string;
    schemaVersionByArtifact: Record<string, string>;
  }>;
  level1Roles: SolutionPackInput['level1Roles'];
  actors: SolutionPackInput['actors'];
}

export interface PackedSolution {
  manifest: SolutionManifest;
  files: ZipEntry[];
  /** module → language → file-relative → json-path → text */
  i18n: Record<string, Record<string, Record<string, Record<string, string>>>>;
}

export function parseExportInvocation(userPrompt: string): string[] {
  return userPrompt
    .replace(/^@@exportSolution\b/i, '')
    .trim()
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token && !token.startsWith('/'))
    .map(token => normalizeNs4ModuleName(token));
}

export function packSolution(input: SolutionPackInput): PackedSolution {
  const i18n: PackedSolution['i18n'] = {};
  const files: ZipEntry[] = [];
  const moduleManifest: SolutionManifest['modules'] = [];
  const languages = new Set<string>();

  input.modules.forEach((mod, order) => {
    languages.add(mod.sourceLanguage);
    const schemaVersionByArtifact: Record<string, string> = {};
    const extracted: Record<string, Record<string, string>> = {};
    for (const file of mod.files) {
      const relative = file.relativePath.replace(/\\/g, '/');
      if (isPipelinePath(relative)) continue;
      const artifact = parseArtifact(file.content);
      if (artifact) {
        const paths = textPathsForArtifact(relative, artifact);
        extracted[relative] = extractI18n(artifact, paths);
        const schema = typeof artifact.schemaVersion === 'string' ? artifact.schemaVersion : '';
        if (schema) schemaVersionByArtifact[relative] = schema;
        const stripped = stripRecomputableHashes(artifact);
        files.push({
          path: `l4/${mod.moduleName}/${relative}`,
          content: rewriteDefs(file.content, stripped, input.sourceProjectId),
        });
      } else {
        files.push({
          path: `l4/${mod.moduleName}/${relative}`,
          content: normalizeL4Header(file.content, input.sourceProjectId),
        });
      }
    }
    i18n[mod.moduleName] = { [mod.sourceLanguage]: extracted };
    files.push({
      path: `i18n/${mod.moduleName}/${mod.sourceLanguage}.json`,
      content: `${JSON.stringify(extracted, null, 2)}\n`,
    });
    moduleManifest.push({
      moduleName: mod.moduleName,
      order,
      sourceLanguage: mod.sourceLanguage,
      sourcePrompt: mod.sourcePrompt,
      schemaVersionByArtifact,
    });
  });

  const sourceLanguage = [...languages].length === 1 ? [...languages][0] : [...languages].sort().join(',');
  const manifest: SolutionManifest = {
    schemaVersion: SOLUTION_MANIFEST_SCHEMA,
    textPathsVersion: TEXT_PATHS_VERSION,
    platformCommit: input.platformCommit,
    sourceProjectPlaceholder: PROJECT_PLACEHOLDER,
    level1SchemaVersion: input.level1SchemaVersion,
    sourceLanguage,
    catalog: { description: input.catalogDescription || '' },
    modules: moduleManifest,
    level1Roles: input.level1Roles,
    actors: input.actors,
  };
  files.push({ path: 'solution.json', content: `${JSON.stringify(manifest, null, 2)}\n` });
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { manifest, files, i18n };
}

export function packSolutionZip(packed: PackedSolution): Uint8Array {
  return encodeStoredZip(packed.files);
}

export function parseArtifact(source: string): Record<string, unknown> | null {
  const parsed = parseNs4ClassicDefsSource<unknown>(source);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  return null;
}

export function stripRecomputableHashes<T>(value: T): T {
  return stripHashesDeep(value) as T;
}

export async function recomputeArtifactHashes(artifact: Record<string, unknown>): Promise<Record<string, unknown>> {
  const next = clone(artifact);
  const schema = typeof next.schemaVersion === 'string' ? next.schemaVersion : '';
  if (schema.includes('ns4-rules')) {
    next.rulesHash = await sha256Ns4(next.rules);
  } else if (schema.includes('ns4-composition')) {
    next.compositionHash = await sha256Ns4({
      analysisSummary: next.analysisSummary,
      recommendations: next.recommendations,
    });
  } else if (schema.includes('ns4-journey') && !schema.includes('index') && next.business) {
    next.businessHash = await sha256Ns4(next.business);
  } else if (schema.includes('ns4-access-matrix')) {
    next.accessHash = await sha256Ns4({
      profiles: next.profiles,
      authorities: next.authorities,
      grants: next.grants,
    });
  } else if (schema.includes('ns4-ontology') && next.entityId) {
    next.ontologyHash = await sha256Ns4({
      solutionMode: next.solutionMode,
      businessDomain: next.businessDomain,
      entities: [omitKeys(next, ['schemaVersion', 'moduleName', 'userLanguage', 'solutionMode', 'ontologyHash', 'approvedBy', 'approvedAt'])],
      relationships: [],
    });
  } else if (schema.includes('ns4-access-bindings')) {
    const contract = omitKeys(next, ['bindingsHash']);
    next.bindingsHash = await sha256Ns4(contract);
  } else if (schema.includes('ns4-usecase') && !schema.includes('index')) {
    const { useCaseHash: _hash, ...contract } = next;
    next.useCaseHash = await sha256Ns4(contract);
  } else if (schema.includes('ns4-workflow') && !schema.includes('index')) {
    next.workflowHash = await sha256Ns4({
      entityRef: next.entityRef,
      initialState: next.initialState,
      terminalStates: next.terminalStates,
      states: next.states,
      transitions: next.transitions,
    });
  }
  return next;
}

export function reinjectPackedModule(
  packedFiles: ZipEntry[],
  moduleName: string,
  language: string,
  i18n: Record<string, string>,
): ZipEntry[] {
  const prefix = `l4/${moduleName}/`;
  return packedFiles.map(file => {
    if (!file.path.startsWith(prefix) || typeof file.content !== 'string') return file;
    const artifact = parseArtifact(file.content);
    if (!artifact) return file;
    const injected = injectI18n(artifact, i18n);
    return { path: file.path, content: rewriteDefs(file.content, injected, 0, false) };
  });
}

export function restoreL4Header(source: string, projectId: number): string {
  return source.split('fileReference="_{project}_/l4/').join(`fileReference="_${projectId}_/l4/`);
}

export function normalizeL4Header(source: string, sourceProjectId: number): string {
  return source.replace(HEADER_L4, (_all, id) => {
    if (Number(id) !== sourceProjectId) return _all;
    return `fileReference="_{project}_/l4/`;
  });
}

export function isPipelinePath(relativePath: string): boolean {
  return /(^|\/)pipeline\//.test(relativePath.replace(/\\/g, '/'));
}

function rewriteDefs(
  source: string,
  artifact: Record<string, unknown>,
  sourceProjectId: number,
  normalizeHeader = true,
): string {
  const json = extractNs4ClassicJsonObject(source);
  const rendered = JSON.stringify(artifact, null, 2);
  const body = json ? source.replace(json, rendered) : source;
  return normalizeHeader ? normalizeL4Header(body, sourceProjectId) : body;
}

function stripHashesDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripHashesDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (HASH_KEY.test(key)) continue;
      out[key] = stripHashesDeep(child);
    }
    return out;
  }
  return value;
}

function omitKeys(value: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const skip = new Set(keys);
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (!skip.has(key)) out[key] = child;
  }
  return out;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
