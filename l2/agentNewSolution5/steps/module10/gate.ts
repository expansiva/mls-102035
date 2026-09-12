/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/module10/gate.ts" enhancement="_blank"/>

import { normalizeNs4Languages } from '/_102035_/l2/agentNewSolution/helpers/ns4Core.js';
import { NS5_MODULE_SCHEMA_VERSION, type Ns5ModuleActor, type Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;

export interface Ns5ModuleGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface Ns5ModuleGateResult {
  ok: boolean;
  issues: Ns5ModuleGateIssue[];
}

export interface Ns5ModuleGateContext {
  /** When the invocation fixed /module, the artifact must use that token. */
  fixedModuleName?: string;
  /** Born by the LLM; stored on pipeline.json, not on module.defs.ts. */
  actors?: readonly Ns5ModuleActor[];
}

export function validateNs5ModuleArtifact(
  artifact: Ns5ModuleArtifact,
  context: Ns5ModuleGateContext = {},
): Ns5ModuleGateResult {
  const issues: Ns5ModuleGateIssue[] = [];
  if (artifact.schemaVersion !== NS5_MODULE_SCHEMA_VERSION) {
    error(issues, 'NS5_MODULE_SCHEMA', 'Unexpected module schemaVersion.', 'schemaVersion');
  }
  if (!MEMBER_ID.test(artifact.moduleName)) {
    error(issues, 'NS5_MODULE_NAME', 'moduleName must be lowerCamel.', 'moduleName');
  }
  if (context.fixedModuleName && artifact.moduleName !== context.fixedModuleName) {
    error(issues, 'NS5_MODULE_NAME_MISMATCH', `moduleName must equal /module ${context.fixedModuleName}.`, 'moduleName');
  }
  if (!artifact.title.trim()) error(issues, 'NS5_MODULE_TITLE', 'Module title is required.', 'title');
  if (!artifact.userLanguage.trim()) {
    error(issues, 'NS5_MODULE_USER_LANGUAGE', 'userLanguage is required.', 'userLanguage');
  }
  if (!artifact.sourcePrompt.trim()) {
    error(issues, 'NS5_MODULE_SOURCE_PROMPT', 'sourcePrompt is required.', 'sourcePrompt');
  }
  if (!artifact.productLanguages.length) {
    error(issues, 'NS5_MODULE_LANGUAGES', 'At least one product language is required.', 'productLanguages');
  } else {
    const normalized = normalizeNs4Languages(artifact.productLanguages);
    if (normalized.length !== artifact.productLanguages.length
      || normalized.some((language, index) => language !== artifact.productLanguages[index])) {
      error(issues, 'NS5_MODULE_LANGUAGES_NORMALIZED', 'Product languages must be unique normalized BCP-47 tags.', 'productLanguages');
    }
  }
  if (!artifact.defaultLanguage || !artifact.productLanguages.includes(artifact.defaultLanguage)) {
    error(issues, 'NS5_MODULE_DEFAULT_LANGUAGE', 'defaultLanguage must belong to productLanguages.', 'defaultLanguage');
  }
  const actors = context.actors || [];
  if (!actors.length) {
    error(issues, 'NS5_MODULE_ACTORS', 'At least one actor is required.', 'actors');
  }
  const ids = new Set<string>();
  let internalCount = 0;
  actors.forEach((actor, index) => {
    const path = `actors[${index}]`;
    if (!MEMBER_ID.test(actor.actorId)) {
      error(issues, 'NS5_MODULE_ACTOR_ID', 'actorId must be lowerCamel.', `${path}.actorId`);
    }
    if (ids.has(actor.actorId)) {
      error(issues, 'NS5_MODULE_ACTOR_DUPLICATE', `Duplicate actorId ${actor.actorId}.`, `${path}.actorId`);
    }
    if (actor.actorId) ids.add(actor.actorId);
    if (actor.kind !== 'internal' && actor.kind !== 'external' && actor.kind !== 'system') {
      error(issues, 'NS5_MODULE_ACTOR_KIND', 'kind must be internal, external or system.', `${path}.kind`);
    }
    if (actor.origin !== 'named' && actor.origin !== 'inferred') {
      error(issues, 'NS5_MODULE_ACTOR_ORIGIN', 'origin must be named or inferred.', `${path}.origin`);
    }
    if (!actor.title.trim()) error(issues, 'NS5_MODULE_ACTOR_TITLE', 'Every actor needs a title.', `${path}.title`);
    if (!actor.description.trim()) {
      error(issues, 'NS5_MODULE_ACTOR_DESCRIPTION', 'Every actor needs a description.', `${path}.description`);
    }
    if (actor.kind === 'internal') internalCount += 1;
  });
  if (actors.length && internalCount === 0) {
    error(issues, 'NS5_MODULE_INTERNAL_ACTOR', 'At least one internal actor is required.', 'actors');
  }
  const details = artifact.details || {};
  const detailNames = new Set<string>();
  for (const [name, description] of Object.entries(details)) {
    if (!MEMBER_ID.test(name)) {
      error(issues, 'NS5_MODULE_DETAILS_ID', 'details names must be lowerCamel.', `details.${name}`);
    }
    if (detailNames.has(name)) {
      error(issues, 'NS5_MODULE_DETAILS_ID', `Duplicate details name ${name}.`, `details.${name}`);
    }
    detailNames.add(name);
    if (!String(description || '').trim()) {
      error(issues, 'NS5_MODULE_DETAILS_DESCRIPTION', `details.${name} needs a one-sentence description.`, `details.${name}`);
    }
  }
  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

export function formatNs5ModuleGate(issues: Ns5ModuleGateIssue[]): string {
  return issues.filter(issue => issue.severity === 'error').map(issue => `${issue.code}: ${issue.message}`).join('\n');
}

function error(issues: Ns5ModuleGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, ...(path ? { path } : {}) });
}
