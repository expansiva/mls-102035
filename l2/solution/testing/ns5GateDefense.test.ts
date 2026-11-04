/// <mls fileReference="_102035_/l2/solution/testing/ns5GateDefense.test.ts" enhancement="_blank" />

/**
 * s3b. For the steps whose normalizer lets a provider-only value through (see ns5ProviderEdgeCases.test.ts),
 * runs normalizer -> gate and classifies each variant. It never fails on C; it prints one line per variant:
 *   A = refused and the message/issue names the field; B = refused without naming it; C = let through.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { providerEdgeCases, type ProviderEdgeCase } from '/_102035_/l2/solution/testing/providerEdgeCases.js';
import { normalizeNs5AccessPayload } from '/_102035_/l2/solution/gates/access60/contracts.js';
import { validateNs5Access, type Ns5AccessGateContext } from '/_102035_/l2/solution/gates/access60/gate.js';
import { normalizeNs5IntegrationPayload } from '/_102035_/l2/solution/gates/integration70/contracts.js';
import { validateNs5Integration } from '/_102035_/l2/solution/gates/integration70/gate.js';
import { normalizeNs5JourneysPayload } from '/_102035_/l2/solution/gates/journeys20/contracts.js';
import { validateNs5Journeys } from '/_102035_/l2/solution/gates/journeys20/gate.js';
import {
  normalizeNs5OntologyBindings,
  normalizeNs5OntologyPlan,
  type Ns5OntologyBindingsDraft,
  type Ns5OntologyEntityDraft,
  type Ns5OntologyPlanDraft,
} from '/_102035_/l2/solution/gates/ontology30/contracts.js';
import { validateNs5OntologyBindings, validateNs5OntologyPlan } from '/_102035_/l2/solution/gates/ontology30/gate.js';
import { validateNs5ModuleArtifact } from '/_102035_/l2/solution/gates/module10/gate.js';
import type { Ns5ModuleActor, Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOLUTION = path.resolve(HERE, '..');
const SCHEMAS = path.resolve(HERE, '../../agentNewSolution5/schemas');
const MODULE = 'controleEstoque';

const readJson = (file: string): Record<string, unknown> => JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
const fixture = (file: string): Record<string, unknown> => readJson(path.join(SOLUTION, 'fixtures', file));
const schemaOf = (file: string): Record<string, unknown> => readJson(path.join(SCHEMAS, file));

const moduleDraft = fixture(`module10/${MODULE}-draft.json`);
const ACTORS = moduleDraft.actors as Ns5ModuleActor[];
const PLAN = fixture(`ontology30/${MODULE}-plan-draft.json`) as unknown as Ns5OntologyPlanDraft;
const BINDINGS = fixture(`ontology30/${MODULE}-bindings-draft.json`) as unknown as Ns5OntologyBindingsDraft;
const DETAILS = ['Produto', 'MovimentacaoEstoque'].map(id => fixture(`ontology30/${MODULE}/${id}-draft.json`) as unknown as Ns5OntologyEntityDraft);
const JOURNEYS = normalizeNs5JourneysPayload(fixture(`journeys20/${MODULE}-draft.json`)).journeys;
const SOURCE_PROMPT = String(moduleDraft.sourcePrompt);

/** A = refused naming the field; B = refused without naming it; D = the normalizer replaced the value, the artifact is valid; C = the value reached the artifact and the gate let it through. */
type Klass = 'A' | 'B' | 'C' | 'D';
interface Verdict { klass: Klass; message: string }
interface GateIssue { severity: 'error' | 'warning'; code: string; message: string; path?: string }
interface Step {
  name: string;
  schema: string;
  draft: string;
  /** Normalizer then gate. Returns the gate issues and what the normalizer produced; a normalizer refusal is a thrown Error. */
  run: (value: unknown) => { issues: readonly GateIssue[]; artifact: unknown };
}

function fieldOf(item: ProviderEdgeCase): string {
  return item.path.replace(/\[\d+\]/gu, '').split('.').pop() ?? '';
}

/** Every `[key, value]` in the artifact. */
function entries(value: unknown, out: Array<[string, unknown]> = []): Array<[string, unknown]> {
  if (Array.isArray(value)) for (const item of value) entries(item, out);
  else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) { out.push([key, child]); entries(child, out); }
  return out;
}

/** Did the value sent for this field survive in the artifact? */
function survives(item: ProviderEdgeCase, artifact: unknown): boolean {
  const field = fieldOf(item);
  const sentText = typeof item.variant === 'string' ? item.variant : '';
  const all = entries(artifact).filter(([key]) => key === field);
  const has = (found: unknown, test: (text: string) => boolean): boolean =>
    typeof found === 'string' ? test(found) : Array.isArray(found) && found.some(item => typeof item === 'string' && test(item));
  if (item.rule === 'minLength') return all.some(([, found]) => has(found, text => !text.trim()));
  if (item.rule === 'minItems') return all.some(([, found]) => Array.isArray(found) && !found.length);
  if (item.rule === 'pattern' || item.rule === 'format') {
    const m = /\(("(?:[^"\\]|\\.)*")\)/u.exec(sentText);
    const sent = m ? JSON.parse(m[1]) as string : null;
    return sent !== null && all.some(([, found]) => has(found, text => text === sent));
  }
  return true;
}

