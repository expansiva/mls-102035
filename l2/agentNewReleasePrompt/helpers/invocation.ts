/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/invocation.ts" enhancement="_blank" />

export const NRP_AGENT_NAME = 'agentNewReleasePrompt' as const;
export const NRP_CANDIDATE_REL = 'tobe/plan' as const;

export interface NrpInvocation {
  project: number;
  moduleName: string;
  request: string;
}

const MODULE = /^[a-z][A-Za-z0-9]{0,59}$/u;
const PREFIX = /^@@agentNewReleasePrompt(?:\s+|$)/u;

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function parseNrpInvocation(value: string | unknown, project: number): NrpInvocation {
  if (!Number.isInteger(project) || project <= 0) {
    throw new Error('Select a valid project before editing a module.');
  }
  let raw: unknown = value;
  if (typeof value === 'string') {
    const body = value.trim().replace(PREFIX, '').trim();
    try { raw = JSON.parse(body); }
    catch (error) {
      console.error('[agentNewReleasePrompt] invocation is not JSON', error);
      throw new Error('Provide one valid JSON object after @@agentNewReleasePrompt.');
    }
  }
  if (!record(raw)) throw new Error('Invocation must be one JSON object.');
  const allowed = new Set(['moduleName', 'request']);
  const unexpected = Object.keys(raw).find(key => !allowed.has(key));
  if (unexpected) throw new Error(`Unexpected field: ${unexpected}.`);
  const moduleName = raw.moduleName;
  if (typeof moduleName !== 'string' || !MODULE.test(moduleName)) throw new Error('moduleName must be lowerCamel.');
  const request = raw.request;
  if (typeof request !== 'string' || !request.trim() || request.length > 10_000) {
    throw new Error('request must be non-empty text of at most 10000 characters.');
  }
  return { project, moduleName, request: request.trim() };
}

export function serializeNrpInvocation(invocation: NrpInvocation): string {
  return JSON.stringify({ moduleName: invocation.moduleName, request: invocation.request });
}
