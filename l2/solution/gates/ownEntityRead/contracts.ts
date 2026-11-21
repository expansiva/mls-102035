/// <mls fileReference="_102035_/l2/solution/gates/ownEntityRead/contracts.ts" enhancement="_blank"/>

/** A journey step as this check reads it. */
export interface OwnEntityReadStepRow {
  journeyId: string;
  stepId: string;
  /** `locate` and `inspect` read; `act` and `decide` do not. */
  kind: string;
  entityId: string;
}

export interface OwnEntityReadEntityRow {
  entityId: string;
  /** v3 kind: `entity` is a table of the module, `external` lives in a connection, `role` is an MDM papel. */
  kind: string;
  /** `inbound`: a projection of what the outside tells the module; reading it through a call to the outside is its design. */
  writer?: string;
}

export interface OwnEntityReadConnectionRow {
  connectionId: string;
  operationId: string;
  direction: string;
  effect?: string;
  usedBy: readonly string[];
}

export interface OwnEntityReadIssue {
  entityId: string;
  stepRef: string;
  path: string;
  message: string;
}

/** Code of the integration error for a read of the module's own table that goes through a call to the outside. */
export const OWN_ENTITY_READ_BY_CALL = 'OWN_ENTITY_READ_BY_CALL';

/**
 * A step that reads (locate or inspect) a table the module keeps must not be listed in the `usedBy` of a `call` row that
 * reads: the call reads what lives outside, the module reads its own table. A table that is only a projection of what
 * the outside tells the module (`writer: inbound`) is read through the call by design. One issue per call row and step.
 */
export function checkOwnEntityReads(
  steps: readonly OwnEntityReadStepRow[],
  entities: readonly OwnEntityReadEntityRow[],
  connections: readonly OwnEntityReadConnectionRow[],
): OwnEntityReadIssue[] {
  const own = new Set(entities.filter(entity => entity.kind === 'entity' && entity.writer !== 'inbound').map(entity => entity.entityId));
  const readStep = new Map<string, OwnEntityReadStepRow>();
  for (const step of steps) {
    if ((step.kind === 'locate' || step.kind === 'inspect') && own.has(step.entityId)) {
      readStep.set(`${step.journeyId}.${step.stepId}`, step);
    }
  }
  const issues: OwnEntityReadIssue[] = [];
  connections.forEach((row, index) => {
    if (row.direction !== 'call' || (row.effect !== 'list' && row.effect !== 'read')) return;
    for (const use of row.usedBy) {
      const step = readStep.get(use);
      if (!step) continue;
      issues.push({
        entityId: step.entityId,
        stepRef: use,
        path: `integration.connections[${index}].usedBy`,
        message: `${use} reads ${step.entityId}, a table of the module, but is listed in the usedBy of the call ${row.connectionId}.${row.operationId}: the module reads its own table. Remove ${use} from that usedBy.`,
      });
    }
  });
  return issues;
}
