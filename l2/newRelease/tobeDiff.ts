/// <mls fileReference="_102035_/l2/newRelease/tobeDiff.ts" enhancement="_blank" />

export interface NewReleaseDiffEntry {
  jsonPath: string;
  before?: unknown;
  after?: unknown;
}

const ID_KEYS = [
  'journeyId', 'entityId', 'ruleId', 'actorId', 'grantId', 'processId', 'taskId',
  'stepId', 'relationshipId', 'transitionId', 'fieldId', 'decisionId', 'id',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}

export function stableStringifyTobe(value: unknown): string {
  return JSON.stringify(stable(value));
}

export async function sha256Tobe(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableStringifyTobe(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function identityKey(before: unknown[], after: unknown[]): string | null {
  const records = [...before, ...after];
  if (!records.length || records.some(item => !isRecord(item))) return null;
  for (const key of ID_KEYS) {
    if (records.every(item => typeof (item as Record<string, unknown>)[key] === 'string')) return key;
  }
  return null;
}

function token(value: unknown): string {
  return encodeURIComponent(String(value));
}

function same(before: unknown, after: unknown): boolean {
  return stableStringifyTobe(before) === stableStringifyTobe(after);
}

function walk(before: unknown, after: unknown, path: string, result: NewReleaseDiffEntry[]): void {
  if (same(before, after)) return;

  if (Array.isArray(before) && Array.isArray(after)) {
    const key = identityKey(before, after);
    if (key) {
      const left = new Map(before.map(item => [String((item as Record<string, unknown>)[key]), item]));
      const right = new Map(after.map(item => [String((item as Record<string, unknown>)[key]), item]));
      const ids = [...new Set([...left.keys(), ...right.keys()])];
      for (const id of ids) walk(left.get(id), right.get(id), `${path}[${key}=${token(id)}]`, result);
      return;
    }
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length; index += 1) walk(before[index], after[index], `${path}[${index}]`, result);
    return;
  }

  if (isRecord(before) && isRecord(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    for (const key of keys) {
      const left = before[key];
      const right = after[key];
      if (/Id$/u.test(key) && left !== undefined && right !== undefined && left !== right) {
        result.push({ jsonPath: `${path}.${key}[removed=${token(left)}]`, before: left });
        result.push({ jsonPath: `${path}.${key}[added=${token(right)}]`, after: right });
        continue;
      }
      walk(left, right, `${path}.${key}`, result);
    }
    return;
  }

  result.push({ jsonPath: path, ...(before === undefined ? {} : { before }), ...(after === undefined ? {} : { after }) });
}

/** Structural JSON diff. Arrays with a stable `*Id` are compared by id, not position. */
export function tobeDiff(asis: unknown, tobe: unknown): NewReleaseDiffEntry[] {
  const result: NewReleaseDiffEntry[] = [];
  walk(asis, tobe, '$', result);
  return result;
}

