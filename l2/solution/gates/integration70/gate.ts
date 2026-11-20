/// <mls fileReference="_102035_/l2/solution/gates/integration70/gate.ts" enhancement="_blank"/>

import type { Ns5SiblingModule } from '/_102035_/l2/solution/ns5Siblings.js';
import { ns5ConnectionCatalogs, ns5ConnectionOperation } from '/_102035_/l2/solution/helpers/connectionCatalog.js';
import type { Ns5IntegrationConnection, Ns5IntegrationExternalSystem, Ns5IntegrationItem, Ns5IntegrationPlugin } from '/_102035_/l2/solution/types.js';
import {
  collectNs5IntegrationSignals,
  inboundEventId,
  isNs5ConnectionId,
  isNs5PluginId,
  parseNs5OutboundOn,
  parseNs5UsedBy,
  type Ns5IntegrationActorView,
  type Ns5IntegrationEntityView,
  type Ns5IntegrationJourneyView,
  type Ns5IntegrationProcessView,
} from '/_102035_/l2/solution/gates/integration70/contracts.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const ITEM_KINDS = new Set(['moduleEndpoint', 'event', 'external']);
const EFFECTS = new Set(['create', 'update', 'transition']);

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
  siblings?: readonly Ns5SiblingModule[];
  sourcePrompt: string;
  journeySteps?: readonly Ns5IntegrationJourneyView[];
  processTasks?: readonly Ns5IntegrationProcessView[];
  platformEventIds?: readonly string[];
  /** `externalSystems` the sibling modules declare in their own L4 (read by the caller, never from a written list). */
  siblingSystems?: readonly Ns5IntegrationExternalSystem[];
}

