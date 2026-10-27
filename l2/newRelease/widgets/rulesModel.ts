/// <mls fileReference="_102035_/l2/newRelease/widgets/rulesModel.ts" enhancement="_blank" />

import type {
  Ns5JourneyArtifact,
  Ns5OntologyEntityArtifact,
  Ns5Rule,
  Ns5RulesArtifact,
  Ns5RulesArtifactV2,
} from '../../solution/types.js';
import type { NewReleaseValidationIssue } from '/_102035_/l2/solution/candidate/tobePaths.js';

export type RuleCitationKind = 'transition' | 'detail' | 'journey';

export interface RuleCitation {
  ruleId: string;
  kind: RuleCitationKind;
  entityId: string;
  label: string;
  transitionId?: string;
  detailName?: string;
  journeyId?: string;
  stepId?: string;
}

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;

/** Rules v2 is a map of business statements. */
export function readRulesV2(value: unknown): Ns5Rule[] | null {
  if (!value || typeof value !== 'object' || (value as { schemaVersion?: unknown }).schemaVersion !== '2026-09-16-ns5-rules-v2') return null;
  const rules = (value as { rules?: unknown }).rules;
  if (!rules || typeof rules !== 'object' || Array.isArray(rules)) return null;
  const entries = Object.entries(rules);
  if (entries.some(([ruleId, description]) => !MEMBER_ID.test(ruleId) || typeof description !== 'string')) return null;
  return entries.map(([ruleId, description]) => ({ ruleId, description: description as string }));
}

/** Change one existing statement while retaining the written artifact and its metadata. */
export function editRulesV2Text(artifact: Ns5RulesArtifactV2, ruleId: string, description: string): Ns5RulesArtifactV2 | null {
  if (!readRulesV2(artifact) || !Object.hasOwn(artifact.rules, ruleId) || !description.trim()) return null;
  const next = structuredClone(artifact);
  next.rules = { ...next.rules, [ruleId]: description };
  return next;
}

function textMentionsRule(text: string, ruleId: string): boolean {
  const escaped = ruleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, 'i').test(text);
}

export function collectRuleCitations(
  rules: readonly Ns5Rule[],
  entities: readonly Ns5OntologyEntityArtifact[],
  journeys: readonly Ns5JourneyArtifact[],
): RuleCitation[] {
  const knownRules = new Set(rules.map(rule => rule.ruleId));
  const citations: RuleCitation[] = [];
  const transitions = new Map<string, { entityId: string; ruleRefs: string[] }>();

  for (const entity of entities) {
    for (const transition of entity.transitions) {
      const ruleRefs = (transition.ruleRefs || []).filter(ruleId => knownRules.has(ruleId));
      transitions.set(`${entity.entityId}:${transition.transitionId}`, { entityId: entity.entityId, ruleRefs });
      for (const ruleId of ruleRefs) {
        citations.push({
          ruleId,
          kind: 'transition',
          entityId: entity.entityId,
          transitionId: transition.transitionId,
          label: `${entity.entityId}.${transition.transitionId}`,
        });
      }
    }
    for (const [detailName, detail] of Object.entries(entity.details || {})) {
      for (const rule of rules) {
        if (!textMentionsRule(`${detailName} ${detail.description}`, rule.ruleId)) continue;
        citations.push({
          ruleId: rule.ruleId,
          kind: 'detail',
          entityId: entity.entityId,
          detailName,
          label: `${entity.entityId}.details.${detailName}`,
        });
      }
    }
  }

  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (!step.transitionRef) continue;
      const transition = transitions.get(`${step.entity}:${step.transitionRef}`);
      if (!transition) continue;
      for (const ruleId of transition.ruleRefs) {
        citations.push({
          ruleId,
          kind: 'journey',
          entityId: transition.entityId,
          journeyId: journey.journeyId,
          stepId: step.stepId,
          transitionId: step.transitionRef,
          label: `${journey.journeyId}.${step.stepId}`,
        });
      }
    }
  }

  return citations;
}

export function citationsForRule(citations: readonly RuleCitation[], ruleId: string): RuleCitation[] {
  return citations.filter(citation => citation.ruleId === ruleId);
}

