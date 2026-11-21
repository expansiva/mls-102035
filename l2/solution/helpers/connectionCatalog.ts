/// <mls fileReference="_102035_/l2/solution/helpers/connectionCatalog.ts" enhancement="_blank"/>

import cmCatalog from '/_102034_/l2/shared/contracts/connections/cm.js';
import platformCatalog from '/_102034_/l2/shared/contracts/connections/platform.js';
import { readSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { Ns5IntegrationExternalSystem } from '/_102035_/l2/solution/types.js';

export interface Ns5ConnectionCatalog {
  schemaVersion: 'connection-catalog-v1';
  connectionId: string;
  title: string;
  description: string;
  operations: Ns5ConnectionOperation[];
}

export interface Ns5ConnectionOperation {
  operationId: string;
  direction: 'call' | 'serve';
  kind: 'query' | 'command';
  description: string;
  inputType: string;
  outputType: string;
  reply: 'now' | 'later';
  resultOperation?: string;
  timeoutMs?: number;
  hiddenFromAgents?: boolean;
  noRowLimit?: boolean;
  personInputs?: Array<{ from: string; to: string }>;
  /** The operation is served by the platform, not by a module (e.g. `cm.ensureAgentMember`). */
  servedBy?: 'platform';
  expectsVersion?: true;
}

/**
 * Source text of each platform catalog named in `connectionIds` (`cm`, `platform`).
 * An id the platform does not publish is skipped. A file that cannot be read, or that comes back empty,
 * is left out of the map; the caller warns for the catalogs it asked for and did not receive.
 */
const PLATFORM_CATALOG_PROJECT = 102034;

export async function readNs5ConnectionSources(connectionIds: readonly string[]): Promise<Record<string, string>> {
  const known = new Set(ns5ConnectionCatalogs().map(item => item.connectionId));
  const sources: Record<string, string> = {};
  for (const connectionId of connectionIds) {
    if (!known.has(connectionId) || sources[connectionId] !== undefined) continue;
    const fileInfo: Ns5FileInfo = {
      project: PLATFORM_CATALOG_PROJECT,
      level: 2,
      folder: 'shared/contracts/connections',
      shortName: connectionId,
      extension: '.ts',
    };
    let text = '';
    try {
      text = await readSourceText(fileInfo);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[connectionCatalog] catalog ${connectionId} not read: ${message}`);
      continue;
    }
    if (!text.trim()) continue;
    sources[connectionId] = text;
  }
  return sources;
}

/**
 * Closed connection catalogs the NS5 gate reads: the platform's own files in `102034/l2/shared/contracts/connections/`.
 * `solution/fixtures/connections/cm.defs.ts` is a test copy of the `cm` one (see `connectionCatalog.test.ts`).
 */
export function ns5ConnectionCatalogs(): readonly Ns5ConnectionCatalog[] {
  // An operation `servedBy: 'platform'` is the platform's to answer: a module never chooses it nor serves it.
  // `platform` (releaseCatalogChanged, M5): the module that serves the catalog of the release uses it (l4_p4_108).
  // Its signal is its own operation, never the word `platform` (see CONNECTION_SIGNAL_GROUPS).
  return [cmCatalog, platformCatalog].map(catalog => ({
    ...catalog,
    operations: catalog.operations.filter(operation => !operation.servedBy),
  }));
}

/** What the L4 knows of an operation of a declared system: no kind, no types, no reply mode (the How decides them). */
export type Ns5DeclaredOperation = Pick<Ns5ConnectionOperation, 'operationId' | 'direction' | 'description'>;

/**
 * `systems` are the `externalSystems` the caller read from the L4 (this module's and its siblings'). The platform
 * catalogs come first, so a declared system never shadows `cm` or `platform` (the gate refuses that id).
 */
export function ns5ConnectionOperation(connectionId: string, operationId: string): Ns5ConnectionOperation | undefined;
export function ns5ConnectionOperation(
  connectionId: string,
  operationId: string,
  systems: readonly Ns5IntegrationExternalSystem[],
): Ns5ConnectionOperation | Ns5DeclaredOperation | undefined;
export function ns5ConnectionOperation(
  connectionId: string,
  operationId: string,
  systems: readonly Ns5IntegrationExternalSystem[] = [],
): Ns5ConnectionOperation | Ns5DeclaredOperation | undefined {
  const catalog = ns5ConnectionCatalogs().find(item => item.connectionId === connectionId);
  if (catalog !== undefined) return catalog.operations.find(item => item.operationId === operationId);
  const system = systems.find(item => item.id === connectionId);
  return system?.operations.find(item => item.operationId === operationId);
}

/**
 * What in a prompt says the module talks to a connection. Each group is a set of words that must ALL appear;
 * any group is enough. A connection with no row here answers to its `connectionId`. The id `platform` is a
 * common word, so it is never a term: the platform connection answers to its own operation or to a release
 * together with a catalog (l4_p4_108 s0).
 */
const CONNECTION_SIGNAL_GROUPS: Readonly<Record<string, readonly (readonly string[])[]>> = {
  cm: [['cm']],
  platform: [['releaseCatalogChanged'], ['release', 'catalog']],
};

export interface Ns5ConnectionSignalHit {
  connectionId: string;
  /** The group that matched, joined by ` + `. */
  term: string;
}

/** `mentions` is the word test of the caller (`promptMentionsTerm`), so this file does not import its gate. */
export function ns5ConnectionSignalHits(
  sourcePrompt: string,
  mentions: (sourcePrompt: string, term: string) => boolean,
): Ns5ConnectionSignalHit[] {
  const hits: Ns5ConnectionSignalHit[] = [];
  for (const catalog of ns5ConnectionCatalogs()) {
    const groups = CONNECTION_SIGNAL_GROUPS[catalog.connectionId] ?? [[catalog.connectionId]];
    for (const group of groups) {
      if (group.every(term => mentions(sourcePrompt, term))) {
        hits.push({ connectionId: catalog.connectionId, term: group.join(' + ') });
        break;
      }
    }
  }
  return hits;
}

export function ns5ConnectionTerms(): readonly string[] {
  return ns5ConnectionCatalogs().map(item => item.connectionId);
}

export function ns5ConnectionExists(connectionId: string, systems: readonly Ns5IntegrationExternalSystem[] = []): boolean {
  return ns5ConnectionCatalogs().some(item => item.connectionId === connectionId)
    || systems.some(item => item.id === connectionId);
}

/** The `serve` operations of one connection: what the connection delivers to a module. */
export function ns5ServeOperationIds(connectionId: string, systems: readonly Ns5IntegrationExternalSystem[] = []): string[] {
  const catalog = ns5ConnectionCatalogs().find(item => item.connectionId === connectionId);
  const operations: readonly Ns5DeclaredOperation[] = catalog?.operations
    ?? systems.find(item => item.id === connectionId)?.operations
    ?? [];
  return operations.filter(item => item.direction === 'serve').map(item => item.operationId);
}

/** Every arrival a connection can deliver, as `<connectionId>.<operationId>` and its description. */
export function ns5ConnectionArrivals(systems: readonly Ns5IntegrationExternalSystem[] = []): Array<{ ref: string; description: string }> {
  const declared = systems.map(system => ({ connectionId: system.id, operations: system.operations as readonly Ns5DeclaredOperation[] }));
  return [...ns5ConnectionCatalogs(), ...declared].flatMap(catalog => catalog.operations
    .filter(operation => operation.direction === 'serve')
    .map(operation => ({ ref: `${catalog.connectionId}.${operation.operationId}`, description: operation.description })));
}
