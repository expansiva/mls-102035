/// <mls fileReference="_102035_/l2/solution/helpers/connectionCatalog.ts" enhancement="_blank"/>

import cmCatalog from '/_102034_/l4/ontology/connections/cm.defs.js';
import platformCatalog from '/_102034_/l4/ontology/connections/platform.defs.js';

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
}

/**
 * Closed connection catalogs the NS5 gate reads: the platform's own files in `102034/l4/ontology/connections/`.
 * `solution/fixtures/connections/cm.defs.ts` is a test copy of the `cm` one (see `connectionCatalog.test.ts`).
 */
export function ns5ConnectionCatalogs(): readonly Ns5ConnectionCatalog[] {
  // `platform` (releaseCatalogChanged, M5): the module that serves the catalog of the release uses it (l4_p4_108).
  // Its signal is its own operation, never the word `platform` (see CONNECTION_SIGNAL_GROUPS).
  return [cmCatalog, platformCatalog];
}

export function ns5ConnectionOperation(
  connectionId: string,
  operationId: string,
): Ns5ConnectionOperation | undefined {
  const catalog = ns5ConnectionCatalogs().find(item => item.connectionId === connectionId);
  if (catalog === undefined) return undefined;
  return catalog.operations.find(item => item.operationId === operationId);
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

/** `source` of an `external` ontology entity. The L1 catalog reader opens this path. */
export function ns5ConnectionSourcePath(connectionId: string): string {
  return `/_102034_/l4/ontology/connections/${connectionId}.defs.ts`;
}

export function ns5ConnectionExists(connectionId: string): boolean {
  return ns5ConnectionCatalogs().some(item => item.connectionId === connectionId);
}
