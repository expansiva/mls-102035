/// <mls fileReference="_102035_/l2/solution/helpers/connectionCatalog.ts" enhancement="_blank"/>

import cmCatalog from '/_102034_/l4/ontology/connections/cm.defs.js';

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
  // `platform.defs` (M5) joins when a module uses it: its id is the common word "platform", which would raise the connection signal in any prompt.
  return [cmCatalog];
}

export function ns5ConnectionOperation(
  connectionId: string,
  operationId: string,
): Ns5ConnectionOperation | undefined {
  const catalog = ns5ConnectionCatalogs().find(item => item.connectionId === connectionId);
  if (catalog === undefined) return undefined;
  return catalog.operations.find(item => item.operationId === operationId);
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
