/// <mls fileReference="_102035_/l2/newRelease/widgets/integrationModel.ts" enhancement="_blank" />

import type {
  Ns5IntegrationArtifact,
  Ns5IntegrationItem,
  Ns5IntegrationPlugin,
  Ns5IntegrationRequestArtifact,
} from '../../solution/types.js';
import type { NewReleaseValidationIssue } from '../tobe.js';

export type IntegrationSchemaKind = 'v1' | 'v2' | 'unknown';

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
  };
}

export function integrationSchemaKind(value: unknown): IntegrationSchemaKind {
  const version = String(record(value).schemaVersion || '');
  if (version.includes('integration-v2')) return 'v2';
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