function classify(item: ProviderEdgeCase, run: Step['run']): Verdict {
  const field = fieldOf(item);
  let issues: readonly GateIssue[];
  let artifact: unknown;
  try {
    ({ issues, artifact } = run(item.value));
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { klass: error.message.includes(field) ? 'A' : 'B', message: `normalizer threw: ${error.message}` };
  }
  const errors = issues.filter(issue => issue.severity === 'error');
  if (!errors.length) return survives(item, artifact) ? { klass: 'C', message: 'no error issue; the value is in the artifact' } : { klass: 'D', message: 'the normalizer replaced the value; no error issue' };
  const named = errors.find(issue => (issue.path ?? '').includes(field) || issue.message.includes(field));
  const shown = named ?? errors[0];
  return { klass: named ? 'A' : 'B', message: `${shown.code} @${shown.path ?? '-'}: ${shown.message}` };
}

const ontologyContext = { moduleName: MODULE, actors: ACTORS, journeys: JOURNEYS };

const accessContext = (): Ns5AccessGateContext => ({
  moduleName: MODULE,
  actors: ACTORS.map(actor => ({ ...actor })),
  entities: PLAN.entities.map(entity => {
    const detail = DETAILS.find(item => item.entityId === entity.entityId);
    return {
      entityId: entity.entityId,
      party: entity.party,
      kind: entity.kind,
      fields: (detail?.fields ?? []).map(field => ({ fieldId: field.fieldId })),
      details: detail?.details,
      storage: { idField: entity.storage.idField },
    };
  }),
  relationships: PLAN.relationships.map(item => ({
    relationshipId: item.relationshipId,
    fromEntity: item.fromEntity,
    toEntity: item.toEntity,
    required: item.required,
    type: item.type,
  })),
  journeys: JOURNEYS.map(journey => ({ journeyId: journey.journeyId, business: journey.business })),
});

const STEPS: Step[] = [
  {
    name: 'journeys20', schema: 'journey.schema.json', draft: `journeys20/${MODULE}-draft.json`,
    run: value => { const artifact = normalizeNs5JourneysPayload(value).journeys; return { artifact, issues: validateNs5Journeys(artifact, { actors: ACTORS, moduleName: MODULE }).issues }; },
  },
  {
    name: 'ontology30 plan', schema: 'ontology-plan.schema.json', draft: `ontology30/${MODULE}-plan-draft.json`,
    run: value => { const artifact = normalizeNs5OntologyPlan(value, MODULE); return { artifact, issues: validateNs5OntologyPlan(artifact, ontologyContext).issues }; },
  },
  {
    name: 'ontology30 bindings', schema: 'ontology-bindings.schema.json', draft: `ontology30/${MODULE}-bindings-draft.json`,
    run: value => { const artifact = normalizeNs5OntologyBindings(value); return { artifact, issues: validateNs5OntologyBindings(PLAN, DETAILS, artifact, ontologyContext).issues }; },
  },
  {
    name: 'access60', schema: 'access.schema.json', draft: `access60/${MODULE}-draft.json`,
    run: value => { const artifact = normalizeNs5AccessPayload(value).grants; return { artifact, issues: validateNs5Access(artifact, accessContext()).issues }; },
  },
  {
    name: 'integration70', schema: 'integration.schema.json', draft: `integration70/${MODULE}-draft.json`,
    run: value => {
      const artifact = normalizeNs5IntegrationPayload(value);
      const { inbound, outbound, plugins } = artifact;
      return { artifact, issues: validateNs5Integration(inbound, outbound, plugins, {
        moduleName: MODULE,
        actors: ACTORS.map(actor => ({ actorId: actor.actorId, kind: actor.kind })),
        entities: PLAN.entities.map(entity => ({ entityId: entity.entityId })),
        registryModuleNames: [MODULE],
        siblings: [],
        sourcePrompt: SOURCE_PROMPT,
        journeySteps: JOURNEYS.map(journey => ({ journeyId: journey.journeyId, stepIds: journey.business.steps.map(step => step.stepId) })),
      }).issues };
    },
  },
  {
    // The module10 normalizer lives inside the agent (steps/module10/contracts.ts) and cannot be imported from solution/;
    // the gate runs on the variant as the artifact, with its own actors as context.
    name: 'module10 (gate only)', schema: 'module.schema.json', draft: `module10/${MODULE}-draft.json`,
    run: value => {
      const artifact = value as Ns5ModuleArtifact & { actors: Ns5ModuleActor[] };
      return { artifact, issues: validateNs5ModuleArtifact(artifact, { fixedModuleName: MODULE, actors: artifact.actors }).issues };
    },
  },
];

const counts = new Map<string, Record<Klass, number>>();

for (const step of STEPS) {
  void test(`${step.name}: provider-only values through normalizer + gate`, t => {
    const cases = providerEdgeCases(schemaOf(step.schema), fixture(step.draft));
    assert.ok(cases.length > 0, `no case for ${step.name}`);
    const tally: Record<Klass, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const item of cases) {
      const verdict = classify(item, step.run);
      tally[verdict.klass] += 1;
      t.diagnostic(`${step.name} | ${item.path} | ${item.rule} | ${item.variant} | ${verdict.klass} | ${verdict.message.slice(0, 140).replace(/\s+/gu, ' ')}`);
    }
    counts.set(step.name, tally);
    t.diagnostic(`SUMMARY ${step.name} | total=${cases.length} A=${tally.A} B=${tally.B} C=${tally.C} D=${tally.D}`);
    assert.equal(tally.A + tally.B + tally.C + tally.D, cases.length);
    assert.equal(tally.C, 0, `${step.name}: a provider-only value reached the artifact and the gate let it through (see the C lines in the diagnostics)`);
  });
}

void test('every step was classified', () => {
  assert.equal(counts.size, STEPS.length);
});
