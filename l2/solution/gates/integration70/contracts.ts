/// <mls fileReference="_102035_/l2/solution/gates/integration70/contracts.ts" enhancement="_blank"/>

import { ns5ArrivalEffects, type Ns5ArrivalEffect, type Ns5ArrivalEntityEffects } from '/_102035_/l2/solution/arrivalEffects.js';
import { normalizeModuleName } from '/_102035_/l2/solution/fs.js';
import type { Ns5SiblingModule } from '/_102035_/l2/solution/ns5Siblings.js';
import { ns5ConnectionCatalogs, ns5ConnectionOperation, ns5ConnectionSignalHits } from '/_102035_/l2/solution/helpers/connectionCatalog.js';
import {
  NS5_INTEGRATION_SCHEMA_VERSION,
  NS5_INTEGRATION_SCHEMA_VERSION_V4,
  NS5_INTEGRATION_SCHEMA_VERSION_V5,
  type Ns5IntegrationArtifact,
  type Ns5IntegrationConnection,
  type Ns5IntegrationExternalSystem,
  type Ns5IntegrationItem,
  type Ns5IntegrationPlugin,
} from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const ITEM_KINDS = new Set(['moduleEndpoint', 'event', 'external']);
const EFFECTS = new Set(['create', 'update', 'transition']);
const CONNECTION_EFFECTS = new Set(['list', 'read', 'create', 'update', 'remove']);
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

export const NS5_INTEGRATION_INBOUND_MERGED_INTO_SERVE = 'inboundMergedIntoServe' as const;

export const NS5_INTEGRATION_DROP_EFFECT_WITHOUT_WRITES = 'dropEffectWithoutWrites' as const;

/** The arrival named `entityEffects` and also the older pair. The older pair is not stored. */
export const NS5_INTEGRATION_DROP_ARRIVAL_LEGACY_FIELDS = 'dropArrivalLegacyFields' as const;

/** Another arrival in the same artifact still used the old pair, so it was rewritten. */
export const NS5_INTEGRATION_UPGRADE_ARRIVAL_FORM = 'upgradeArrivalForm' as const;

export interface Ns5IntegrationFormNormalization {
  kind: typeof NS5_INTEGRATION_DROP_TRANSITION_REF
    | typeof NS5_INTEGRATION_INBOUND_MERGED_INTO_SERVE
    | typeof NS5_INTEGRATION_DROP_EFFECT_WITHOUT_WRITES
    | typeof NS5_INTEGRATION_DROP_ARRIVAL_LEGACY_FIELDS
    | typeof NS5_INTEGRATION_UPGRADE_ARRIVAL_FORM;
  inboundId: string;
  detail: string;
}

export interface Ns5IntegrationNormalization {
  inbound: Ns5IntegrationItem[];
  outbound: Ns5IntegrationItem[];
  plugins: Ns5IntegrationPlugin[];
  connections: Ns5IntegrationConnection[];
  /** Declared by this module (v4). Empty when it declares none. */
  externalSystems: Ns5IntegrationExternalSystem[];
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
  /** `connectionId` of an ontology entity `external`. Empty when the entity is not external. */
  externalConnectionId?: string;
}

export interface Ns5IntegrationJourneyView {
  journeyId: string;
  stepIds: string[];
}

export interface Ns5IntegrationProcessView {
  processId: string;
  taskIds: string[];
  /** The trigger of the process. An `event` that is `<system>.<operation>` is an arrival the module must declare (l4_p4_161). */
  trigger?: { kind: string; event?: string };
}

