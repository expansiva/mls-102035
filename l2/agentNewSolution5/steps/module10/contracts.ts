/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/module10/contracts.ts" enhancement="_blank"/>

import {
  foldNs4Text,
  normalizeNs4Languages,
  ns4LanguageMentioned,
} from '/_102035_/l2/agentNewSolution/helpers/ns4Core.js';
import { normalizeModuleName } from '/_102035_/l2/solution/fs.js';
import {
  NS5_MODULE_SCHEMA_VERSION,
  type Ns5ModuleActor,
  type Ns5ModuleArtifact,
} from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;

export interface Ns5ModuleNormalizeOptions {
  sourcePrompt: string;
  /** When set, the artifact moduleName must match this token. */
  fixedModuleName?: string;
}

export interface Ns5ModuleNormalization {
  artifact: Ns5ModuleArtifact;
  actors: Ns5ModuleActor[];
  i18nWarnings: string[];
}

export function buildNs5ModuleTool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool('submitNs5Module', 'Submit the module artifact: name, actors and languages.', schema);
}

export function normalizeNs5ModuleArtifact(
  value: unknown,
  options: Ns5ModuleNormalizeOptions,
): Ns5ModuleNormalization {
  const root = record(value);
  const sourcePrompt = text(options.sourcePrompt) || text(root.sourcePrompt);
  const userLanguage = normalizeNs4Languages(root.userLanguage || 'en')[0];
  const requested = normalizeNs4Languages(root.productLanguages || userLanguage, userLanguage);
  const i18nWarnings: string[] = [];
  const languages = filterLanguagesByProvenance(requested, userLanguage, sourcePrompt, i18nWarnings);
  const declaredDefault = normalizeNs4Languages(root.defaultLanguage || languages[0], languages[0])[0];
  const defaultLanguage = languages.some(language => sameLanguage(language, declaredDefault))
    ? languages.find(language => sameLanguage(language, declaredDefault)) || languages[0]
    : languages[0];
  const proposedName = normalizeModuleName(text(root.moduleName) || options.fixedModuleName || sourcePrompt, 'newModule');
  const moduleName = options.fixedModuleName || proposedName;
  const actors = list(root.actors).map((item, index) => normalizeActor(item, index)).filter(actor => actor.title);
  return {
    artifact: {
      schemaVersion: NS5_MODULE_SCHEMA_VERSION,
      moduleName,
      title: text(root.title) || humanize(moduleName),
      userLanguage,
      productLanguages: languages,
      defaultLanguage,
      sourcePrompt,
    },
    actors,
    i18nWarnings,
  };
}

function normalizeActor(value: unknown, index: number): Ns5ModuleActor {
  const actor = record(value);
  return {
    actorId: memberId(text(actor.actorId) || text(actor.title), `actor${index + 1}`),
    kind: actor.kind === 'external' || actor.kind === 'system' ? actor.kind : 'internal',
    origin: actor.origin === 'named' ? 'named' : 'inferred',
    title: text(actor.title),
    description: text(actor.description),
  };
}

function filterLanguagesByProvenance(
  languages: string[],
  userLanguage: string,
  sourcePrompt: string,
  warnings: string[],
): string[] {
  const citedText = foldNs4Text(sourcePrompt);
  const kept: string[] = [];
  const discarded: string[] = [];
  for (const language of languages) {
    const cited = sameLanguage(language, userLanguage) || ns4LanguageMentioned(language, userLanguage, citedText);
    (cited ? kept : discarded).push(language);
  }
  if (discarded.length) {
    warnings.push(
      `productLanguages: discarded ${discarded.join(', ')} — languages are a user decision and the request did not cite them; kept ${(kept.length ? kept : [userLanguage]).join(', ')}.`,
    );
  }
  const withUser = kept.length ? kept : normalizeNs4Languages(userLanguage);
  if (!withUser.some(language => sameLanguage(language, userLanguage))) {
    return [userLanguage, ...withUser];
  }
  return withUser;
}

function sameLanguage(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
    || a.split('-')[0].toLowerCase() === b.split('-')[0].toLowerCase();
}

function memberId(value: string, fallback: string): string {
  const id = normalizeModuleName(value || fallback, fallback);
  return MEMBER_ID.test(id) ? id : fallback;
}

function humanize(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, item => item.toUpperCase());
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}


