/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/integration70/gate.ts" enhancement="_blank"/>

import type { Ns5IntegrationItem, Ns5IntegrationPlugin } from '/_102035_/l2/solution/types.js';
import {
  collectNs5IntegrationSignals,
  isNs5PluginId,
  type Ns5IntegrationActorView,
  type Ns5IntegrationEntityView,
} from '/_102035_/l2/agentNewSolution5/steps/integration70/contracts.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const ITEM_KINDS = new Set(['moduleEndpoint', 'event', 'external']);

export interface Ns5IntegrationGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface Ns5IntegrationGateResult {
  ok: boolean;
  issues: Ns5IntegrationGateIssue[];
}

export interface Ns5IntegrationGateContext {
  moduleName?: string;
  actors: readonly Ns5IntegrationActorView[];
  entities: readonly Ns5IntegrationEntityView[];
  registryModuleNames: readonly string[];
  sourcePrompt: string;
}

export function validateNs5Integration(
  inbound: Ns5IntegrationItem[],
  outbound: Ns5IntegrationItem[],
  plugins: Ns5IntegrationPlugin[],
  context: Ns5IntegrationGateContext,
): Ns5IntegrationGateResult {
  const issues: Ns5IntegrationGateIssue[] = [];
  const entityIds = new Set(context.entities.map(entity => entity.entityId).filter(Boolean));
  const registry = new Set(context.registryModuleNames.filter(Boolean));
  const itemIds = new Set<string>();
  const pluginIds = new Set<string>();
  const signals = collectNs5IntegrationSignals(context.actors, context.sourcePrompt);

  if (!inbound.length && !outbound.length && !plugins.length && signals.length) {
    error(
      issues,
      'NS5_INTEGRATION_SIGNAL_WITHOUT_ITEM',
      'A system actor or plugin-catalog term is present so inbound, outbound and plugins cannot all be empty.',
    );
  }

  inbound.forEach((item, index) => {
    validateItem(item, `inbound[${index}]`, 'inbound', { entityIds, registry, itemIds, issues });
  });
  outbound.forEach((item, index) => {
    validateItem(item, `outbound[${index}]`, 'outbound', { entityIds, registry, itemIds, issues });
  });
  plugins.forEach((plugin, index) => {
    validatePlugin(plugin, `plugins[${index}]`, { entityIds, pluginIds, issues });
  });

  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

export function formatNs5IntegrationGate(issues: Ns5IntegrationGateIssue[]): string {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => {
      const where = issue.path ? ` ${issue.path}` : '';
      return `${issue.code}${where}: ${issue.message}`;
    })
    .join('\n');
}

function validateItem(
  item: Ns5IntegrationItem,
  path: string,
  direction: 'inbound' | 'outbound',
  ctx: {
    entityIds: Set<string>;
    registry: Set<string>;
    itemIds: Set<string>;
    issues: Ns5IntegrationGateIssue[];
  },
): void {
  const { issues } = ctx;
  if (!MEMBER_ID.test(item.id)) {
    error(issues, 'NS5_INTEGRATION_ID', 'id must be lowerCamel.', `${path}.id`);
  }
  if (item.id && ctx.itemIds.has(item.id)) {
    error(issues, 'NS5_INTEGRATION_ID_DUPLICATE', `Duplicate integration id ${item.id}.`, `${path}.id`);
  }
  if (item.id) ctx.itemIds.add(item.id);
  if (!ITEM_KINDS.has(item.kind)) {
    error(issues, 'NS5_INTEGRATION_KIND', 'kind must be moduleEndpoint, event or external.', `${path}.kind`);
  }
  if (!item.description.trim()) {
    error(issues, 'NS5_INTEGRATION_DESCRIPTION', 'Description is required.', `${path}.description`);
  }

  if (direction === 'inbound') {
    if (!item.from) {
      error(issues, 'NS5_INTEGRATION_FROM', 'Inbound items name from.', `${path}.from`);
    } else {
      checkPeer(item, path, 'from', ctx);
    }
  }
  if (direction === 'outbound') {
    if (!item.to) {
      error(issues, 'NS5_INTEGRATION_TO', 'Outbound items name to.', `${path}.to`);
    } else {
      checkPeer(item, path, 'to', ctx);
    }
  }
  if (direction === 'inbound' && item.to) checkPeer(item, path, 'to', ctx);
  if (direction === 'outbound' && item.from) checkPeer(item, path, 'from', ctx);

  validateEntityRefs(item.entityRefs, path, ctx.entityIds, issues);
}

function checkPeer(
  item: Ns5IntegrationItem,
  path: string,
  field: 'from' | 'to',
  ctx: { registry: Set<string>; issues: Ns5IntegrationGateIssue[] },
): void {
  const value = item[field];
  if (!value) return;
  if (!MEMBER_ID.test(value)) {
    error(ctx.issues, 'NS5_INTEGRATION_PEER_ID', `${field} must be lowerCamel.`, `${path}.${field}`);
    return;
  }
  if (item.kind !== 'moduleEndpoint') return;
  if (ctx.registry.has(value)) return;
  warning(
    ctx.issues,
    'NS5_INTEGRATION_UNKNOWN_MODULE',
    `${field} ${value} is not a module in the solution registry (unknownModule).`,
    `${path}.${field}`,
  );
}

function validatePlugin(
  plugin: Ns5IntegrationPlugin,
  path: string,
  ctx: { entityIds: Set<string>; pluginIds: Set<string>; issues: Ns5IntegrationGateIssue[] },
): void {
  const { issues } = ctx;
  if (!MEMBER_ID.test(plugin.pluginId)) {
    error(issues, 'NS5_INTEGRATION_PLUGIN_ID', 'pluginId must be lowerCamel.', `${path}.pluginId`);
  }
  if (plugin.pluginId && ctx.pluginIds.has(plugin.pluginId)) {
    error(issues, 'NS5_INTEGRATION_PLUGIN_DUPLICATE', `Duplicate pluginId ${plugin.pluginId}.`, `${path}.pluginId`);
  }
  if (plugin.pluginId) ctx.pluginIds.add(plugin.pluginId);
  if (plugin.pluginId && !isNs5PluginId(plugin.pluginId)) {
    error(
      issues,
      'NS5_INTEGRATION_PLUGIN_UNKNOWN',
      `pluginId ${plugin.pluginId} is not in the platform plugin catalog.`,
      `${path}.pluginId`,
    );
  }
  if (!plugin.description.trim()) {
    error(issues, 'NS5_INTEGRATION_DESCRIPTION', 'Plugin description is required.', `${path}.description`);
  }
  validateEntityRefs(plugin.entityRefs, path, ctx.entityIds, issues);
}

function validateEntityRefs(
  entityRefs: readonly string[],
  path: string,
  entityIds: Set<string>,
  issues: Ns5IntegrationGateIssue[],
): void {
  entityRefs.forEach((entityId, position) => {
    const refPath = `${path}.entityRefs[${position}]`;
    if (!ENTITY_ID.test(entityId)) {
      error(issues, 'NS5_INTEGRATION_ENTITY_ID', 'entityRefs must be UpperCamel entity ids.', refPath);
    } else if (!entityIds.has(entityId)) {
      error(issues, 'NS5_INTEGRATION_ENTITY_UNKNOWN', `Unknown entity ${entityId}.`, refPath);
    }
  });
}

function error(issues: Ns5IntegrationGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, ...(path ? { path } : {}) });
}

function warning(issues: Ns5IntegrationGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'warning', code, message, ...(path ? { path } : {}) });
}
