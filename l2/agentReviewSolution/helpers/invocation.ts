/// <mls fileReference="_102035_/l2/agentReviewSolution/helpers/invocation.ts" enhancement="_blank" />

import { resolveL4Folders } from '/_102035_/l2/newRelease/helpers/moduleRevision.js';

export interface ReviewInvocation {
  project: number;
  moduleName: string;
  baseId: string;
  originalL4Path: string;
  temporaryL4Path: string;
  request: string;
  /** UI supplies this; CLI freezes the active revision when omitted. */
  expectedRevisionId?: string | null;
}

const MODULE = /^[a-z][A-Za-z0-9]{0,59}$/u;
const REVISION = /^[a-zA-Z0-9-]+$/u;
const PREFIX = /^@@agentReviewSolution(?:\s+|$)/u;

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Parse before creating any LLM work. No path is interpreted as a filesystem path or shell command. */
export function parseReviewInvocation(value: string | unknown, project: number): ReviewInvocation {
  if (!Number.isInteger(project) || project <= 0) throw new Error('Select a valid project before reviewing a module.');
  let raw: unknown = value;
  if (typeof value === 'string') {
    const body = value.trim().replace(PREFIX, '').trim();
    try { raw = JSON.parse(body); }
    catch { throw new Error('Provide one valid JSON object after @@agentReviewSolution.'); }
  }
  if (!record(raw)) throw new Error('Review invocation must be one JSON object.');
  const allowed = new Set(['moduleName', 'originalL4Path', 'temporaryL4Path', 'request', 'expectedRevisionId']);
  const unexpected = Object.keys(raw).find(key => !allowed.has(key));
  if (unexpected) throw new Error(`Unexpected review field: ${unexpected}.`);
  const moduleName = raw.moduleName;
  if (typeof moduleName !== 'string' || !MODULE.test(moduleName)) throw new Error('moduleName must be lowerCamel.');
  const originalL4Path = raw.originalL4Path;
  const temporaryL4Path = raw.temporaryL4Path;
  if (typeof originalL4Path !== 'string' || typeof temporaryL4Path !== 'string') throw new Error('Both L4 folder references are required.');
  const expectedPrefix = `l4/${moduleName}/pipeline/releases/`;
  const suffix = '/l4';
  if (!originalL4Path.startsWith(expectedPrefix) || !originalL4Path.endsWith(suffix)) throw new Error('Original L4 folder does not belong to the selected module.');
  const baseId = originalL4Path.slice(expectedPrefix.length, -suffix.length);
  if (!REVISION.test(baseId)) throw new Error('Invalid base identifier in originalL4Path.');
  const folders = resolveL4Folders(project, moduleName, baseId);
  if (originalL4Path !== folders.originalL4Path || temporaryL4Path !== folders.temporaryL4Path) {
    throw new Error('L4 folder references must match the captured base and the module candidate exactly.');
  }
  const request = raw.request;
  if (typeof request !== 'string' || !request.trim() || request.length > 10_000) throw new Error('request must be non-empty text of at most 10000 characters.');
  const expected = raw.expectedRevisionId;
  if ('expectedRevisionId' in raw && expected !== null && (typeof expected !== 'string' || !REVISION.test(expected))) {
    throw new Error('Invalid expectedRevisionId.');
  }
  return {
    project, moduleName, baseId, originalL4Path, temporaryL4Path, request: request.trim(),
    ...('expectedRevisionId' in raw ? { expectedRevisionId: expected as string | null } : {}),
  };
}
