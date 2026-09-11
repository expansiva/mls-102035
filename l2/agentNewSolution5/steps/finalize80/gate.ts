/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/finalize80/gate.ts" enhancement="_blank"/>

/**
 * Integrity oracle across the six NS5 sources. One code per check (I1–I7).
 * Errors fail the run; warnings do not.
 *
 * I2 uses collectNs5LifecycleSignal / ns5LifecycleHasBranchingOrigin from ontology30
 * (the structural signal). An appendOnly entity with empty lifecycle plus a repeated
 * act or decide is rejected there first, with repair; this oracle still fails the same
 * shape — do not weaken this check and do not invent a transition to make a live module pass.
 */

import { anchorPath } from '/_102035_/l2/agentNewSolution5/steps/access60/contracts.js';
import {
  collectNs5LifecycleSignal,
  ns5LifecycleHasBranchingOrigin,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';
import {
  ns5FieldRefExists,
  splitFieldRef,
  splitTransitionRef,
  type Ns5RulesEntityView,
} from '/_102035_/l2/agentNewSolution5/steps/rules40/contracts.js';
import {
  collectNs5Handoffs,
  collectNs5ProcessSignals,
} from '/_102035_/l2/agentNewSolution5/steps/workflows50/contracts.js';
import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';
import {
  buildNs5FinalizeReport,
  NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION,
  oracleCode,
  type Ns5FinalizeReport,
  type Ns5OracleCheckId,
  type Ns5OracleIssue,
  type Ns5OracleSources,
} from '/_102035_/l2/agentNewSolution5/steps/finalize80/contracts.js';

export function runNs5Oracle(sources: Ns5OracleSources): Ns5FinalizeReport {
  const errors: Ns5OracleIssue[] = [];
  const warnings: Ns5OracleIssue[] = [];
  const add = (
    bucket: Ns5OracleIssue[],
    checkId: Ns5OracleCheckId,
    path: string,
    message: string,
    code?: Ns5OracleIssue['code'],
  ) => {
    bucket.push({ checkId, code: code || oracleCode(checkId), path, message });
  };
  const error: IssueFn = (checkId, path, message, code) => add(errors, checkId, path, message, code);
  const warning: IssueFn = (checkId, path, message) => add(warnings, checkId, path, message);

  checkI1(sources, error);
  checkI2(sources, error);
  checkI3(sources, error);
  checkI4(sources, warning);
  checkI5(sources, error);
  checkI6(sources, warning);
  checkI7(sources, error);

  return buildNs5FinalizeReport(sources.module.moduleName, errors, warnings, {
    actors: sources.module.actors.length,
    journeys: sources.journeys.length,
    entities: sources.entities.length,
    rules: sources.rules.rules.length,
    processes: sources.workflows.processes.length,
    profiles: sources.access.profiles.length,
    grants: sources.access.grants.length,
  });
}

function checkI1(sources: Ns5OracleSources, error: IssueFn): void {
  const actorIds = new Set(sources.module.actors.map(actor => actor.actorId).filter(Boolean));
  const entityById = entityMap(sources);
  const entityIds = new Set(entityById.keys());
  const journeyById = new Map(sources.journeys.map(journey => [journey.journeyId, journey]));
  const journeyIds = new Set(journeyById.keys());
  const profileIds = new Set(sources.access.profiles.map(profile => profile.profileId).filter(Boolean));
  const authorityIds = new Set(sources.access.authorities.map(item => item.authorityId).filter(Boolean));

  for (const entry of sources.journeyIndex.journeys) {
    if (entry.actorRef && !actorIds.has(entry.actorRef)) {
      error('I1', `journeys/index.${entry.journeyId}.actorRef`, `Unknown actor ${entry.actorRef}.`);
    }
    if (entry.journeyId && !journeyIds.has(entry.journeyId)) {
      error('I1', `journeys/index.${entry.journeyId}`, `Unknown journey ${entry.journeyId}.`);
    }
  }

  for (const journey of sources.journeys) {
    const base = `journeys.${journey.journeyId}`;
    if (journey.business.actorRef && !actorIds.has(journey.business.actorRef)) {
      error('I1', `${base}.actorRef`, `Unknown actor ${journey.business.actorRef}.`);
    }
    journey.business.steps.forEach((step, index) => {
      const path = `${base}.steps[${index}]`;
      if (step.entity && !entityIds.has(step.entity)) {
        error('I1', `${path}.entity`, `Unknown entity ${step.entity}.`);
      }
      for (const extra of step.affects || []) {
        if (extra && !entityIds.has(extra)) error('I1', `${path}.affects`, `Unknown entity ${extra}.`);
      }
      if (step.handoffTo && !actorIds.has(step.handoffTo)) {
        error('I1', `${path}.handoffTo`, `Unknown actor ${step.handoffTo}.`);
      }
    });
  }

  for (const entity of sources.entities) {
    const states = new Set(entity.lifecycleStates.map(item => item.state).filter(Boolean));
    entity.transitions.forEach((transition, index) => {
      const path = `ontology.${entity.entityId}.transitions[${index}]`;
      for (const from of transition.from) {
        if (from && !states.has(from)) error('I1', `${path}.from`, `Unknown lifecycle state ${from}.`);
      }
      if (transition.to && !states.has(transition.to)) {
        error('I1', `${path}.to`, `Unknown lifecycle state ${transition.to}.`);
      }
      if (Array.isArray(transition.by)) {
        for (const actor of transition.by) {
          if (actor && !actorIds.has(actor)) error('I1', `${path}.by`, `Unknown actor ${actor}.`);
        }
      }
    });
  }

  sources.rules.rules.forEach((rule, index) => {
    const base = `rules[${index}]`;
    for (const entityId of rule.appliesTo.entityRefs) {
      if (entityId && !entityIds.has(entityId)) error('I1', `${base}.entityRefs`, `Unknown entity ${entityId}.`);
    }
    for (const ref of rule.appliesTo.fieldRefs) {
      if (!fieldExists(ref, entityById)) error('I1', `${base}.fieldRefs`, `Unknown field ${ref}.`);
    }
    for (const ref of rule.appliesTo.transitionRefs) {
      if (!transitionExists(ref, entityById)) error('I1', `${base}.transitionRefs`, `Unknown transition ${ref}.`);
    }
    for (const journeyId of rule.appliesTo.journeyRefs) {
      if (journeyId && !journeyIds.has(journeyId)) error('I1', `${base}.journeyRefs`, `Unknown journey ${journeyId}.`);
    }
  });

  sources.workflows.processes.forEach((process, processIndex) => {
    process.tasks.forEach((task, taskIndex) => {
      const path = `workflows.processes[${processIndex}].tasks[${taskIndex}]`;
      if (task.actorRef && !actorIds.has(task.actorRef)) {
        error('I1', `${path}.actorRef`, `Unknown actor ${task.actorRef}.`);
      }
      if (task.journeyRef && !journeyIds.has(task.journeyRef)) {
        error('I1', `${path}.journeyRef`, `Unknown journey ${task.journeyRef}.`);
      }
      if (task.stepRef && task.journeyRef) {
        const journey = journeyById.get(task.journeyRef);
        const stepIds = new Set((journey?.business.steps || []).map(step => step.stepId));
        if (!stepIds.has(task.stepRef)) error('I1', `${path}.stepRef`, `Unknown step ${task.stepRef}.`);
      }
    });
  });

  sources.access.profiles.forEach((profile, index) => {
    for (const actorRef of profile.actorRefs) {
      if (actorRef && !actorIds.has(actorRef)) {
        error('I1', `access.profiles[${index}].actorRefs`, `Unknown actor ${actorRef}.`);
      }
    }
  });
  sources.access.grants.forEach((grant, index) => {
    const path = `access.grants[${index}]`;
    if (grant.profileRef && !profileIds.has(grant.profileRef)) {
      error('I1', `${path}.profileRef`, `Unknown profile ${grant.profileRef}.`);
    }
    if (grant.authorityRef && !authorityIds.has(grant.authorityRef)) {
      error('I1', `${path}.authorityRef`, `Unknown authority ${grant.authorityRef}.`);
    }
    for (const entityId of grant.entityRefs) {
      if (entityId && !entityIds.has(entityId)) error('I1', `${path}.entityRefs`, `Unknown entity ${entityId}.`);
    }
    if (grant.dataScope.anchorEntity && !entityIds.has(grant.dataScope.anchorEntity)) {
      error('I1', `${path}.anchorEntity`, `Unknown entity ${grant.dataScope.anchorEntity}.`);
    }
    for (const ref of [...(grant.disclosure.allowedFields || []), ...(grant.disclosure.deniedFields || [])]) {
      if (!fieldExists(ref, entityById)) error('I1', `${path}.disclosure`, `Unknown field ${ref}.`);
    }
  });

  const integrationItems = [
    ...sources.integration.inbound.map((item, index) => ({ path: `integration.inbound[${index}]`, item })),
    ...sources.integration.outbound.map((item, index) => ({ path: `integration.outbound[${index}]`, item })),
    ...sources.integration.plugins.map((item, index) => ({ path: `integration.plugins[${index}]`, item })),
  ];
  for (const { path, item } of integrationItems) {
    for (const entityId of item.entityRefs) {
      if (entityId && !entityIds.has(entityId)) error('I1', `${path}.entityRefs`, `Unknown entity ${entityId}.`);
    }
  }
}

function checkI2(sources: Ns5OracleSources, error: IssueFn): void {
  const entityById = entityMap(sources);
  const provided = new Set<string>();
  const reachable = new Map<string, Set<string> | null>();
  const ordered = orderedJourneys(sources);
  for (const journey of ordered) {
    const actor = journey.business.actorRef;
    const matchedThisJourney = new Set<string>();
    journey.business.steps.forEach((step, index) => {
      const path = `journeys.${journey.journeyId}.steps[${index}]`;
      if (step.kind === 'locate' || step.kind === 'inspect') {
        if (!step.entity) return;
        if (!provided.has(step.entity)) {
          provided.add(step.entity);
          reachable.set(step.entity, null);
        }
        return;
      }
      if (step.kind === 'act') {
        if (!step.entity) return;
        const entity = entityById.get(step.entity);
        if (!provided.has(step.entity)) {
          provided.add(step.entity);
          reachable.set(step.entity, birthStates(entity));
          return;
        }
        if (!entityHasLifecycle(entity)) return;
        if (matchedThisJourney.has(step.entity)) return;
        const current = reachable.get(step.entity) ?? null;
        const matched = (entity?.transitions || []).filter(transition =>
          actorMatches(transition.by, actor) && fromIntersects(transition.from, current));
        if (!matched.length) {
          error(
            'I2',
            path,
            `act ${step.stepId} on ${step.entity} has no candidate transition for ${actor || '(missing actor)'} from reachable origin states.`,
            NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION,
          );
          return;
        }
        matchedThisJourney.add(step.entity);
        reachable.set(step.entity, new Set(matched.map(transition => transition.to).filter(Boolean)));
        return;
      }
      if (step.kind !== 'decide') return;
      const signal = collectNs5LifecycleSignal(ordered, step.entity);
      const entity = entityById.get(step.entity);
      if (signal.requiresBranching && (!entity || !ns5LifecycleHasBranchingOrigin(entity))) {
        error(
          'I2',
          path,
          `decide ${step.stepId} on ${step.entity} needs at least two transitions from the same origin state.`,
        );
      }
    });
  }
}

function checkI3(sources: Ns5OracleSources, error: IssueFn): void {
  const journeyActors = new Set(sources.journeys.map(journey => journey.business.actorRef).filter(Boolean));
  const profileByActor = new Set<string>();
  for (const profile of sources.access.profiles) {
    for (const actorRef of profile.actorRefs) if (actorRef) profileByActor.add(actorRef);
  }
  const grantsByProfile = new Set(sources.access.grants.map(grant => grant.profileRef).filter(Boolean));
  for (const actor of sources.module.actors) {
    if (!actor.actorId) continue;
    if (!journeyActors.has(actor.actorId)) {
      error('I3', `module.actors.${actor.actorId}`, `Actor ${actor.actorId} has no journey.`);
    }
    if (!profileByActor.has(actor.actorId)) {
      error('I3', `module.actors.${actor.actorId}`, `Actor ${actor.actorId} has no profile.`);
    }
  }
  for (const profile of sources.access.profiles) {
    if (!profile.profileId) continue;
    if (!grantsByProfile.has(profile.profileId)) {
      error('I3', `access.profiles.${profile.profileId}`, `Profile ${profile.profileId} has no grant.`);
    }
  }
}

function checkI4(sources: Ns5OracleSources, warning: IssueFn): void {
  const grantedEntities = new Set(sources.access.grants.flatMap(grant => grant.entityRefs));
  sources.rules.rules.forEach((rule, index) => {
    const viaTransition = rule.appliesTo.transitionRefs.length > 0;
    const viaJourney = rule.appliesTo.journeyRefs.length > 0;
    const viaDetails = rule.appliesTo.fieldRefs.some(ref => ref.includes('.details.') || detailsField(ref, sources));
    const viaGrant = rule.appliesTo.entityRefs.some(entityId => grantedEntities.has(entityId));
    if (viaTransition || viaJourney || viaDetails || viaGrant) return;
    warning('I4', `rules[${index}].${rule.ruleId}`, `Rule ${rule.ruleId} is not referenced by a transition, journey, grant or details field.`);
  });
}

function checkI5(sources: Ns5OracleSources, error: IssueFn): void {
  const entityById = entityMap(sources);
  const relationships = sources.ontologyIndex.relationships.map(item => ({
    relationshipId: item.relationshipId,
    fromEntity: item.fromEntity,
    toEntity: item.toEntity,
    required: item.required,
  }));
  const personIds = sources.entities.filter(entity => entity.party === 'person').map(entity => entity.entityId);

  for (const entity of sources.entities) {
    if (entity.kind !== 'mdm') continue;
    if (!entity.mdmSubtype) {
      error('I5', `ontology.${entity.entityId}.mdmSubtype`, `mdm entity ${entity.entityId} is missing mdmSubtype.`);
    }
  }

  sources.access.grants.forEach((grant, index) => {
    if (grant.dataScope.mode !== 'own') return;
    const anchor = grant.dataScope.anchorEntity || personIds[0] || '';
    for (const entityId of grant.entityRefs) {
      const entity = entityById.get(entityId);
      if (!entity || entity.kind === 'mdm') continue;
      const target = anchor && entityById.get(anchor)?.party === 'person'
        ? anchor
        : personIds.find(personId => anchorPath(entityId, personId, relationships) !== null) || '';
      if (!target || anchorPath(entityId, target, relationships) === null) {
        error(
          'I5',
          `access.grants[${index}].entityRefs`,
          `own grant ${grant.grantId} entity ${entityId} does not reach a party:person.`,
        );
      }
    }
  });
}

function checkI6(sources: Ns5OracleSources, warning: IssueFn): void {
  const journeyViews = sources.journeys.map(journey => ({
    journeyId: journey.journeyId,
    business: {
      actorRef: journey.business.actorRef,
      steps: journey.business.steps,
    },
  }));
  const entityViews = sources.entities.map(entity => ({
    entityId: entity.entityId,
    transitions: entity.transitions.map(transition => ({ transitionId: transition.transitionId, by: transition.by })),
  }));
  const covered = new Set<string>();
  for (const process of sources.workflows.processes) {
    for (const task of process.tasks) {
      if (task.journeyRef && task.stepRef) covered.add(`${task.journeyRef}|${task.stepRef}`);
    }
  }
  for (const handoff of collectNs5Handoffs(journeyViews)) {
    if (covered.has(`${handoff.journeyId}|${handoff.stepId}`)) continue;
    warning(
      'I6',
      `journeys.${handoff.journeyId}.${handoff.stepId}`,
      `handoff ${handoff.stepId} has no covering process in workflows.`,
    );
  }
  const signals = collectNs5ProcessSignals(journeyViews, entityViews);
  const needsProcess = signals.filter(signal => signal.kind === 'foreignBy' || signal.kind === 'crossActorDecide');
  if (needsProcess.length && sources.workflows.processes.length === 0) {
    warning(
      'I6',
      'workflows.processes',
      'A foreign-by transition or cross-actor decide has no process in workflows.',
    );
  }
}

function checkI7(sources: Ns5OracleSources, error: IssueFn): void {
  reportOrphans('journeys', sources.journeyDiskFiles, sources.journeyIndex.journeys.map(entry => entry.journeyId), error);
  reportOrphans('ontology', sources.ontologyDiskFiles, sources.ontologyIndex.entities, error);
}

function reportOrphans(kind: 'journeys' | 'ontology', diskFiles: string[] | undefined, indexIds: string[], error: IssueFn): void {
  if (!diskFiles) return;
  const keep = new Set<string>(['index', ...indexIds.filter(Boolean)]);
  const extras: string[] = [];
  const seen = new Set<string>();
  for (const raw of diskFiles) {
    const name = String(raw || '').replace(/\.defs\.ts$/, '');
    if (!name || keep.has(name) || seen.has(name)) continue;
    seen.add(name);
    extras.push(name);
  }
  extras.sort();
  if (!extras.length) return;
  error('I7', `${kind}/`, `orphan files: ${extras.join(', ')}`);
}

type IssueFn = (checkId: Ns5OracleCheckId, path: string, message: string, code?: Ns5OracleIssue['code']) => void;

function entityHasLifecycle(entity: Ns5OntologyEntityArtifact | undefined): boolean {
  return Boolean(entity && (entity.lifecycleStates.length || entity.transitions.length));
}

function birthStates(entity: Ns5OntologyEntityArtifact | undefined): Set<string> | null {
  if (!entity?.lifecycleStates.length) return null;
  const incoming = new Set(entity.transitions.map(transition => transition.to).filter(Boolean));
  const births = entity.lifecycleStates
    .filter(entry => entry.reachedBy !== 'time' && !incoming.has(entry.state))
    .map(entry => entry.state)
    .filter(Boolean);
  if (births.length) return new Set(births);
  return new Set(entity.lifecycleStates.map(entry => entry.state).filter(Boolean));
}

function actorMatches(by: Ns5OntologyEntityArtifact['transitions'][number]['by'], actor: string): boolean {
  return Boolean(actor && Array.isArray(by) && by.includes(actor));
}

function fromIntersects(from: readonly string[], reachable: Set<string> | null): boolean {
  if (!from.length) return false;
  if (reachable === null) return true;
  return from.some(state => reachable.has(state));
}

function orderedJourneys(sources: Ns5OracleSources): Ns5OracleSources['journeys'] {
  const byId = new Map(sources.journeys.map(journey => [journey.journeyId, journey]));
  const ordered: Ns5OracleSources['journeys'] = [];
  const seen = new Set<string>();
  for (const entry of sources.journeyIndex.journeys) {
    const journey = byId.get(entry.journeyId);
    if (!journey || seen.has(journey.journeyId)) continue;
    seen.add(journey.journeyId);
    ordered.push(journey);
  }
  for (const journey of sources.journeys) {
    if (seen.has(journey.journeyId)) continue;
    ordered.push(journey);
  }
  return ordered;
}

function entityMap(sources: Ns5OracleSources): Map<string, Ns5OntologyEntityArtifact> {
  return new Map(sources.entities.map(entity => [entity.entityId, entity]));
}

function fieldExists(ref: string, entityById: Map<string, Ns5OntologyEntityArtifact>): boolean {
  const parsed = splitFieldRef(ref);
  if (!parsed) return false;
  const entity = entityById.get(parsed.entityId);
  if (!entity) return false;
  return ns5FieldRefExists(ref, asRulesEntity(entity));
}

function transitionExists(ref: string, entityById: Map<string, Ns5OntologyEntityArtifact>): boolean {
  const parsed = splitTransitionRef(ref);
  if (!parsed) return false;
  const entity = entityById.get(parsed.entityId);
  if (!entity) return false;
  return entity.transitions.some(transition => transition.transitionId === parsed.transitionId);
}

function detailsField(ref: string, sources: Ns5OracleSources): boolean {
  const parsed = splitFieldRef(ref);
  if (!parsed) return false;
  const entity = entityMap(sources).get(parsed.entityId);
  return Boolean(entity?.details && parsed.fieldId in entity.details);
}

function asRulesEntity(entity: Ns5OntologyEntityArtifact): Ns5RulesEntityView {
  return {
    entityId: entity.entityId,
    fields: entity.fields,
    details: entity.details,
    storage: entity.storage,
    transitions: entity.transitions.map(transition => ({ transitionId: transition.transitionId, by: transition.by })),
  };
}
