/// <mls fileReference="_102035_/l2/newRelease/widgets/integration/integrationModel.ts" enhancement="_blank" />

import type { Ns5ArrivalEntityEffects } from '/_102035_/l2/solution/arrivalEffects.js';
import type {
  Ns5IntegrationArtifact,
  Ns5IntegrationConnection,
  Ns5IntegrationExternalSystem,
  Ns5IntegrationItem,
  Ns5IntegrationPlugin,
  Ns5IntegrationRequestArtifact,
} from '../../../solution/types.js';
import type { NewReleaseValidationIssue } from '/_102035_/l2/solution/candidate/tobePaths.js';

export type IntegrationSchemaKind = 'v1' | 'v2' | 'unknown';

/** Every contract field has a translated detail label, including optional fields. */
export const INTEGRATION_ITEM_LABELS = {
  id: 'integration.id', kind: 'integration.kind', from: 'integration.from',
  to: 'integration.to', event: 'integration.event', writes: 'integration.writes',
  effect: 'integration.effect', transitionRef: 'integration.transition',
  on: 'integration.on', description: 'integration.itemDescription',
  entityRefs: 'integration.entities', entityEffects: 'integration.entityEffects',
} as const satisfies Record<keyof Ns5IntegrationItem, string>;

export interface IntegrationPluginView {
  pluginId: string;
  description: string;
  usedBy: string[];
  legacyEntityRefs: string[];
}

export interface IntegrationView {
  schema: IntegrationSchemaKind;
  schemaVersion: string;
  moduleName: string;
  inbound: Ns5IntegrationItem[];
  outbound: Ns5IntegrationItem[];
  plugins: IntegrationPluginView[];
  connections: Ns5IntegrationConnection[];
  externalSystems: Ns5IntegrationExternalSystem[];
  raw: unknown;
}

