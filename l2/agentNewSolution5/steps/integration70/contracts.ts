/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/integration70/contracts.ts" enhancement="_blank"/>

import { normalizeModuleName } from '/_102035_/l2/solution/fs.js';
import type { Ns5SiblingModule } from '/_102035_/l2/agentNewSolution5/helpers/ns5Siblings.js';
import {
  NS5_INTEGRATION_SCHEMA_VERSION,
  type Ns5IntegrationArtifact,
  type Ns5IntegrationItem,
  type Ns5IntegrationPlugin,
} from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const ITEM_KINDS = new Set(['moduleEndpoint', 'event', 'external']);
const EFFECTS = new Set(['create', 'update', 'transition']);
const OUTBOUND_ON = /^([A-Z][A-Za-z0-9]*)\.(create|[a-z][A-Za-z0-9]*)$/;
const USED_BY = /^([a-z][A-Za-z0-9]*)\.([a-z][A-Za-z0-9]*)$/;
const INBOUND_EVENT_REF = /^([a-z][A-Za-z0-9]*)\.([a-z][A-Za-z0-9]*)$/;

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
export type Ns5IntegrationEffect = 'create' | 'update' | 'transition';

export const NS5_INTEGRATION_DROP_TRANSITION_REF = 'dropTransitionRef' as const;

export interface Ns5IntegrationFormNormalization {
  kind: typeof NS5_INTEGRATION_DROP_TRANSITION_REF;
  inboundId: string;
  detail: string;
}

export interface Ns5IntegrationNormalization {
  inbound: Ns5IntegrationItem[];
  outbound: Ns5IntegrationItem[];
  plugins: Ns5IntegrationPlugin[];
  normalizations: Ns5IntegrationFormNormalization[];
}

export interface Ns5IntegrationActorView {
  actorId: string;
  kind: string;
}

export interface Ns5IntegrationEntityView {
  entityId: string;
  writer?: 'journey' | 'crud' | 'inbound';
  transitions?: ReadonlyArray<{ transitionId: string }>;
}

export interface Ns5IntegrationJourneyView {
  journeyId: string;
  stepIds: string[];
}

export interface Ns5IntegrationProcessView {
  processId: string;
  taskIds: string[];
}

export interface Ns5IntegrationSignal {
  kind: 'systemActor' | 'pluginTerm' | 'siblingPresent' | 'siblingTerm';
  actorId?: string;
  pluginId?: string;
  term?: string;
  moduleName?: string;
}

export interface Ns5InboundPendingRequest {
  targetModule: string;
  requestedBy: string;
  eventId: string;
  on?: string;
  entityRefs: string[];
  description: string;
  to?: string;
}

export function buildNs5IntegrationTool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5Integration',
    'Submit what enters and leaves the module: inbound events that write entities, outbound events bound to a transition or create, and platform plugins used by a journey step or process task. Empty lists are valid only when no structural signal exists.',
    schema,
  );
}

