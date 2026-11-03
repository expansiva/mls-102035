/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/promptSummary.ts" enhancement="_blank" />

export type PromptSummaryState = 'added' | 'changed' | 'removed';

export interface PromptSummaryDiff {
  jsonPath: string;
  before?: unknown;
  after?: unknown;
}

/** One edited file plus the structural diff of what was written. */
export interface PromptSummaryFile {
  file: string;
  state: PromptSummaryState;
  before?: unknown;
  after?: unknown;
  diffs: readonly PromptSummaryDiff[];
}

const LINE_CAP = 6;

const VERB: Record<'en' | 'pt', Record<PromptSummaryState, string>> = {
  en: { added: 'added', changed: 'changed', removed: 'removed' },
  pt: { added: 'entrou', changed: 'mudou', removed: 'saiu' },
};

/** `pt` / `pt-BR` are Portuguese. Anything else, including an empty language, is English. */
export function promptLanguage(userLanguage: string | null | undefined): 'en' | 'pt' {
  const value = (userLanguage || '').trim().toLowerCase();
  return value === 'pt' || value.startsWith('pt-') ? 'pt' : 'en';
}

/**
 * Up to six lines, one per journey, entity, rule or grant that the diff touched.
 * Past that, the last line counts the rest. Nothing is named that is not in the files.
 */
export function promptChangeSummary(userLanguage: string | null | undefined, files: readonly PromptSummaryFile[]): string {
  const language = promptLanguage(userLanguage);
  const lines = summaryRows(files).map(row => `${row.title} ${VERB[language][row.state]}`);
  if (lines.length <= LINE_CAP) return lines.join('\n');
  const shown = LINE_CAP - 1;
  const rest = lines.length - shown;
  const more = language === 'pt' ? `e mais ${rest}` : `and ${rest} more`;
  return [...lines.slice(0, shown), more].join('\n');
}

/** One line with what the agent decided for the user, in the user's language. Empty when nothing was assumed. */
export function promptAssumptionsLine(userLanguage: string | null | undefined, assumptions: readonly string[]): string {
  if (!assumptions.length) return '';
  return `${promptLanguage(userLanguage) === 'pt' ? 'Assumi' : 'Assumed'}: ${assumptions.join('; ')}`;
}

/** Question or refusal, in the user's language. Stock English sentences are translated. Free text is kept. */
export function promptHoldSummary(text: string, userLanguage?: string | null): string {
  return localizeHold(text.trim(), promptLanguage(userLanguage));
}

interface SummaryRow {
  title: string;
  state: PromptSummaryState;
}

function summaryRows(files: readonly PromptSummaryFile[]): SummaryRow[] {
  const rows: SummaryRow[] = [];
  for (const file of files) {
    if (isIndexFile(file.file)) continue;
    if (isNamedFile(file.file, 'rules.defs.ts')) {
      rows.push(...idRows(file, 'ruleId', 'rules'));
      continue;
    }
    if (isNamedFile(file.file, 'access.defs.ts')) {
      rows.push(...idRows(file, 'grantId', 'access'));
      continue;
    }
    rows.push({ title: fileTitle(file), state: file.state });
  }
  return rows;
}

function localizeHold(text: string, language: 'en' | 'pt'): string {
  if (language === 'en' || !text) return text;
  return text
    .replace(/Nothing was written\./gu, 'Nada foi gravado.')
    .replace(/Verification failed\./gu, 'A verificação falhou.')
    .replace(/Repair of (\w+) left the same errors\./gu, 'O reparo de $1 deixou os mesmos erros.')
    .replace(/Repair of (\w+) already used (\d+) rounds\./gu, 'O reparo de $1 já usou $2 rodadas.')
    .replace(/Repair already covered (\d+) artifact kinds\./gu, 'O reparo já cobriu $1 tipos de artefato.');
}

