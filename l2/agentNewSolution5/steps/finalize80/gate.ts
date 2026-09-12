/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/finalize80/gate.ts" enhancement="_blank"/>

/**
 * Integrity oracle across the six NS5 sources. One code per check (I1–I10).
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
  ns5EntityHasActOrAffects,
  ns5EntityHasWrittenFields,
  ns5LifecycleHasBranchingOrigin,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';
import {
  ns5FieldRefExists,
  splitFieldRef,
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
  NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION,
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
  checkI4(sources, error);
  checkI5(sources, error);
  checkI6(sources, warning);
  checkI7(sources, error);
  checkI8(sources, error);
  checkI9(sources, error);
  checkI10(sources, error);

  return buildNs5FinalizeReport(sources.module.moduleName, errors, warnings, {
    actors: sources.access.actors.length,
    journeys: sources.journeys.length,
    entities: sources.entities.length,
    rules: sources.rules.rules.length,
    processes: sources.workflows.processes.length,
    grants: sources.access.grants.length,
  });
}

function checkI1(sources: Ns5OracleSources, error: IssueFn): void {
  const actorIds = new Set(sources.access.actors.map(actor => actor.actorId).filter(Boolean));
  const entityById = entityMap(sources);
  const entityIds = new Set(entityById.keys());
  const journeyById = new Map(sources.journeys.map(journey => [journey.journeyId, journey]));
  const journeyIds = new Set(journeyById.keys());
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
      if (step.entity && !entityIds.has(step.entity) && !isLiftedModuleDetailRef(step.entity, sources)) {
        error('I1', `${path}.entity`, `Unknown entity ${step.entity}.`);
      }
      for (const extra of step.affects || []) {
        if (extra && !entityIds.has(extra) && !isLiftedModuleDetailRef(extra, sources)) {
          error('I1', `${path}.affects`, `Unknown entity ${extra}.`);
        }
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

  sources.access.grants.forEach((grant, index) => {
    const path = `access.grants[${index}]`;
    if (grant.actorRef && !actorIds.has(grant.actorRef)) {
      error('I1', `${path}.actorRef`, `Unknown actor ${grant.actorRef}.`);
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
  const grantsByActor = new Set(sources.access.grants.map(grant => grant.actorRef).filter(Boolean));
  for (const actor of sources.access.actors) {
    if (!actor.actorId) continue;
    if (!journeyActors.has(actor.actorId)) {
      error('I3', `access.actors.${actor.actorId}`, `Actor ${actor.actorId} has no journey.`);
    }
    if (!grantsByActor.has(actor.actorId)) {
      error('I3', `access.actors.${actor.actorId}`, `Actor ${actor.actorId} has no grant.`);
    }
  }
}

function checkI4(sources: Ns5OracleSources, error: IssueFn): void {
  const ruleIds = new Set(sources.rules.rules.map(rule => rule.ruleId).filter(Boolean));
  for (const entity of sources.entities) {
    entity.transitions.forEach((transition, index) => {
      (transition.ruleRefs || []).forEach((ruleRef, refIndex) => {
        if (!ruleRef) return;
        if (ruleIds.has(ruleRef)) return;
        error(
          'I4',
          `ontology.${entity.entityId}.transitions[${index}].ruleRefs[${refIndex}]`,
          `Unknown rule ${ruleRef}.`,
        );
      });
    });
  }
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

/**
 * A party:person that anchors an own/related grant is someone who will sign in.
 * An internal actor must `act` on that entity (not merely `affects`). Journey
 * `entry.mode` has no public value (`coldStart` | `contextOrLookup` | `fromNotification`).
 */
