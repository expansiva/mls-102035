/// <mls fileReference="_102035_/l2/solution/testing/recordedLlm.ts" enhancement="_blank" />

/**
 * Test helper: the model of a rehearsal. In `record` mode the real call goes through and its RAW answer (the
 * provider's, before any normalization) is saved under agent/step/hash of the request. In `replay` mode the saved
 * answer comes back, and a request with no recording fails with the key that is missing, without calling the model.
 * The suite runs in `replay`; `record` is for the paid pass that makes the recordings.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type RecordedLlmMode = 'record' | 'replay';

export interface RecordedLlmStore {
  /** `request` lets a store match by content when the exact key is not there. */
  read(key: string, request?: RecordedLlmRequest): string | null;
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

/** The recording host drops blank lines and the indentation of the lines in the prompts it sends: the same text with or without them is the same prompt. */
function sameText(left: string, right: string): boolean {
  const canonical = (text: string) => text.replace(/[ \t]*\n\s*/gu, '\n').trim();
  return canonical(left) === canonical(right);
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
export type RecordedLlmFallbackKind = 'hash-other-step' | 'human-prompt' | 'unit-label';

export interface RecordedLlmFallback {
  kind: RecordedLlmFallbackKind;
  /** The key the agent asked for, and the recording that answered it. */
  key: string;
  file: string;
}

/** Every use of a fallback goes to the log of the test: an old answer never enters silently after a prompt changed. */
export function fileRecordedLlmStore(
  dir: string,
  onFallback: (use: RecordedLlmFallback) => void = use => console.warn(`[recordedLlm] fallback ${use.kind}: ${use.key} -> ${use.file}`),
): RecordedLlmStore {
  const fileOf = (key: string) => path.join(dir, `${key}.json`);
  return {
    read(key, request) {
      const readRaw = (file: string): string | null => {
        try {
          return (JSON.parse(readFileSync(file, 'utf8')) as { raw: string }).raw;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
          throw error;
        }
      };
      const exact = readRaw(fileOf(key));
      if (exact !== null) return exact;
      // The step label of a worker is its planId, or `step<stepId>` when it has none, and the stepId depends on the host that
      // recorded it. The hash is the request, so look for the same agent and hash under any step label.
      const [agent, , hash] = key.split('/');
      let steps: string[];
      try { steps = readdirSync(path.join(dir, agent)); } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
      }
      for (const step of steps) {
        const file = path.join(dir, agent, step, `${hash}.json`);
        const found = readRaw(file);
        if (found !== null) { onFallback({ kind: 'hash-other-step', key, file }); return found; }
      }
      if (!request) return null;
      // The system prompt and the tools are what the recording host sent: its copy of the agent files and its tool wrapping
      // differ from this host's. The human prompt is the data of the request, so the same human prompt is the same request.
      for (const step of steps) {
        for (const name of readdirSync(path.join(dir, agent, step))) {
          const saved = JSON.parse(readFileSync(path.join(dir, agent, step, name), 'utf8')) as { raw: string; request?: { humanPrompt?: string } };
          if (saved.request?.humanPrompt !== undefined && sameText(saved.request.humanPrompt, request.humanPrompt)) {
            onFallback({ kind: 'human-prompt', key, file: path.join(dir, agent, step, name) });
            return saved.raw;
          }
        }
      }
      // A unit with its own stable label (a page, a usecase) recorded once under that label: the label is the identity of the
      // request. Last resort, since it does not notice a change in what the prompt carries.
      const [, label] = key.split('/');
      let own: string[] = [];
      try { own = readdirSync(path.join(dir, agent, label)); } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      if (own.length === 1) {
        const file = path.join(dir, agent, label, own[0]);
        onFallback({ kind: 'unit-label', key, file });
        return readRaw(file);
      }
      return null;
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
        const raw = options.store.read(key, request);
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