export interface IntegrationRequestView {
  targetModule: string;
  path: string;
  value: Ns5IntegrationRequestArtifact;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function itemOf(value: unknown): Ns5IntegrationItem {
  const item = record(value);
  const entityEffects = entityEffectsOf(item.entityEffects);
  return {
    id: String(item.id || ''),
    kind: ['moduleEndpoint', 'event', 'external'].includes(String(item.kind || ''))
      ? item.kind as Ns5IntegrationItem['kind']
      : 'event',
    ...(typeof item.from === 'string' ? { from: item.from } : {}),
    ...(typeof item.to === 'string' ? { to: item.to } : {}),
    ...(typeof item.event === 'string' ? { event: item.event } : {}),
    ...(Array.isArray(item.writes) ? { writes: strings(item.writes) } : {}),
    ...(typeof item.effect === 'string' ? { effect: item.effect as Ns5IntegrationItem['effect'] } : {}),
    ...(typeof item.transitionRef === 'string' ? { transitionRef: item.transitionRef } : {}),
    ...(typeof item.on === 'string' ? { on: item.on } : {}),
    description: String(item.description || ''),
    entityRefs: strings(item.entityRefs),
    ...(entityEffects ? { entityEffects } : {}),
  };
}

function entityEffectsOf(value: unknown): Ns5ArrivalEntityEffects[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map(entry => {
    const row = record(entry);
    return {
      entityId: String(row.entityId || ''),
      effects: strings(row.effects) as Ns5ArrivalEntityEffects['effects'],
    };
  });
}

export function integrationSchemaKind(value: unknown): IntegrationSchemaKind {
  const version = String(record(value).schemaVersion || '');
  if (version.includes('integration-v5') || version.includes('integration-v4') || version.includes('integration-v3') || version.includes('integration-v2')) return 'v2';
  if (version.includes('integration-v1')) return 'v1';
  return 'unknown';
}

export function normalizeIntegration(value: unknown): IntegrationView {
  const root = record(value);
  const plugins = Array.isArray(root.plugins) ? root.plugins.map(plugin => {
    const item = record(plugin);
    return {
      pluginId: String(item.pluginId || ''),
      description: String(item.description || ''),
      usedBy: strings(item.usedBy),
      legacyEntityRefs: strings(item.entityRefs),
    };
  }) : [];
  return {
    schema: integrationSchemaKind(value),
    schemaVersion: String(root.schemaVersion || ''),
    moduleName: String(root.moduleName || ''),
    inbound: Array.isArray(root.inbound) ? root.inbound.map(itemOf) : [],
    outbound: Array.isArray(root.outbound) ? root.outbound.map(itemOf) : [],
    plugins,
    connections: Array.isArray(root.connections) ? root.connections.map(value => {
      const item = record(value);
      return {
        connectionId: String(item.connectionId || ''),
        operationId: String(item.operationId || ''),
        direction: item.direction === 'serve' ? 'serve' as const : 'call' as const,
        usedBy: strings(item.usedBy),
        ...(Array.isArray(item.entityRefs) ? {entityRefs: strings(item.entityRefs)} : {}),
        ...(typeof item.effect === 'string' ? {effect: item.effect as Ns5IntegrationConnection['effect']} : {}),
        ...(entityEffectsOf(item.entityEffects) ? {entityEffects: entityEffectsOf(item.entityEffects)} : {}),
        description: String(item.description || ''),
      };
    }) : [],
    externalSystems: Array.isArray(root.externalSystems) ? root.externalSystems.map(value => {
      const system = record(value);
      return {
        id: String(system.id || ''),
        title: String(system.title || ''),
        description: String(system.description || ''),
        settings: Array.isArray(system.settings) ? system.settings.map(value => {
          const setting = record(value);
          return {id: String(setting.id || ''), title: String(setting.title || ''),
            description: String(setting.description || ''), secret: setting.secret === true};
        }) : [],
        operations: Array.isArray(system.operations) ? system.operations.map(value => {
          const operation = record(value);
          return {operationId: String(operation.operationId || ''),
            direction: operation.direction === 'serve' ? 'serve' as const : 'call' as const,
            description: String(operation.description || '')};
        }) : [],
      };
    }) : [],
    raw: value,
  };
}

export function integrationOracleIssues(issues: readonly NewReleaseValidationIssue[]): NewReleaseValidationIssue[] {
  return issues.filter(issue => issue.artifact === 'integration.defs.ts'
    || issue.code === 'I11'
    || issue.code === 'I12'
    || issue.code.includes('FINALIZE_I11')
    || issue.code.includes('FINALIZE_I12'));
}

export function integrationArtifactFromView(view: IntegrationView): Ns5IntegrationArtifact | null {
  return view.schema === 'v2' ? view.raw as Ns5IntegrationArtifact : null;
}

export function requestDirection(
  request: IntegrationRequestView,
  moduleName: string,
): 'received' | 'sent' | 'other' {
  if (request.value.requestedBy === moduleName) return 'sent';
  if (request.targetModule === moduleName || (request.targetModule === 'organization' && request.value.to === moduleName)) return 'received';
  return 'other';
}

export function requestExportName(requestedBy: string, eventId: string): string {
  return `${requestedBy}${eventId.slice(0, 1).toUpperCase()}${eventId.slice(1)}Request`;
}

export function pluginFromView(plugin: IntegrationPluginView): Ns5IntegrationPlugin {
  return { pluginId: plugin.pluginId, description: plugin.description, usedBy: [...plugin.usedBy] };
}


/** Preserve the full artifact and protected identities while changing existing values. */
export function patchIntegrationItem(
  artifact: Ns5IntegrationArtifact,
  lane: 'inbound' | 'outbound',
  index: number,
  patch: Partial<Omit<Ns5IntegrationItem, 'id' | 'event'>>,
): Ns5IntegrationArtifact {
  const {id: _id, event: _event, ...values} = patch as Partial<Ns5IntegrationItem>;
  return {...artifact, [lane]: artifact[lane].map((item, position) => position === index
    ? {...item, ...values}
    : item)};
}

type Setting = Ns5IntegrationExternalSystem['settings'][number];
type Operation = Ns5IntegrationExternalSystem['operations'][number];

export function patchExternalSystem(
  artifact: Ns5IntegrationArtifact, systemId: string,
  patch: Partial<Pick<Ns5IntegrationExternalSystem, 'title' | 'description'>>,
): Ns5IntegrationArtifact {
  const {title, description} = patch;
  return {...artifact, externalSystems: artifact.externalSystems?.map(system => system.id === systemId
    ? {...system, ...(title !== undefined ? {title} : {}), ...(description !== undefined ? {description} : {})}
    : system)};
}

export function patchExternalSetting(
  artifact: Ns5IntegrationArtifact, systemId: string, settingId: string,
  patch: Partial<Pick<Setting, 'title' | 'description' | 'secret'>>,
): Ns5IntegrationArtifact {
  const {title, description, secret} = patch;
  return {...artifact, externalSystems: artifact.externalSystems?.map(system => system.id === systemId
    ? {...system, settings: system.settings.map(setting => setting.id === settingId
      ? {...setting, ...(title !== undefined ? {title} : {}), ...(description !== undefined ? {description} : {}),
        ...(secret !== undefined ? {secret} : {})}
      : setting)}
    : system)};
}

export function patchExternalOperation(
  artifact: Ns5IntegrationArtifact, systemId: string, operationId: string,
  patch: Partial<Pick<Operation, 'direction' | 'description'>>,
): Ns5IntegrationArtifact {
  const {direction, description} = patch;
  return {...artifact, externalSystems: artifact.externalSystems?.map(system => system.id === systemId
    ? {...system, operations: system.operations.map(operation => operation.operationId === operationId
      ? {...operation, ...(direction !== undefined ? {direction} : {}), ...(description !== undefined ? {description} : {})}
      : operation)}
    : system),
    ...(direction !== undefined && artifact.connections ? {connections: artifact.connections.map(connection =>
      connection.connectionId === systemId && connection.operationId === operationId
        ? {...connection, direction}
        : connection)} : {})};
}