function idRows(file: PromptSummaryFile, key: 'ruleId' | 'grantId', fallback: string): SummaryRow[] {
  const listKey = key === 'ruleId' ? 'rules' : 'grants';
  const groups = new Map<string, { added: boolean; removed: boolean; changed: boolean }>();
  for (const diff of file.diffs) {
    const id = idInPath(diff.jsonPath, key) || (key === 'ruleId' ? ruleMapKey(diff.jsonPath) : null);
    if (!id) continue;
    const slot = groups.get(id) || { added: false, removed: false, changed: false };
    const hasBefore = Object.prototype.hasOwnProperty.call(diff, 'before') && diff.before !== undefined;
    const hasAfter = Object.prototype.hasOwnProperty.call(diff, 'after') && diff.after !== undefined;
    if (hasAfter && !hasBefore) slot.added = true;
    else if (hasBefore && !hasAfter) slot.removed = true;
    else slot.changed = true;
    groups.set(id, slot);
  }
  if (groups.size) {
    return [...groups.entries()].map(([title, flags]) => ({
      title,
      state: flags.changed || (flags.added && flags.removed) ? 'changed' : flags.added ? 'added' : 'removed',
    }));
  }
  if (key === 'ruleId') {
    const fromMap = ruleMapRows(file);
    if (fromMap) return fromMap;
  }
  const afterIds = idsOf(file.after, listKey, key);
  const beforeIds = idsOf(file.before, listKey, key);
  if (!afterIds.length && !beforeIds.length) return [{ title: fallback, state: file.state }];
  const rows: SummaryRow[] = afterIds.map(title => ({
    title,
    state: beforeIds.includes(title) ? 'changed' : 'added',
  }));
  for (const title of beforeIds) {
    if (!afterIds.includes(title)) rows.push({ title, state: 'removed' });
  }
  return rows;
}

function fileTitle(file: PromptSummaryFile): string {
  const stem = (file.file.split('/').pop() || file.file).replace(/\.defs\.ts$/u, '');
  if (file.file.startsWith('ontology/') || file.file.includes('/ontology/')) {
    return textAt(file.after, ['title']) || textAt(file.before, ['title']) || stem;
  }
  if (file.file.startsWith('journeys/') || file.file.includes('/journeys/')) {
    return textAt(file.after, ['business', 'title']) || textAt(file.before, ['business', 'title']) || stem;
  }
  return stem;
}

function isIndexFile(file: string): boolean {
  return file === 'index.defs.ts' || file.endsWith('/index.defs.ts');
}

function isNamedFile(file: string, name: string): boolean {
  return file === name || file.endsWith(`/${name}`);
}

/** `tobeDiff` writes a rules-map key as `$.rules.<ruleId>` (the value is a string, not `{ ruleId }`). */
function ruleMapKey(jsonPath: string): string | null {
  const match = /\$\.rules\.([^.\[]+)/u.exec(jsonPath);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); }
  catch (error) {
    console.error('[agentNewReleasePrompt] summary rule key is not decodable', error);
    return match[1];
  }
}

function ruleMap(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || !isRecord(value.rules) || Array.isArray(value.rules)) return null;
  return value.rules;
}

function ruleMapRows(file: PromptSummaryFile): SummaryRow[] | null {
  const before = ruleMap(file.before);
  const after = ruleMap(file.after);
  if (!before && !after) return null;
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])].sort();
  const rows: SummaryRow[] = [];
  for (const title of keys) {
    const left = before ? Object.prototype.hasOwnProperty.call(before, title) : false;
    const right = after ? Object.prototype.hasOwnProperty.call(after, title) : false;
    if (left && right && stableEnough(before?.[title], after?.[title])) continue;
    const state: PromptSummaryState = left && right ? 'changed' : right ? 'added' : 'removed';
    rows.push({ title, state });
  }
  return rows.length ? rows : [{ title: 'rules', state: file.state }];
}

function stableEnough(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function idInPath(jsonPath: string, key: string): string | null {
  const match = new RegExp(`\\[${key}=([^\\]]+)\\]`, 'u').exec(jsonPath);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); }
  catch (error) {
    console.error('[agentNewReleasePrompt] summary id is not decodable', error);
    return match[1];
  }
}

function idsOf(value: unknown, listKey: 'rules' | 'grants', idKey: 'ruleId' | 'grantId'): string[] {
  if (!isRecord(value) || !Array.isArray(value[listKey])) return [];
  const ids: string[] = [];
  for (const item of value[listKey]) {
    if (!isRecord(item) || typeof item[idKey] !== 'string' || !item[idKey]) continue;
    ids.push(item[idKey]);
  }
  return ids;
}

function textAt(value: unknown, path: readonly string[]): string | null {
  let cursor = value;
  for (const key of path) {
    if (!isRecord(cursor)) return null;
    cursor = cursor[key];
  }
  return typeof cursor === 'string' && cursor ? cursor : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