function checkI8(sources: Ns5OracleSources, error: IssueFn): void {
  const entityById = entityMap(sources);
  const actorById = new Map(sources.access.actors.map(actor => [actor.actorId, actor]));
  const registered = new Set<string>();
  for (const journey of sources.journeys) {
    const actor = actorById.get(journey.business.actorRef);
    if (actor?.kind !== 'internal') continue;
    for (const step of journey.business.steps) {
      if (step.kind === 'act' && step.entity) registered.add(step.entity);
    }
  }
  sources.access.grants.forEach((grant, index) => {
    const mode = grant.dataScope.mode;
    if (mode !== 'own' && mode !== 'related') return;
    const personId = grant.dataScope.anchorEntity || '';
    if (!personId) return;
    const entity = entityById.get(personId);
    if (!entity || entity.party !== 'person') return;
    if (registered.has(personId)) return;
    error(
      'I8',
      `access.grants[${index}]`,
      `Person ${personId} is the ${mode} login anchor of grant ${grant.grantId} but no internal actor has an act step on that entity.`,
      NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION,
    );
  });
}

function checkI9(sources: Ns5OracleSources, error: IssueFn): void {
  for (const entity of sources.entities) {
    const fieldIds = new Set(entity.fields.map(field => field.fieldId).filter(Boolean));
    (entity.uniqueKeys || []).forEach((key, keyIndex) => {
      key.forEach((fieldId, fieldIndex) => {
        if (!fieldId) return;
        if (fieldIds.has(fieldId)) return;
        error(
          'I9',
          `ontology.${entity.entityId}.uniqueKeys[${keyIndex}][${fieldIndex}]`,
          `Unknown field ${fieldId}.`,
        );
      });
    });
  }
}

/**
 * Same writer predicates as ontology30 / access60: a written entity is an `act`
 * entity or listed in an act's `affects`, or `maintenance: 'crud'`; a crud
 * entity has an internal-actor grant. Conflicting crud is dropped by ontology30
 * normalize, not by this check.
 */
function checkI10(sources: Ns5OracleSources, error: IssueFn): void {
  const actorById = new Map(sources.access.actors.map(actor => [actor.actorId, actor]));
  for (const entity of sources.entities) {
    const path = `ontology.${entity.entityId}`;
    const crud = entity.maintenance === 'crud';
    const hasWriter = ns5EntityHasActOrAffects(sources.journeys, entity.entityId);
    if (!crud && !hasWriter && ns5EntityHasWrittenFields(entity)) {
      error(
        'I10',
        `${path}.maintenance`,
        `Entity ${entity.entityId} has written fields but no writer: it must be the entity of an act step or listed in an act's affects, or declare maintenance: 'crud' (a reference catalog with no lifecycle).`,
      );
    }
    if (!crud) continue;
    const covered = sources.access.grants.some(grant => {
      if (!grant.entityRefs.includes(entity.entityId)) return false;
      return actorById.get(grant.actorRef)?.kind === 'internal';
    });
    if (covered) continue;
    error(
      'I10',
      `${path}.maintenance`,
      `CRUD entity ${entity.entityId} has no grant from an internal actor.`,
    );
  }
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

/**
 * A journey `entity`/`affects` naming an id ontology30 lifted into `module.details`
 * is a legitimate read of those aggregates — not an unknown entity. Both locks:
 * the id is in `liftedAggregateEntities` (pipeline.json) and `module.details` still
 * has keys (the absorbed aggregates). An unknown id that was never lifted stays I1.
 */
function isLiftedModuleDetailRef(id: string, sources: Ns5OracleSources): boolean {
  if (!id) return false;
  if (!(sources.liftedAggregateEntities || []).includes(id)) return false;
  const details = sources.module.details;
  return !!details && Object.keys(details).length > 0;
}

function fieldExists(ref: string, entityById: Map<string, Ns5OntologyEntityArtifact>): boolean {
  const parsed = splitFieldRef(ref);
  if (!parsed) return false;
  const entity = entityById.get(parsed.entityId);
  if (!entity) return false;
  return ns5FieldRefExists(ref, asRulesEntity(entity));
}

function asRulesEntity(entity: Ns5OntologyEntityArtifact): Ns5RulesEntityView {
  return {
    entityId: entity.entityId,
    fields: entity.fields,
    details: entity.details
      ? Object.fromEntries(Object.entries(entity.details).map(([name, detail]) => [name, detail.description]))
      : undefined,
    storage: entity.storage,
    transitions: entity.transitions.map(transition => ({ transitionId: transition.transitionId, by: transition.by })),
  };
}