export function validateNs5Integration(
  inbound: Ns5IntegrationItem[],
  outbound: Ns5IntegrationItem[],
  plugins: Ns5IntegrationPlugin[],
  context: Ns5IntegrationGateContext,
  connections: Ns5IntegrationConnection[] = [],
  externalSystems: Ns5IntegrationExternalSystem[] = [],
): Ns5IntegrationGateResult {
  const issues: Ns5IntegrationGateIssue[] = [];
  const entityById = new Map(context.entities.map(entity => [entity.entityId, entity]));
  const entityIds = new Set(context.entities.map(entity => entity.entityId).filter(Boolean));
  const registry = new Set(context.registryModuleNames.filter(Boolean));
  const itemIds = new Set<string>();
  const pluginIds = new Set<string>();
  const connectionPairs = new Set<string>();
  const siblings = context.siblings || [];
  const siblingSystems = context.siblingSystems || [];
  const signals = collectNs5IntegrationSignals(context.actors, context.sourcePrompt, siblings, {
    entities: context.entities,
    siblingSystems,
  });
  const systems = [...externalSystems, ...siblingSystems];

  // A connection term only lets the step run (the prompt may say "cm" for centimeters): it never forces an item.
  if (!inbound.length && !outbound.length && !plugins.length && !connections.length && !externalSystems.length && signals.some(signal => signal.kind !== 'connectionTerm')) {
    error(
      issues,
      'NS5_INTEGRATION_SIGNAL_WITHOUT_ITEM',
      'A system actor, plugin-catalog term, connection-catalog term, sibling module or ontology entity that names a system this module declares is present so inbound, outbound, plugins, connections and externalSystems cannot all be empty.',
    );
  }

  inbound.forEach((item, index) => {
    validateInbound(item, `inbound[${index}]`, { entityIds, entityById, registry, itemIds, issues, platformEventIds: context.platformEventIds || [] });
  });
  outbound.forEach((item, index) => {
    validateOutbound(item, `outbound[${index}]`, { entityIds, entityById, registry, itemIds, issues });
  });
  plugins.forEach((plugin, index) => {
    validatePlugin(plugin, `plugins[${index}]`, {
      pluginIds,
      issues,
      journeySteps: context.journeySteps || [],
      processTasks: context.processTasks || [],
    });
  });
  validateExternalSystems(externalSystems, siblingSystems, issues);
  connections.forEach((connection, index) => {
    validateConnection(connection, `connections[${index}]`, {
      systems,
      connectionPairs,
      entityIds,
      issues,
      journeySteps: context.journeySteps || [],
      processTasks: context.processTasks || [],
    });
  });

  const catalogIds = new Set(ns5ConnectionCatalogs().map(catalog => catalog.connectionId));
  const siblingIds = new Set(siblingSystems.map(system => system.id));
  const declaredIds = new Set(externalSystems.map(system => system.id));
  for (const entity of context.entities) {
    const id = entity.externalConnectionId;
    if (!id) continue;
    if (catalogIds.has(id) || siblingIds.has(id) || declaredIds.has(id)) continue;
    error(
      issues,
      'NS5_INTEGRATION_ENTITY_SYSTEM_MISSING',
      `${entity.entityId} cites '${id}', which is not a connection of the platform catalog, not a system a sibling module declares, and not declared here. Declare a system with this id in externalSystems, or use a system that exists.`,
      'externalSystems',
    );
  }

  for (const entity of context.entities) {
    if (entity.writer !== 'inbound' || !entity.entityId) continue;
    const coveredByInbound = inbound.some(item => (item.writes || []).includes(entity.entityId));
    const coveredByServe = connections.some(connection => (
      connection.direction === 'serve'
      && (connection.effect === 'create' || connection.effect === 'update')
      && (connection.entityRefs || []).includes(entity.entityId)
    ));
    if (coveredByInbound || coveredByServe) continue;
    error(
      issues,
      'NS5_INTEGRATION_INBOUND_WRITER',
      `Entity ${entity.entityId} declares writer inbound but no inbound.writes names it.`,
      `ontology.${entity.entityId}.writer`,
    );
  }

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

function validateInbound(
  item: Ns5IntegrationItem,
  path: string,
  ctx: {
    entityIds: Set<string>;
    entityById: Map<string, Ns5IntegrationEntityView>;
    registry: Set<string>;
    itemIds: Set<string>;
    issues: Ns5IntegrationGateIssue[];
    platformEventIds: readonly string[];
  },
): void {
  validateCommon(item, path, ctx);
  if (!item.from) {
    error(ctx.issues, 'NS5_INTEGRATION_FROM', 'Inbound items name from.', `${path}.from`);
  } else {
    checkPeer(item, path, 'from', ctx);
  }
  if (item.to) checkPeer(item, path, 'to', ctx);
  if (item.kind === 'external' && item.from && isNs5ConnectionId(item.from)) {
    error(
      ctx.issues,
      'NS5_INTEGRATION_INBOUND_NO_SERVE',
      `${item.id} is an inbound from the connection ${item.from}, which publishes no such event. An arrival from a connection is a serve row of connections (an operation of its catalog).`,
      `${path}.from`,
    );
  }
  if (!EFFECTS.has(item.effect || '')) {
    error(ctx.issues, 'NS5_INTEGRATION_EFFECT', "Inbound effect must be 'create', 'update' or 'transition'.", `${path}.effect`);
  }
  if (item.effect === 'transition' && !item.transitionRef) {
    error(ctx.issues, 'NS5_INTEGRATION_TRANSITION_REF', 'Inbound effect transition names transitionRef.', `${path}.transitionRef`);
  }
  if (item.effect === 'transition' && item.transitionRef && item.writes?.[0]) {
    const entity = ctx.entityById.get(item.writes[0]);
    if (entity?.transitions && !entity.transitions.some(row => row.transitionId === item.transitionRef)) {
      error(
        ctx.issues,
        'NS5_INTEGRATION_TRANSITION_UNKNOWN',
        `Unknown transition ${item.writes[0]}.${item.transitionRef}.`,
        `${path}.transitionRef`,
      );
    }
  }
  validateEntityRefs(item.writes || [], `${path}.writes`, ctx.entityIds, ctx.issues);
  if (item.from === 'organization') {
    const eventId = inboundEventId(item);
    if (eventId && ctx.platformEventIds.length && !ctx.platformEventIds.includes(eventId)) {
      error(
        ctx.issues,
        'NS5_INTEGRATION_PLATFORM_EVENT',
        `event ${eventId} is not in the platform catalog.`,
        `${path}.event`,
      );
    }
  }
}

function validateOutbound(
  item: Ns5IntegrationItem,
  path: string,
  ctx: {
    entityIds: Set<string>;
    entityById: Map<string, Ns5IntegrationEntityView>;
    registry: Set<string>;
    itemIds: Set<string>;
    issues: Ns5IntegrationGateIssue[];
  },
): void {
  validateCommon(item, path, ctx);
  if (!item.to) {
    error(ctx.issues, 'NS5_INTEGRATION_TO', 'Outbound items name to.', `${path}.to`);
  } else {
    checkPeer(item, path, 'to', ctx);
  }
  if (item.from) checkPeer(item, path, 'from', ctx);
  if (!item.event) {
    error(ctx.issues, 'NS5_INTEGRATION_EVENT', 'Outbound items name event.', `${path}.event`);
  }
  const parsed = parseNs5OutboundOn(item.on || '');
  if (!parsed) {
    error(ctx.issues, 'NS5_INTEGRATION_ON', 'outbound.on must be Entity.transitionId or Entity.create.', `${path}.on`);
  } else if (!ctx.entityIds.has(parsed.entityId)) {
    error(ctx.issues, 'NS5_INTEGRATION_ENTITY_UNKNOWN', `Unknown entity ${parsed.entityId}.`, `${path}.on`);
  } else if (parsed.transitionId !== 'create') {
    const entity = ctx.entityById.get(parsed.entityId);
    const ids = new Set((entity?.transitions || []).map(row => row.transitionId));
    if (entity?.transitions && !ids.has(parsed.transitionId)) {
      error(
        ctx.issues,
        'NS5_INTEGRATION_ON',
        `Unknown transition ${parsed.entityId}.${parsed.transitionId}.`,
        `${path}.on`,
      );
    }
  }
  validateEntityRefs(item.entityRefs, path, ctx.entityIds, ctx.issues);
}

function validateCommon(
  item: Ns5IntegrationItem,
  path: string,
  ctx: { itemIds: Set<string>; issues: Ns5IntegrationGateIssue[] },
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
  if (item.kind === 'external') return;
  if (value === 'organization' || value === 'any') return;
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
  ctx: {
    pluginIds: Set<string>;
    issues: Ns5IntegrationGateIssue[];
    journeySteps: readonly Ns5IntegrationJourneyView[];
    processTasks: readonly Ns5IntegrationProcessView[];
  },
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
  if (!plugin.usedBy.length) {
    error(issues, 'NS5_INTEGRATION_USED_BY', 'plugins.usedBy names a journey.step or process.task.', `${path}.usedBy`);
  }
  plugin.usedBy.forEach((ref, position) => {
    const parsed = parseNs5UsedBy(ref);
    const refPath = `${path}.usedBy[${position}]`;
    if (!parsed) {
      error(issues, 'NS5_INTEGRATION_USED_BY', 'usedBy must be journeyId.stepId or processId.taskId.', refPath);
      return;
    }
    const journey = ctx.journeySteps.find(item => item.journeyId === parsed.ownerId);
    if (journey) {
      if (!journey.stepIds.includes(parsed.memberId)) {
        error(issues, 'NS5_INTEGRATION_USED_BY', `Unknown step ${ref}.`, refPath);
      }
      return;
    }
    const process = ctx.processTasks.find(item => item.processId === parsed.ownerId);
    if (process) {
      if (!process.taskIds.includes(parsed.memberId)) {
        error(issues, 'NS5_INTEGRATION_USED_BY', `Unknown task ${ref}.`, refPath);
      }
      return;
    }
    if (ctx.journeySteps.length || ctx.processTasks.length) {
      error(issues, 'NS5_INTEGRATION_USED_BY', `Unknown journey or process ${parsed.ownerId}.`, refPath);
    }
  });
}

function validateConnection(
  connection: Ns5IntegrationConnection,
  path: string,
  ctx: {
    systems: readonly Ns5IntegrationExternalSystem[];
    connectionPairs: Set<string>;
    entityIds: Set<string>;
    issues: Ns5IntegrationGateIssue[];
    journeySteps: readonly Ns5IntegrationJourneyView[];
    processTasks: readonly Ns5IntegrationProcessView[];
  },
): void {
  const { issues } = ctx;
  const operation = ns5ConnectionOperation(connection.connectionId, connection.operationId, ctx.systems);
  if (!operation) {
    error(
      issues,
      'NS5_INTEGRATION_CONNECTION_UNKNOWN',
      `Connection ${connection.connectionId || '(missing)'}.${connection.operationId || '(missing)'} is neither in the platform catalogs nor an operation of a declared system.`,
      path,
    );
  }
  const pair = `${connection.connectionId}|${connection.operationId}`;
  if (connection.connectionId && connection.operationId && ctx.connectionPairs.has(pair)) {
    error(
      issues,
      'NS5_INTEGRATION_CONNECTION_DUPLICATE',
      `Duplicate connection ${connection.connectionId}.${connection.operationId}.`,
      path,
    );
  }
  if (connection.connectionId && connection.operationId) ctx.connectionPairs.add(pair);
  const entityRefs = connection.entityRefs || [];
  if ((entityRefs.length > 0) !== Boolean(connection.effect)) {
    error(
      issues,
      'NS5_INTEGRATION_CONNECTION_EFFECT',
      'entityRefs and effect are named together.',
      path,
    );
  }
  entityRefs.forEach((entityId, position) => {
    if (!ctx.entityIds.has(entityId)) {
      error(
        issues,
        'NS5_INTEGRATION_CONNECTION_ENTITY',
        `Unknown entity ${entityId}.`,
        `${path}.entityRefs[${position}]`,
      );
    }
  });
  if (connection.direction !== 'call') return;
  if (!connection.usedBy.length) {
    error(issues, 'NS5_INTEGRATION_CONNECTION_USED_BY', 'call connections name usedBy as a journey.step or process.task.', `${path}.usedBy`);
  }
  connection.usedBy.forEach((ref, position) => {
    const parsed = parseNs5UsedBy(ref);
    const refPath = `${path}.usedBy[${position}]`;
    if (!parsed) {
      error(issues, 'NS5_INTEGRATION_CONNECTION_USED_BY', 'usedBy must be journeyId.stepId or processId.taskId.', refPath);
      return;
    }
    const journey = ctx.journeySteps.find(item => item.journeyId === parsed.ownerId);
    if (journey) {
      if (!journey.stepIds.includes(parsed.memberId)) {
        error(issues, 'NS5_INTEGRATION_CONNECTION_USED_BY', `Unknown step ${ref}.`, refPath);
      }
      return;
    }
    const process = ctx.processTasks.find(item => item.processId === parsed.ownerId);
    if (process) {
      if (!process.taskIds.includes(parsed.memberId)) {
        error(issues, 'NS5_INTEGRATION_CONNECTION_USED_BY', `Unknown task ${ref}.`, refPath);
      }
      return;
    }
    if (ctx.journeySteps.length || ctx.processTasks.length) {
      error(issues, 'NS5_INTEGRATION_CONNECTION_USED_BY', `Unknown journey or process ${parsed.ownerId}.`, refPath);
    }
  });
}

/** Shape of the systems this module declares. The same id may not repeat a platform catalog or a sibling's system. */
function validateExternalSystems(
  systems: readonly Ns5IntegrationExternalSystem[],
  siblingSystems: readonly Ns5IntegrationExternalSystem[],
  issues: Ns5IntegrationGateIssue[],
): void {
  const platformIds = new Set(ns5ConnectionCatalogs().map(catalog => catalog.connectionId));
  const siblingIds = new Set(siblingSystems.map(system => system.id));
  const systemIds = new Set<string>();
  systems.forEach((system, index) => {
    const path = `externalSystems[${index}]`;
    if (!MEMBER_ID.test(system.id)) {
      error(issues, 'NS5_INTEGRATION_SYSTEM_ID', 'external system ids must be lowerCamel.', `${path}.id`);
    } else if (platformIds.has(system.id)) {
      error(issues, 'NS5_INTEGRATION_SYSTEM_ID', `${system.id} is a connection of the platform catalog; a module cannot declare it again.`, `${path}.id`);
    } else if (siblingIds.has(system.id)) {
      error(issues, 'NS5_INTEGRATION_SYSTEM_ID', `${system.id} is already declared by a sibling module; use that system, do not declare it again.`, `${path}.id`);
    } else if (systemIds.has(system.id)) {
      error(issues, 'NS5_INTEGRATION_SYSTEM_ID', `Duplicate external system ${system.id}.`, `${path}.id`);
    }
    systemIds.add(system.id);
    if (!system.title) error(issues, 'NS5_INTEGRATION_SYSTEM_TEXT', 'An external system names its title.', `${path}.title`);
    if (!system.description) error(issues, 'NS5_INTEGRATION_SYSTEM_TEXT', 'An external system describes what it is and what the module uses it for.', `${path}.description`);
    const settingIds = new Set<string>();
    system.settings.forEach((setting, position) => {
      const settingPath = `${path}.settings[${position}]`;
      if (!MEMBER_ID.test(setting.id)) {
        error(issues, 'NS5_INTEGRATION_SYSTEM_SETTING', 'setting ids must be lowerCamel.', `${settingPath}.id`);
      } else if (settingIds.has(setting.id)) {
        error(issues, 'NS5_INTEGRATION_SYSTEM_SETTING', `Duplicate setting ${setting.id} in ${system.id}.`, `${settingPath}.id`);
      }
      settingIds.add(setting.id);
      if (!setting.title || !setting.description) {
        error(issues, 'NS5_INTEGRATION_SYSTEM_TEXT', 'A setting names its title and describes what the admin fills in.', settingPath);
      }
      if (typeof setting.secret !== 'boolean') {
        error(issues, 'NS5_INTEGRATION_SYSTEM_SETTING', 'A setting says whether it is secret (true or false).', `${settingPath}.secret`);
      }
    });
    // A notice from outside enters only if it can be checked: a system that serves needs a secret the admin gives (M12).
    if (system.operations.some(operation => operation.direction === 'serve') && !system.settings.some(setting => setting.secret === true)) {
      error(
        issues,
        'NS5_INTEGRATION_SYSTEM_SERVE_SECRET',
        `External system ${system.id || '(missing)'} has a serve operation, so it needs at least one setting with secret: true (the secret agreed with the system, to check what it sends). Add it to settings.`,
        `${path}.settings`,
      );
    }
    const operationIds = new Set<string>();
    system.operations.forEach((operation, position) => {
      const operationPath = `${path}.operations[${position}]`;
      if (!MEMBER_ID.test(operation.operationId)) {
        error(issues, 'NS5_INTEGRATION_SYSTEM_OPERATION', 'operation ids must be lowerCamel.', `${operationPath}.operationId`);
      } else if (operationIds.has(operation.operationId)) {
        error(issues, 'NS5_INTEGRATION_SYSTEM_OPERATION', `Duplicate operation ${operation.operationId} in ${system.id}.`, `${operationPath}.operationId`);
      }
      operationIds.add(operation.operationId);
      if (operation.direction !== 'call' && operation.direction !== 'serve') {
        error(issues, 'NS5_INTEGRATION_SYSTEM_OPERATION', "An operation direction is 'call' or 'serve'.", `${operationPath}.direction`);
      }
      if (!operation.description) {
        error(issues, 'NS5_INTEGRATION_SYSTEM_TEXT', 'An operation describes what is asked or what arrives.', `${operationPath}.description`);
      }
    });
  });
}

function validateEntityRefs(
  entityRefs: readonly string[],
  path: string,
  entityIds: Set<string>,
  issues: Ns5IntegrationGateIssue[],
): void {
  entityRefs.forEach((entityId, position) => {
    const refPath = path.endsWith('writes') ? `${path}[${position}]` : `${path}.entityRefs[${position}]`;
    if (!ENTITY_ID.test(entityId)) {
      error(issues, 'NS5_INTEGRATION_ENTITY_ID', 'entity ids must be UpperCamel.', refPath);
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
