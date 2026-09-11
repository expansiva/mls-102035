/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/integration70/contracts.ts" enhancement="_blank"/>

import { normalizeModuleName } from '/_102035_/l2/solution/fs.js';
import {
  NS5_INTEGRATION_SCHEMA_VERSION,
  type Ns5IntegrationArtifact,
  type Ns5IntegrationItem,
  type Ns5IntegrationPlugin,
} from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const ITEM_KINDS = new Set(['moduleEndpoint', 'event', 'external']);

/**
 * Closed platform plugin catalog. E6 recommendations of kind plugin are free-form ids; NS5
 * reuses the ids E6 has actually named (ce11: stripe / cardPayment). Domain vocabulary does
 * not belong here.
 */
export const NS5_PLUGIN_CATALOG = [
  { pluginId: 'stripe', terms: ['stripe'] },
  { pluginId: 'cardPayment', terms: ['cardPayment', 'card payment'] },
] as const;

export const NS5_PLUGIN_IDS: readonly string[] = NS5_PLUGIN_CATALOG.map(item => item.pluginId);

export type Ns5IntegrationItemKind = 'moduleEndpoint' | 'event' | 'external';

export interface Ns5IntegrationNormalization {
  inbound: Ns5IntegrationItem[];
  outbound: Ns5IntegrationItem[];
  plugins: Ns5IntegrationPlugin[];
}

export interface Ns5IntegrationActorView {
  actorId: string;
  kind: string;
}

export interface Ns5IntegrationEntityView {
  entityId: string;
}

export interface Ns5IntegrationSignal {
  kind: 'systemActor' | 'pluginTerm';
  actorId?: string;
  pluginId?: string;
  term?: string;
}

export function buildNs5IntegrationTool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5Integration',
    'Submit what enters and leaves the module: inbound/outbound module endpoints, events and externals, plus platform plugins. Empty lists are valid only when no structural signal exists.',
    schema,
  );
}

export function normalizeNs5IntegrationPayload(value: unknown): Ns5IntegrationNormalization {
  const root = record(value);
  return {
    inbound: list(root.inbound).map(item => normalizeItem(item)).filter(item => item.id || item.description),
    outbound: list(root.outbound).map(item => normalizeItem(item)).filter(item => item.id || item.description),
    plugins: list(root.plugins).map(normalizePlugin).filter(plugin => plugin.pluginId || plugin.description),
  };
}

export function buildNs5IntegrationArtifact(
  moduleName: string,
  inbound: Ns5IntegrationItem[],
  outbound: Ns5IntegrationItem[],
  plugins: Ns5IntegrationPlugin[],
): Ns5IntegrationArtifact {
  return {
    schemaVersion: NS5_INTEGRATION_SCHEMA_VERSION,
    moduleName,
    inbound,
    outbound,
    plugins,
  };
}

export function collectNs5IntegrationSignals(
  actors: readonly Ns5IntegrationActorView[],
  sourcePrompt: string,
): Ns5IntegrationSignal[] {
  const signals: Ns5IntegrationSignal[] = [];
  const seen = new Set<string>();
  const add = (signal: Ns5IntegrationSignal) => {
    const key = [signal.kind, signal.actorId || '', signal.pluginId || '', signal.term || ''].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    signals.push(signal);
  };

  for (const actor of actors) {
    if (actor.kind === 'system' && actor.actorId) {
      add({ kind: 'systemActor', actorId: actor.actorId });
    }
  }

  for (const plugin of NS5_PLUGIN_CATALOG) {
    for (const term of plugin.terms) {
      if (!promptMentionsTerm(sourcePrompt, term)) continue;
      add({ kind: 'pluginTerm', pluginId: plugin.pluginId, term });
    }
  }

  return signals;
}

export function isNs5PluginId(value: string): boolean {
  return NS5_PLUGIN_IDS.includes(value);
}

export function promptMentionsTerm(sourcePrompt: string, term: string): boolean {
  const trimmed = term.trim();
  if (!trimmed) return false;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|[^A-Za-z0-9])${escaped}(?:$|[^A-Za-z0-9])`, 'i').test(sourcePrompt || '');
}

function normalizeItem(value: unknown): Ns5IntegrationItem {
  const source = record(value);
  const kind = text(source.kind);
  const from = memberId(text(source.from), '');
  const to = memberId(text(source.to), '');
  return {
    id: memberId(text(source.id) || text(source.itemId), ''),
    kind: ITEM_KINDS.has(kind) ? kind as Ns5IntegrationItemKind : 'event',
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    description: text(source.description),
    entityRefs: unique(strings(source.entityRefs).map(item => entityId(item)).filter(Boolean)),
  };
}

function normalizePlugin(value: unknown): Ns5IntegrationPlugin {
  const source = record(value);
  return {
    pluginId: memberId(text(source.pluginId) || text(source.id), ''),
    description: text(source.description),
    entityRefs: unique(strings(source.entityRefs).map(item => entityId(item)).filter(Boolean)),
  };
}

function memberId(value: string, fallback: string): string {
  const trimmed = (value || '').trim();
  if (MEMBER_ID.test(trimmed)) return trimmed;
  const id = normalizeModuleName(trimmed || fallback, fallback);
  return MEMBER_ID.test(id) ? id : fallback;
}

function entityId(value: string): string {
  const trimmed = (value || '').trim();
  return ENTITY_ID.test(trimmed) ? trimmed : '';
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
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

function strings(value: unknown): string[] {
  return list(value).map(text).filter(Boolean);
}
