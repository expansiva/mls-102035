/// <mls fileReference="_102035_/l2/solution/gates/accessEntity/contracts.ts" enhancement="_blank"/>

/** A journey step as this check reads it. */
export interface EntityGrantStepRow {
  journeyId: string;
  stepId: string;
  /** `decide` only chooses a branch: the access happens in the step that follows it. */
  kind: string;
  actorId: string;
  entityId: string;
}

export interface EntityGrantRow {
  grantId: string;
  actorId: string;
  entityRefs: readonly string[];
}

export interface EntityGrantIssue {
  actorId: string;
  entityId: string;
  /** Where the repair goes: the grants of the module. */
  path: string;
  message: string;
}

/** The text a repair matches: the grant that is missing is added to the access file. */
export const ENTITY_WITHOUT_GRANT = 'ENTITY_WITHOUT_GRANT';

/**
 * Every actor that reads or acts on an entity in a journey needs a grant of that actor whose `entityRefs` has it.
 * One issue per actor and entity, naming the first step that needs it.
 */
export function checkEntityGrants(steps: readonly EntityGrantStepRow[], grants: readonly EntityGrantRow[]): EntityGrantIssue[] {
  const covered = new Set<string>();
  for (const grant of grants) {
    for (const entityId of grant.entityRefs) covered.add(`${grant.actorId}\u0000${entityId}`);
  }
  const issues: EntityGrantIssue[] = [];
  const seen = new Set<string>();
  for (const step of steps) {
    if (!step.actorId || !step.entityId || step.kind === 'decide') continue;
    const key = `${step.actorId}\u0000${step.entityId}`;
    if (covered.has(key) || seen.has(key)) continue;
    seen.add(key);
    issues.push({
      actorId: step.actorId,
      entityId: step.entityId,
      path: 'access.grants',
      message: `Actor ${step.actorId} works on ${step.entityId} in ${step.journeyId}.${step.stepId}, but no grant of ${step.actorId} lists ${step.entityId} in entityRefs. Add ${step.entityId} to a grant of ${step.actorId} (or add a grant); do not change the journey.`,
    });
  }
  return issues;
}