export interface Ns5IntegrationSignal {
  kind: 'systemActor' | 'pluginTerm' | 'connectionTerm' | 'siblingPresent' | 'siblingTerm' | 'externalEntitySystem';
  actorId?: string;
  pluginId?: string;
  term?: string;
  moduleName?: string;
  entityId?: string;
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

/**
 * `siblingSystems` are the `externalSystems` the sibling modules declare in their own L4: a row of `connections`
 * resolves against the platform catalogs, then this module's systems, then these.
 */
export function normalizeNs5IntegrationPayload(
  value: unknown,
  siblingSystems: readonly Ns5IntegrationExternalSystem[] = [],
): Ns5IntegrationNormalization {
  const root = record(value);
  const normalizations: Ns5IntegrationFormNormalization[] = [];
  const externalSystems = list(root.externalSystems).map(normalizeExternalSystem);
  const systems = [...externalSystems, ...siblingSystems];
  const connections = list(root.connections).map(row => normalizeConnection(row, systems, normalizations)).filter(item => item.connectionId || item.operationId || item.description);
  const inbound = list(root.inbound)
    .map(item => normalizeInbound(item, normalizations))
    .filter(item => item.id || item.description);
  const merged = mergeInboundIntoServe(inbound, connections, normalizations);
  const upgraded = ns5UpgradeArrivalForm(merged, connections);
  for (const row of upgraded.converted) {
    normalizations.push({
      kind: NS5_INTEGRATION_UPGRADE_ARRIVAL_FORM,
      inboundId: row.inboundId,
      detail: row.detail,
    });
  }
  return {
    inbound: upgraded.inbound,
    outbound: list(root.outbound).map(item => normalizeOutbound(item)).filter(item => item.id || item.description),
    plugins: list(root.plugins).map(normalizePlugin).filter(plugin => plugin.pluginId || plugin.description),
    connections: upgraded.connections,
    externalSystems,
    normalizations,
  };
}

/** True when `from` names a connection of the closed catalog (`cm`, `platform`). */
export function isNs5ConnectionId(value: string): boolean {
  return ns5ConnectionCatalogs().some(catalog => catalog.connectionId === value);
}

/**
 * An arrival from a connection of the catalog is a `serve` row of `connections`. The same arrival written
 * again as `inbound` (`kind: external`, `from` = the connection) is a duplicate: the L1 would open two doors
 * for it. It is dropped when a `serve` row of that connection names the same entity with a write effect
 * (`create`/`update`: the serve operation is one upsert). An `inbound` that no `serve` row matches stays,
 * and the gate charges it. The description moves to the serve row when that one has none.
 */
function mergeInboundIntoServe(
  inbound: Ns5IntegrationItem[],
  connections: Ns5IntegrationConnection[],
  normalizations: Ns5IntegrationFormNormalization[],
): Ns5IntegrationItem[] {
  return inbound.filter(item => {
    if (item.kind !== 'external' || !item.from || !isNs5ConnectionId(item.from)) return true;
    const writes = ns5ArrivalEffects(item, 'inbound')
      .filter(entry => entry.effects.includes('create') || entry.effects.includes('update'))
      .map(entry => entry.entityId);
    if (!writes.length) return true;
    const serve = connections.find(row => row.direction === 'serve'
      && row.connectionId === item.from
      && ns5ArrivalEffects(row, 'serve').some(entry => (
        (entry.effects.includes('create') || entry.effects.includes('update'))
        && writes.includes(entry.entityId)
      )));
    if (!serve) return true;
    if (!serve.description.trim() && item.description.trim()) serve.description = item.description;
    normalizations.push({
      kind: NS5_INTEGRATION_INBOUND_MERGED_INTO_SERVE,
      inboundId: item.id,
      detail: `inbound ${item.id} from ${item.from} repeats serve ${serve.connectionId}.${serve.operationId}; dropped.`,
    });
    return false;
  });
}

/**
 * The schema version of an integration artifact is a function of its content, computed here and nowhere else.
 * An arrival that carries `entityEffects` (even `[]`) makes it v5. Otherwise a declared system makes it v4,
 * and the rest stays v3, byte for byte. Any writer of the artifact uses this.
 */
export function ns5IntegrationSchemaVersion(
  externalSystems: readonly Ns5IntegrationExternalSystem[] | undefined,
  arrivals?: {
    inbound?: readonly { entityEffects?: readonly unknown[] }[];
    connections?: readonly { direction?: string; entityEffects?: readonly unknown[] }[];
  },
): typeof NS5_INTEGRATION_SCHEMA_VERSION | typeof NS5_INTEGRATION_SCHEMA_VERSION_V4 | typeof NS5_INTEGRATION_SCHEMA_VERSION_V5 {
  const inboundHas = (arrivals?.inbound || []).some(item => Array.isArray(item.entityEffects));
  const serveHas = (arrivals?.connections || []).some(row => row.direction === 'serve' && Array.isArray(row.entityEffects));
  if (inboundHas || serveHas) return NS5_INTEGRATION_SCHEMA_VERSION_V5;
  return externalSystems?.length ? NS5_INTEGRATION_SCHEMA_VERSION_V4 : NS5_INTEGRATION_SCHEMA_VERSION;
}

/**
 * When any arrival already says `entityEffects` (even `[]`), every other arrival is rewritten
 * to that form. An artifact with none is returned as the same arrays, byte for byte.
 * `call` rows and outbound rows are not arrivals.
 */
export function ns5UpgradeArrivalForm(
  inbound: readonly Ns5IntegrationItem[],
  connections: readonly Ns5IntegrationConnection[],
): {
  inbound: Ns5IntegrationItem[];
  connections: Ns5IntegrationConnection[];
  converted: Array<{ inboundId: string; detail: string }>;
} {
  const inboundNew = inbound.some(item => Array.isArray(item.entityEffects));
  const serveNew = connections.some(row => row.direction === 'serve' && Array.isArray(row.entityEffects));
  if (!inboundNew && !serveNew) {
    return {
      inbound: inbound as Ns5IntegrationItem[],
      connections: connections as Ns5IntegrationConnection[],
      converted: [],
    };
  }
  const converted: Array<{ inboundId: string; detail: string }> = [];
  const nextInbound = inbound.map(item => {
    if (Array.isArray(item.entityEffects)) return item;
    converted.push({
      inboundId: item.id,
      detail: `inbound ${item.id || '(missing)'} rewritten as entityEffects.`,
    });
    const { writes: _writes, effect: _effect, ...rest } = item;
    return { ...rest, entityEffects: ns5ArrivalEffects(item, 'inbound') };
  });
  const nextConnections = connections.map(row => {
    if (row.direction !== 'serve' || Array.isArray(row.entityEffects)) return row;
    const inboundId = `${row.connectionId}.${row.operationId}`;
    converted.push({
      inboundId,
      detail: `serve ${inboundId} rewritten as entityEffects.`,
    });
    const { entityRefs: _entityRefs, effect: _effect, ...rest } = row;
    return { ...rest, entityEffects: ns5ArrivalEffects(row, 'serve') };
  });
  return { inbound: nextInbound, connections: nextConnections, converted };
}

export function buildNs5IntegrationArtifact(
  moduleName: string,
  inbound: Ns5IntegrationItem[],
  outbound: Ns5IntegrationItem[],
  plugins: Ns5IntegrationPlugin[],
  connections: Ns5IntegrationConnection[] = [],
  externalSystems: Ns5IntegrationExternalSystem[] = [],
): Ns5IntegrationArtifact {
  return {
    schemaVersion: ns5IntegrationSchemaVersion(externalSystems, { inbound, connections }),
    moduleName,
    inbound,
    outbound,
    plugins,
    // Omitted when empty, so artifacts that name no connection stay byte-identical (replay fixtures).
    ...(connections.length ? { connections } : {}),
    ...(externalSystems.length ? { externalSystems } : {}),
  };
}

export function collectNs5IntegrationSignals(
  actors: readonly Ns5IntegrationActorView[],
  sourcePrompt: string,
  siblings: readonly { moduleName: string }[] = [],
  cited: {
    entities?: readonly { entityId?: string; externalConnectionId?: string }[];
    siblingSystems?: readonly { id: string }[];
  } = {},
): Ns5IntegrationSignal[] {
  const signals: Ns5IntegrationSignal[] = [];
  const seen = new Set<string>();
  const add = (signal: Ns5IntegrationSignal) => {
    const key = [signal.kind, signal.actorId || '', signal.pluginId || '', signal.term || '', signal.moduleName || '', signal.entityId || ''].join('|');
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

  for (const hit of ns5ConnectionSignalHits(sourcePrompt, promptMentionsTerm)) {
    add({ kind: 'connectionTerm', term: hit.term });
  }

  if (siblings.length) add({ kind: 'siblingPresent' });
  for (const sibling of siblings) {
    if (!sibling.moduleName) continue;
    if (!promptMentionsTerm(sourcePrompt, sibling.moduleName)) continue;
    add({ kind: 'siblingTerm', moduleName: sibling.moduleName, term: sibling.moduleName });
  }

  const catalogIds = new Set(ns5ConnectionCatalogs().map(catalog => catalog.connectionId));
  const siblingIds = new Set((cited.siblingSystems || []).map(system => system.id));
  for (const entity of cited.entities || []) {
    const id = entity.externalConnectionId;
    if (!entity.entityId || !id) continue;
    if (catalogIds.has(id) || siblingIds.has(id)) continue;
    add({ kind: 'externalEntitySystem', entityId: entity.entityId, term: id });
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
    const entries = ns5ArrivalEffects(item, 'inbound');
    const first = entries.find(entry => entry.effects.length);
    const suggestion = item.transitionRef
      || (first ? `${first.entityId}.${first.effects[0]}` : undefined);
    const entityRefs = unique([...entries.map(entry => entry.entityId), ...item.entityRefs]);
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
  const rawEffect = EFFECTS.has(effect) ? effect as Ns5IntegrationEffect : '';
  const rawTransitionRef = memberId(text(source.transitionRef), '');
  const id = memberId(text(source.id) || text(source.itemId), '');
  const identity = {
    id,
    kind: ITEM_KINDS.has(kind) ? kind as Ns5IntegrationItemKind : 'event' as const,
    ...(from ? { from } : {}),
    ...(event ? { event } : {}),
    description: text(source.description),
    entityRefs: [] as string[],
  };
  const entityEffects = readEntityEffects(source, EFFECTS);
  if (entityEffects) {
    if (resolvedWrites.length || rawEffect) {
      normalizations.push({
        kind: NS5_INTEGRATION_DROP_ARRIVAL_LEGACY_FIELDS,
        inboundId: id,
        detail: 'writes and effect dropped; entityEffects kept.',
      });
    }
    const transitions = entityEffects.some(entry => entry.effects.includes('transition'));
    if (rawTransitionRef && !transitions) {
      normalizations.push({
        kind: NS5_INTEGRATION_DROP_TRANSITION_REF,
        inboundId: id,
        detail: `transitionRef ${rawTransitionRef} dropped; no entry transitions.`,
      });
    }
    return {
      ...identity,
      entityEffects,
      ...(transitions && rawTransitionRef ? { transitionRef: rawTransitionRef } : {}),
    };
  }
  const base = { ...identity, writes: resolvedWrites };
  if (!resolvedWrites.length) {
    normalizations.push({
      kind: NS5_INTEGRATION_DROP_EFFECT_WITHOUT_WRITES,
      inboundId: id,
      detail: rawEffect || 'missing',
    });
    return base;
  }
  const resolvedEffect = rawEffect || 'create';
  if (rawTransitionRef && resolvedEffect !== 'transition') {
    normalizations.push({
      kind: NS5_INTEGRATION_DROP_TRANSITION_REF,
      inboundId: id,
      detail: `transitionRef ${rawTransitionRef} dropped; effect is ${resolvedEffect || '(missing)'}.`,
    });
  }
  const transitionRef = resolvedEffect === 'transition' ? rawTransitionRef : '';
  return {
    ...base,
    effect: resolvedEffect,
    ...(transitionRef ? { transitionRef } : {}),
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

function normalizeExternalSystem(value: unknown): Ns5IntegrationExternalSystem {
  const source = record(value);
  return {
    id: text(source.id),
    title: text(source.title),
    description: text(source.description),
    settings: list(source.settings).map(item => {
      const setting = record(item);
      return { id: text(setting.id), title: text(setting.title), description: text(setting.description), secret: setting.secret as boolean };  // not coerced: the gate refuses a missing flag
    }),
    operations: list(source.operations).map(item => {
      const operation = record(item);
      return {
        operationId: text(operation.operationId),
        direction: text(operation.direction) as 'call' | 'serve',  // not coerced: the gate refuses any other value
        description: text(operation.description),
      };
    }),
  };
}

function normalizeConnection(
  value: unknown,
  systems: readonly Ns5IntegrationExternalSystem[],
  normalizations: Ns5IntegrationFormNormalization[],
): Ns5IntegrationConnection {
  const source = record(value);
  const connectionId = text(source.connectionId);
  const operationId = text(source.operationId);
  const operation = ns5ConnectionOperation(connectionId, operationId, systems);
  const direction = operation?.direction ?? 'call';
  const effect = text(source.effect);
  const entityRefs = unique(strings(source.entityRefs).map(item => entityId(item)).filter(Boolean));
  const entityEffects = readEntityEffects(source, CONNECTION_EFFECTS);
  const base = {
    connectionId,
    operationId,
    direction,
    // call names a journey.step or process.task; serve is prose of what the arrival does.
    usedBy: unique(strings(source.usedBy).filter(item => direction === 'serve' || USED_BY.test(item))),
    description: text(source.description),
  };
  const legacyEffect = CONNECTION_EFFECTS.has(effect) ? effect as Ns5IntegrationConnection['effect'] : undefined;
  if (direction === 'call' || !entityEffects) {
    if (direction === 'call' && entityEffects && entityEffects.length) {
      normalizations.push({
        kind: NS5_INTEGRATION_DROP_ARRIVAL_LEGACY_FIELDS,
        inboundId: `${connectionId}.${operationId}`,
        detail: 'entityEffects dropped; a call keeps entityRefs and effect.',
      });
    }
    return {
      ...base,
      ...(entityRefs.length ? { entityRefs } : {}),
      ...(legacyEffect ? { effect: legacyEffect } : {}),
    };
  }
  if (entityRefs.length || legacyEffect) {
    normalizations.push({
      kind: NS5_INTEGRATION_DROP_ARRIVAL_LEGACY_FIELDS,
      inboundId: `${connectionId}.${operationId}`,
      detail: 'entityRefs and effect dropped; entityEffects kept.',
    });
  }
  return { ...base, entityEffects };
}

function readEntityEffects(
  source: Record<string, unknown>,
  vocabulary: ReadonlySet<string>,
): Ns5ArrivalEntityEffects[] | undefined {
  if (!Array.isArray(source.entityEffects)) return undefined;
  return source.entityEffects.map(item => {
    const row = record(item);
    const seen = new Set<string>();
    const effects: Ns5ArrivalEffect[] = [];
    for (const effect of strings(row.effects)) {
      if (!vocabulary.has(effect) || seen.has(effect)) continue;
      seen.add(effect);
      effects.push(effect as Ns5ArrivalEffect);
    }
    return { entityId: entityId(text(row.entityId)), effects };
  }).filter(entry => entry.entityId);
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
