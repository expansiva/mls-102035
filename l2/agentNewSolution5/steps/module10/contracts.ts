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

export type Ns5ModuleFormNormalizationKind = 'ptToPtBR';

/** Deterministic language rewrite. Only `pt` → `pt-BR` (measured); `en` stays `en`. */
export interface Ns5ModuleFormNormalization {
  kind: Ns5ModuleFormNormalizationKind;
  detail: string;
}

export interface Ns5ModuleNormalization {
  artifact: Ns5ModuleArtifact;
  actors: Ns5ModuleActor[];
  i18nWarnings: string[];
  normalizations: Ns5ModuleFormNormalization[];
}

/**
 * ns5_52b. The invocation gates are deterministic (`ns5EntryRefusal`); whether a non-empty request
 * asks for a business module at all is not, so module10 answers it in the same tool call it already
 * makes, and the step refuses before the first write. The verdict never reaches disk.
 */
export type Ns5ModuleRequestKind = 'moduleRequest' | 'notAModuleRequest';

/** The answer given to the user when the request does not describe a module. English, i18n default. */
export const NS5_MODULE_NOT_A_REQUEST =
  'This does not describe a module to build, so nothing was created. Describe the business the module must support: who works in it, what they do and what has to be recorded.';

/**
 * A payload without the field is a run recorded before this gate (or a repair of one): it keeps the
 * old behaviour instead of refusing a module that is already half built.
 */
export function ns5ModuleRequestKind(value: unknown): Ns5ModuleRequestKind {
  return record(value).requestKind === 'notAModuleRequest' ? 'notAModuleRequest' : 'moduleRequest';
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
  const userLanguageRaw = normalizeNs4Languages(root.userLanguage || 'en')[0];
  const requested = normalizeNs4Languages(root.productLanguages || userLanguageRaw, userLanguageRaw);
  const i18nWarnings: string[] = [];
  const languagesRaw = filterLanguagesByProvenance(requested, userLanguageRaw, sourcePrompt, i18nWarnings);
  const declaredDefault = normalizeNs4Languages(root.defaultLanguage || languagesRaw[0], languagesRaw[0])[0];
  const defaultRaw = languagesRaw.some(language => sameLanguage(language, declaredDefault))
    ? languagesRaw.find(language => sameLanguage(language, declaredDefault)) || languagesRaw[0]
    : languagesRaw[0];
  const { userLanguage, productLanguages, defaultLanguage, normalizations } = canonicalizeNs5Languages(
    userLanguageRaw,
    languagesRaw,
    defaultRaw,
  );
  const proposedName = normalizeModuleName(text(root.moduleName) || options.fixedModuleName || sourcePrompt, 'newModule');
  const moduleName = options.fixedModuleName || proposedName;
  const actors = list(root.actors).map((item, index) => normalizeActor(item, index)).filter(actor => actor.title);
  return {
    artifact: {
      schemaVersion: NS5_MODULE_SCHEMA_VERSION,
      moduleName,
      title: text(root.title) || humanize(moduleName),
      userLanguage,
      productLanguages,
      defaultLanguage,
      sourcePrompt,
    },
    actors,
    i18nWarnings,
    normalizations,
  };
}

/** Platform canonical for Portuguese is BCP-47 with region. `en` is not rewritten to `en-US`. */
function canonicalizeNs5Language(tag: string): string {
  return tag === 'pt' ? 'pt-BR' : tag;
}

function canonicalizeNs5Languages(
  userLanguage: string,
  productLanguages: string[],
  defaultLanguage: string,
): {
  userLanguage: string;
  productLanguages: string[];
  defaultLanguage: string;
  normalizations: Ns5ModuleFormNormalization[];
} {
  const replaced: string[] = [];
  const map = (tag: string): string => {
    const next = canonicalizeNs5Language(tag);
    if (next !== tag) replaced.push(`${tag}→${next}`);
    return next;
  };
  const seen = new Set<string>();
  const languages: string[] = [];
  for (const tag of productLanguages) {
    const next = map(tag);
    const key = next.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    languages.push(next);
  }
  const user = map(userLanguage);
  if (!languages.some(language => sameLanguage(language, user))) languages.unshift(user);
  const fallback = languages[0] || user;
  const declared = map(defaultLanguage);
  const normalizedDefault = languages.some(language => sameLanguage(language, declared))
    ? languages.find(language => sameLanguage(language, declared)) || fallback
    : fallback;
  return {
    userLanguage: user,
    productLanguages: languages,
    defaultLanguage: normalizedDefault,
    normalizations: replaced.length
      ? [{ kind: 'ptToPtBR', detail: [...new Set(replaced)].join(', ') }]
      : [],
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