export function normalizeNs5IntegrationPayload(value: unknown): Ns5IntegrationNormalization {
  const root = record(value);
  const normalizations: Ns5IntegrationFormNormalization[] = [];
  return {
    inbound: list(root.inbound)
      .map(item => normalizeInbound(item, normalizations))
      .filter(item => item.id || item.description),
    outbound: list(root.outbound).map(item => normalizeOutbound(item)).filter(item => item.id || item.description),
    plugins: list(root.plugins).map(normalizePlugin).filter(plugin => plugin.pluginId || plugin.description),
    normalizations,
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
  siblings: readonly { moduleName: string }[] = [],
): Ns5IntegrationSignal[] {
  const signals: Ns5IntegrationSignal[] = [];
  const seen = new Set<string>();
  const add = (signal: Ns5IntegrationSignal) => {
    const key = [signal.kind, signal.actorId || '', signal.pluginId || '', signal.term || '', signal.moduleName || ''].join('|');
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

  if (siblings.length) add({ kind: 'siblingPresent' });
  for (const sibling of siblings) {
    if (!sibling.moduleName) continue;
    if (!promptMentionsTerm(sourcePrompt, sibling.moduleName)) continue;
    add({ kind: 'siblingTerm', moduleName: sibling.moduleName, term: sibling.moduleName });
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

export function parseNs5OutboundOn(on: string): { entityId: string; transitionId: string } | null {
  const match = OUTBOUND_ON.exec((on || '').trim());
  if (!match) return null;
  return { entityId: match[1], transitionId: match[2] };
}

export function parseNs5UsedBy(ref: string): { ownerId: string; memberId: string } | null {
  const match = USED_BY.exec((ref || '').trim());
  if (!match) return null;
  return { ownerId: match[1], memberId: match[2] };
}

export function parseNs5InboundEventRef(event: string): { moduleName: string; eventId: string } | null {
  const match = INBOUND_EVENT_REF.exec((event || '').trim());
  if (!match) return null;
  return { moduleName: match[1], eventId: match[2] };
}

export function inboundEventId(item: Ns5IntegrationItem): string {
  return item.event || item.id;
}

export function collectNs5InboundPending(
  inbound: readonly Ns5IntegrationItem[],
  requestedBy: string,
  siblings: readonly Ns5SiblingModule[],
): Ns5InboundPendingRequest[] {
  const siblingByName = new Map(siblings.map(item => [item.moduleName, item]));
  const pending: Ns5InboundPendingRequest[] = [];
  const seen = new Set<string>();
  for (const item of inbound) {
    if (item.kind === 'external') continue;
    const from = item.from || '';
    if (!from || from === 'organization') continue;
    const eventId = inboundEventId(item);
    if (!eventId) continue;
    const key = `${from}|${eventId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const suggestion = item.transitionRef
      || (item.writes?.[0] && item.effect ? `${item.writes[0]}.${item.effect}` : undefined);
    const entityRefs = unique([...(item.writes || []), ...item.entityRefs]);
    const sibling = siblingByName.get(from);
    if (sibling) {
      if (sibling.events.some(event => event.eventId === eventId)) continue;
      pending.push({
        targetModule: from,
        requestedBy,
        eventId,
        ...(suggestion ? { on: suggestion } : {}),
        entityRefs,
        description: item.description,
      });
      continue;
    }
    pending.push({
      targetModule: 'organization',
      requestedBy,
      eventId,
      ...(suggestion ? { on: suggestion } : {}),
      entityRefs,
      description: item.description,
      to: from,
    });
  }
  return pending;
}

function normalizeInbound(value: unknown, normalizations: Ns5IntegrationFormNormalization[]): Ns5IntegrationItem {
  const source = record(value);
  const kind = text(source.kind);
  const from = memberId(text(source.from), '');
  const event = memberId(text(source.event), '');
  const effect = text(source.effect);
  const writes = unique(strings(source.writes).map(item => entityId(item)).filter(Boolean));
  const entityRefs = unique(strings(source.entityRefs).map(item => entityId(item)).filter(Boolean));
  const resolvedWrites = writes.length ? writes : entityRefs;
  const resolvedEffect = EFFECTS.has(effect) ? effect as Ns5IntegrationEffect : 'create';
  const rawTransitionRef = memberId(text(source.transitionRef), '');
  const id = memberId(text(source.id) || text(source.itemId), '');
  if (rawTransitionRef && resolvedEffect !== 'transition') {
    normalizations.push({
      kind: NS5_INTEGRATION_DROP_TRANSITION_REF,
      inboundId: id,
      detail: `transitionRef ${rawTransitionRef} dropped; effect is ${resolvedEffect || '(missing)'}.`,
    });
  }
  const transitionRef = resolvedEffect === 'transition' ? rawTransitionRef : '';
  return {
    id,
    kind: ITEM_KINDS.has(kind) ? kind as Ns5IntegrationItemKind : 'event',
    ...(from ? { from } : {}),
    ...(event ? { event } : {}),
    writes: resolvedWrites,
    effect: resolvedEffect,
    ...(transitionRef ? { transitionRef } : {}),
    description: text(source.description),
    entityRefs: [],
  };
}

function normalizeOutbound(value: unknown): Ns5IntegrationItem {
  const source = record(value);
  const kind = text(source.kind);
  const to = memberId(text(source.to), '');
  const from = memberId(text(source.from), '');
  const event = memberId(text(source.event) || text(source.id) || text(source.itemId), '');
  const on = text(source.on);
  return {
    id: memberId(text(source.id) || text(source.itemId), ''),
    kind: ITEM_KINDS.has(kind) ? kind as Ns5IntegrationItemKind : 'event',
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(event ? { event } : {}),
    ...(OUTBOUND_ON.test(on) ? { on } : {}),
    description: text(source.description),
    entityRefs: unique(strings(source.entityRefs).map(item => entityId(item)).filter(Boolean)),
  };
}

function normalizePlugin(value: unknown): Ns5IntegrationPlugin {
  const source = record(value);
  const usedBy = unique(strings(source.usedBy).filter(item => USED_BY.test(item)));
  return {
    pluginId: memberId(text(source.pluginId) || text(source.id), ''),
    description: text(source.description),
    usedBy,
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
