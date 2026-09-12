/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/journeys20/contracts.ts" enhancement="_blank"/>

import { normalizeModuleName } from '/_102035_/l2/solution/fs.js';
import {
  NS5_JOURNEY_SCHEMA_VERSION,
  type Ns5JourneyArtifact,
  type Ns5JourneyIndexArtifact,
  type Ns5JourneyStep,
  type Ns5SystemDecision,
} from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;

export interface Ns5JourneyDraft {
  journeyId: string;
  business: Ns5JourneyArtifact['business'];
}

export const NS5_JOURNEY_ACT_EFFECTS = ['create', 'update', 'transition'] as const;
export type Ns5JourneyActEffect = typeof NS5_JOURNEY_ACT_EFFECTS[number];

export const NS5_JOURNEY_DROP_TRANSITION_REF = 'dropTransitionRef' as const;

/** Same shape as access60 / ontology30 `draft.normalizations[]`. */
export interface Ns5JourneysFormNormalization {
  kind: typeof NS5_JOURNEY_DROP_TRANSITION_REF;
  journeyId: string;
  stepId: string;
  detail: string;
}

export interface Ns5JourneysNormalization {
  journeys: Ns5JourneyDraft[];
  normalizations: Ns5JourneysFormNormalization[];
}

export function buildNs5JourneysTool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5Journeys',
    'Submit every business journey: actor, entry, steps with affects, decide, outcome.',
    schema,
  );
}

export function normalizeNs5JourneysPayload(value: unknown): Ns5JourneysNormalization {
  const root = record(value);
  const normalizations: Ns5JourneysFormNormalization[] = [];
  const journeys = list(root.journeys)
    .map(item => normalizeJourney(item, normalizations))
    .filter(journey => journey.journeyId || journey.business.title);
  return { journeys, normalizations };
}

export async function hashNs5Journey(draft: Ns5JourneyDraft): Promise<Ns5JourneyArtifact> {
  return {
    schemaVersion: NS5_JOURNEY_SCHEMA_VERSION,
    journeyId: draft.journeyId,
    business: draft.business,
    businessHash: await sha256Ns5(draft.business),
  };
}

export function buildNs5JourneyIndex(
  moduleName: string,
  artifacts: Ns5JourneyArtifact[],
  systemDecisions: Ns5SystemDecision[],
): Ns5JourneyIndexArtifact {
  return {
    schemaVersion: NS5_JOURNEY_SCHEMA_VERSION,
    moduleName,
    journeys: artifacts.map(artifact => ({
      journeyId: artifact.journeyId,
      actorRef: artifact.business.actorRef,
      title: artifact.business.title,
    })),
    systemDecisions,
  };
}

export function countNs5DecideSteps(journeys: Array<{ business: { steps: Array<{ kind: string }> } }>): number {
  return journeys.reduce(
    (total, journey) => total + journey.business.steps.filter(step => step.kind === 'decide').length,
    0,
  );
}

export function ns5JourneyOperationKey(journey: Ns5JourneyDraft): string {
  return [...new Set(journey.business.steps.map(step => `${step.kind}:${step.entity}`).filter(item => item !== ':'))]
    .sort()
    .join(',');
}

export async function sha256Ns5(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableStringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `sha256:${hex}`;
}

function normalizeJourney(value: unknown, normalizations: Ns5JourneysFormNormalization[]): Ns5JourneyDraft {
  const source = record(value);
  const business = record(source.business);
  const entry = record(business.entry);
  const outcome = record(business.outcome);
  const mode = text(entry.mode);
  const journeyId = memberId(text(source.journeyId) || text(business.title), '');
  return {
    journeyId,
    business: {
      actorRef: memberId(text(business.actorRef), ''),
      title: text(business.title),
      goal: text(business.goal),
      entry: {
        mode: mode as Ns5JourneyArtifact['business']['entry']['mode'],
      },
      steps: list(business.steps).map(item => normalizeStep(item, journeyId, normalizations)),
      outcome: {
        statement: text(outcome.statement),
        evidence: strings(outcome.evidence),
      },
    },
  };
}

function normalizeStep(
  value: unknown,
  journeyId: string,
  normalizations: Ns5JourneysFormNormalization[],
): Ns5JourneyStep {
  const step = record(value);
  const kind = text(step.kind) as Ns5JourneyStep['kind'];
  const affects = uniquePascalIds(step.affects);
  const stepId = memberId(text(step.stepId) || text(step.title), '');
  // The model fills handoffTo on every step as "who does this". Only a handoff names a receiver.
  const handoffTo = kind === 'handoff' ? memberId(text(step.handoffTo), '') : '';
  // effect / transitionRef are act intent. Other kinds drop them (same class as handoffTo).
  const effect = kind === 'act' ? actEffect(step.effect) : undefined;
  const rawTransitionRef = kind === 'act' ? memberId(text(step.transitionRef), '') : '';
  if (kind === 'act' && rawTransitionRef && effect !== 'transition') {
    normalizations.push({
      kind: NS5_JOURNEY_DROP_TRANSITION_REF,
      journeyId,
      stepId,
      detail: `transitionRef ${rawTransitionRef} dropped; effect is ${effect || '(missing)'}.`,
    });
  }
  const transitionRef = effect === 'transition' ? rawTransitionRef : '';
  return {
    stepId,
    kind,
    entity: normalizeEntityId(step.entity),
    ...(affects.length ? { affects } : {}),
    ...(effect ? { effect } : {}),
    ...(transitionRef ? { transitionRef } : {}),
    title: text(step.title),
    description: text(step.description),
    ...(handoffTo ? { handoffTo } : {}),
  };
}

function actEffect(value: unknown): Ns5JourneyActEffect | undefined {
  return value === 'create' || value === 'update' || value === 'transition' ? value : undefined;
}

function uniquePascalIds(value: unknown): string[] {
  return strings(value).map(normalizeEntityId).filter(Boolean);
}

/** Lexical PascalCase id. Does not translate or substitute a domain noun. */
export function normalizeEntityId(value: unknown): string {
  const raw = text(value);
  if (!raw) return '';
  const decomposed = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const words = decomposed.replace(/([a-z0-9])([A-Z])/g, '$1 $2').match(/[A-Za-z0-9]+/g) || [];
  return words.map(word => {
    if (/^[A-Z0-9]+$/.test(word)) return word;
    return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
  }).join('');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return `{${Object.keys(source).sort().map(key => `${JSON.stringify(key)}:${stableStringify(source[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function memberId(value: string, fallback: string): string {
  const id = normalizeModuleName(value || fallback, fallback);
  return MEMBER_ID.test(id) ? id : fallback;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function strings(value: unknown): string[] {
  return list(value).map(text).filter(Boolean);
}