export function ruleEntityIds(citations: readonly RuleCitation[], ruleId: string): string[] {
  return [...new Set(citationsForRule(citations, ruleId).map(citation => citation.entityId))].sort();
}

export function filterRules(
  rules: readonly Ns5Rule[],
  citations: readonly RuleCitation[],
  query: string,
): Ns5Rule[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [...rules];
  return rules.filter(rule => {
    const related = citationsForRule(citations, rule.ruleId).map(citation => `${citation.label} ${citation.entityId}`).join(' ');
    return `${rule.ruleId} ${rule.description} ${related}`.toLocaleLowerCase().includes(normalized);
  });
}

export function groupRulesByEntity(
  rules: readonly Ns5Rule[],
  citations: readonly RuleCitation[],
): Array<{ entityId: string | null; rules: Ns5Rule[] }> {
  const groups = new Map<string, Ns5Rule[]>();
  const orphan: Ns5Rule[] = [];
  for (const rule of rules) {
    const entityIds = ruleEntityIds(citations, rule.ruleId);
    if (!entityIds.length) {
      orphan.push(rule);
      continue;
    }
    for (const entityId of entityIds) groups.set(entityId, [...(groups.get(entityId) || []), rule]);
  }
  return [
    ...[...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([entityId, groupedRules]) => ({ entityId, rules: groupedRules })),
    ...(orphan.length ? [{ entityId: null, rules: orphan }] : []),
  ];
}

export function isValidNewRuleId(artifact: Pick<Ns5RulesArtifact, 'rules'>, ruleId: string): boolean {
  return MEMBER_ID.test(ruleId) && !artifact.rules.some(rule => rule.ruleId === ruleId);
}

export function rulesOracleIssues(issues: readonly NewReleaseValidationIssue[]): NewReleaseValidationIssue[] {
  return issues.filter(issue => issue.artifact === 'rules.defs.ts'
    || issue.code === 'I4'
    || issue.code === 'NS5_FINALIZE_I4');
}

/** Presentation only: never persisted into the rules artifact. */
export function humanizeRuleKey(key: string): string {
  const text = key.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLocaleLowerCase();
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

export function ontologyRuleCitations(rules: readonly Ns5Rule[], entities: readonly (Ns5OntologyEntityArtifact | import('../../solution/types.js').Ns5OntologyEntityV3)[]): RuleCitation[] {
  const known = new Set(rules.map(rule => rule.ruleId));
  const result: RuleCitation[] = [];
  for (const entity of entities) {
    for (const ruleId of new Set('rules' in entity ? entity.rules : [])) {
      if (known.has(ruleId)) result.push({ruleId, kind: 'detail', entityId: entity.entityId, label: entity.title});
    }
    for (const transition of entity.transitions || []) {
      for (const ruleId of new Set(transition.ruleRefs || [])) {
        if (known.has(ruleId)) result.push({ruleId, kind: 'transition', entityId: entity.entityId, transitionId: transition.transitionId, label: transition.description || transition.transitionId});
      }
    }
  }
  return result;
}

export function rulePresentationGroups(rules: readonly Ns5Rule[], citations: readonly RuleCitation[], entities: readonly {entityId: string; title: string}[], orphanLabel: string) {
  return groupRulesByEntity(rules, citations).map(group => ({...group, title: group.entityId ? entities.find(entity => entity.entityId === group.entityId)?.title || group.entityId : orphanLabel,
    rules: [...group.rules].sort((a, b) => humanizeRuleKey(a.ruleId).localeCompare(humanizeRuleKey(b.ruleId))),
  })).sort((a, b) => a.title.localeCompare(b.title));
}

/** Value-only edit: no insertion, deletion, rename, or wrapper normalization. */
export function patchRuleText(artifact: import('../../solution/types.js').Ns5RulesAny, ruleId: string, description: string): import('../../solution/types.js').Ns5RulesAny {
  if (artifact.schemaVersion === '2026-09-16-ns5-rules-v2') {
    if (!Object.hasOwn(artifact.rules, ruleId)) return structuredClone(artifact);
    return {...structuredClone(artifact), rules: {...artifact.rules, [ruleId]: description}};
  }
  return {...structuredClone(artifact), rules: artifact.rules.map(rule => rule.ruleId === ruleId ? {...rule, description} : structuredClone(rule))};
}
