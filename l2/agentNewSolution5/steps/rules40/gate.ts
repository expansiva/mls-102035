/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/rules40/gate.ts" enhancement="_blank"/>

import type { Ns5Rule } from '/_102035_/l2/solution/types.js';
import {
  ns5FieldRefExists,
  splitFieldRef,
  splitTransitionRef,
  type Ns5RulesEntityView,
} from '/_102035_/l2/agentNewSolution5/steps/rules40/contracts.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const FIELD_REF = /^[A-Z][A-Za-z0-9]*\.(?:details\.)?[a-z][A-Za-z0-9]*$/;
const TRANSITION_REF = /^[A-Z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*$/;

export interface Ns5RulesGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface Ns5RulesGateResult {
  ok: boolean;
  issues: Ns5RulesGateIssue[];
}

export interface Ns5RulesGateContext {
  moduleName?: string;
  entities: readonly Ns5RulesEntityView[];
  journeys: ReadonlyArray<{ journeyId: string }>;
}

export function validateNs5Rules(
  rules: Ns5Rule[],
  context: Ns5RulesGateContext,
): Ns5RulesGateResult {
  const issues: Ns5RulesGateIssue[] = [];
  const entityById = new Map(context.entities.map(entity => [entity.entityId, entity]));
  const journeyIds = new Set(context.journeys.map(journey => journey.journeyId).filter(Boolean));
  const ruleIds = new Set<string>();
  const citedTime = new Set<string>();

  rules.forEach((rule, index) => {
    const base = `rules[${index}]`;
    if (!MEMBER_ID.test(rule.ruleId)) {
      error(issues, 'NS5_RULES_ID', 'ruleId must be lowerCamel.', `${base}.ruleId`);
    }
    if (rule.ruleId && ruleIds.has(rule.ruleId)) {
      error(issues, 'NS5_RULES_ID_DUPLICATE', `Duplicate ruleId ${rule.ruleId}.`, `${base}.ruleId`);
    }
    if (rule.ruleId) ruleIds.add(rule.ruleId);
    if (!rule.title.trim()) error(issues, 'NS5_RULES_TITLE', 'Rule title is required.', `${base}.title`);
    if (!rule.description.trim()) {
      error(issues, 'NS5_RULES_DESCRIPTION', 'Business description is required.', `${base}.description`);
    }

    const applies = rule.appliesTo;
    const refCount = applies.entityRefs.length + applies.fieldRefs.length
      + applies.transitionRefs.length + applies.journeyRefs.length;
    if (!refCount) {
      error(issues, 'NS5_RULES_NO_REF', 'Every rule lists at least one appliesTo reference.', `${base}.appliesTo`);
    }

    applies.entityRefs.forEach((entityId, position) => {
      const path = `${base}.appliesTo.entityRefs[${position}]`;
      if (!ENTITY_ID.test(entityId)) {
        error(issues, 'NS5_RULES_ENTITY_ID', 'entityRefs must be UpperCamel entity ids.', path);
      } else if (!entityById.has(entityId)) {
        error(issues, 'NS5_RULES_ENTITY_UNKNOWN', `Unknown entity ${entityId}.`, path);
      }
    });

    applies.fieldRefs.forEach((ref, position) => {
      const path = `${base}.appliesTo.fieldRefs[${position}]`;
      if (!FIELD_REF.test(ref)) {
        error(issues, 'NS5_RULES_FIELD_FORMAT', 'fieldRefs must be Entity.field or Entity.details.name.', path);
        return;
      }
      const parsed = splitFieldRef(ref);
      const entity = parsed ? entityById.get(parsed.entityId) : undefined;
      if (!entity || !parsed || !ns5FieldRefExists(ref, entity)) {
        error(issues, 'NS5_RULES_FIELD_UNKNOWN', `Unknown field ref ${ref}.`, path);
      }
    });

    applies.transitionRefs.forEach((ref, position) => {
      const path = `${base}.appliesTo.transitionRefs[${position}]`;
      if (!TRANSITION_REF.test(ref)) {
        error(issues, 'NS5_RULES_TRANSITION_FORMAT', 'transitionRefs must be Entity.transitionId.', path);
        return;
      }
      const parsed = splitTransitionRef(ref);
      const entity = parsed ? entityById.get(parsed.entityId) : undefined;
      const transition = entity?.transitions.find(item => item.transitionId === parsed?.transitionId);
      if (!parsed || !entity || !transition) {
        error(issues, 'NS5_RULES_TRANSITION_UNKNOWN', `Unknown transition ref ${ref}.`, path);
        return;
      }
      if (transition.by === 'time') citedTime.add(ref);
    });

    applies.journeyRefs.forEach((journeyId, position) => {
      const path = `${base}.appliesTo.journeyRefs[${position}]`;
      if (!MEMBER_ID.test(journeyId)) {
        error(issues, 'NS5_RULES_JOURNEY_ID', 'journeyRefs must be lowerCamel journey ids.', path);
      } else if (!journeyIds.has(journeyId)) {
        error(issues, 'NS5_RULES_JOURNEY_UNKNOWN', `Unknown journey ${journeyId}.`, path);
      }
    });
  });

  context.entities.forEach((entity, entityPosition) => {
    entity.transitions.forEach((transition, transitionPosition) => {
      if (transition.by !== 'time') return;
      const ref = `${entity.entityId}.${transition.transitionId}`;
      if (citedTime.has(ref)) return;
      error(
        issues,
        'NS5_RULES_TIME_WITHOUT_RULE',
        `Transition ${ref} is by time and needs a rule that cites it.`,
        `entities[${entityPosition}].transitions[${transitionPosition}]`,
      );
    });
  });

  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

export function formatNs5RulesGate(issues: Ns5RulesGateIssue[]): string {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => {
      const where = issue.path ? ` ${issue.path}` : '';
      return `${issue.code}${where}: ${issue.message}`;
    })
    .join('\n');
}

function error(issues: Ns5RulesGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, ...(path ? { path } : {}) });
}
