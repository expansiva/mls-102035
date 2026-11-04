/// <mls fileReference="_102035_/l2/solution/testing/recordedLlm.ts" enhancement="_blank" />

/**
 * Test helper: the model of a rehearsal. In `record` mode the real call goes through and its RAW answer (the
 * provider's, before any normalization) is saved under agent/step/hash of the request. In `replay` mode the saved
 * answer comes back, and a request with no recording fails with the key that is missing, without calling the model.
 * The suite runs in `replay`; `record` is for the paid pass that makes the recordings.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type RecordedLlmMode = 'record' | 'replay';

export interface RecordedLlmStore {
  read(key: string): string | null;
  write(key: string, raw: string): void;
}

export interface RecordedLlmRequest {
  systemPrompt: string;
  humanPrompt: string;
  /** Tool schemas, in the order the agent sends them. */
  tools?: unknown;
}

export interface RecordedLlmOptions {
  mode: RecordedLlmMode;
  store: RecordedLlmStore;
  /** The real call. Required in `record` mode, never called in `replay`. */
  call?: (request: RecordedLlmRequest) => Promise<string>;
}

/** The same value gives the same text whatever the key order of its objects. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return `{${Object.keys(row).sort().map(key => `${JSON.stringify(key)}:${stable(row[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function recordedLlmKey(agent: string, step: string, request: RecordedLlmRequest): string {
  const hash = createHash('sha256').update(stable(request)).digest('hex').slice(0, 16);
  return `${agent}/${step}/${hash}`;
}

/** Recordings as `<dir>/<agent>/<step>/<hash>.json`, each file `{ "raw": "<provider answer>" }`. */
export function fileRecordedLlmStore(dir: string): RecordedLlmStore {
  const fileOf = (key: string) => path.join(dir, `${key}.json`);
  return {
    read(key) {
      try {
        return (JSON.parse(readFileSync(fileOf(key), 'utf8')) as { raw: string }).raw;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
      }
    },
    write(key, raw) {
      const file = fileOf(key);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, `${JSON.stringify({ raw }, null, 2)}\n`);
    },
  };
}

export function createRecordedLlm(options: RecordedLlmOptions) {
  return {
    async respond(agent: string, step: string, request: RecordedLlmRequest): Promise<string> {
      const key = recordedLlmKey(agent, step, request);
      if (options.mode === 'replay') {
        const raw = options.store.read(key);
        if (raw === null) throw new Error(`recordedLlm.missing:${key}`);
        return raw;
      }
      if (!options.call) throw new Error('recordedLlm.call_required_in_record_mode');
      const raw = await options.call(request);
      options.store.write(key, raw);
      return raw;
    },
  };
}
