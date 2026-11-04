/// <mls fileReference="_102035_/l2/solution/helpers/ns4WorkerTools.ts" enhancement="_blank"/>

/**
 * Shared mechanics for strict artifact workers.  Step-specific artifact schemas stay under
 * `schemas/`; this helper only makes their result a payload that collab-messages can schedule.
 */
export function createNs4FlexibleWorkerTool(
  toolName: string,
  description: string,
  artifactSchema: Record<string, unknown>,
): mls.msg.LLMTool {
  const result: Record<string, unknown> = { ...artifactSchema };
  const defs = result.$defs;
  delete result.$defs;
  delete result.$id;
  delete result.$schema;
  const parameters: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'result'],
    properties: {
      type: { type: 'string', const: 'flexible' },
      result,
    },
  };
  if (isRecord(defs)) parameters.$defs = defs;
  return { type: 'function', function: { name: toolName, description, parameters } } as mls.msg.LLMTool;
}

/** Keeps already persisted raw worker payloads resumable while new workers use the envelope. */
export function unwrapNs4FlexibleWorkerPayload(value: unknown): unknown {
  const root = parse(value);
  const payload = isRecord(root) && root.type === 'flexible' ? parse(root.result) : root;
  const argumentsValue = toolArguments(payload);
  if (argumentsValue === undefined) return payload;
  const argumentsPayload = parse(argumentsValue);
  return isRecord(argumentsPayload) && argumentsPayload.type === 'flexible'
    ? parse(argumentsPayload.result)
    : argumentsPayload;
}

function toolArguments(value: unknown): unknown {
  if (!isRecord(value)) return undefined;
  if ('arguments' in value) return value.arguments;
  const calls = value.tool_calls;
  if (!Array.isArray(calls) || !isRecord(calls[0])) return undefined;
  const call = calls[0];
  return isRecord(call.function) && 'arguments' in call.function ? call.function.arguments : call.arguments;
}

function parse(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); } catch { /* the provider may close the object twice: see below */ }
  const trimmed = withoutStrayClosers(clean);
  if (trimmed === null) return value;
  console.warn('[ns4WorkerTools] tool arguments carried stray closing brackets after the JSON value; they were dropped.');
  try { return JSON.parse(trimmed); } catch { return value; }
}

/** The JSON value without extra `}` or `]` after it, or null when the text is not that case. */
function withoutStrayClosers(text: string): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{' || char === '[') depth++;
    else if ((char === '}' || char === ']') && --depth === 0) {
      return /^[\s}\]]+$/u.test(text.slice(index + 1)) ? text.slice(0, index + 1) : null;
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
