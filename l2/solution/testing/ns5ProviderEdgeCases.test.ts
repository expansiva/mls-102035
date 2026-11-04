/// <mls fileReference="_102035_/l2/solution/testing/ns5ProviderEdgeCases.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { providerEdgeCases, type ProviderEdgeCase } from '/_102035_/l2/solution/testing/providerEdgeCases.js';
import { normalizeNs5AccessPayload } from '/_102035_/l2/solution/gates/access60/contracts.js';
import { normalizeNs5IntegrationPayload } from '/_102035_/l2/solution/gates/integration70/contracts.js';
import { normalizeNs5JourneysPayload } from '/_102035_/l2/solution/gates/journeys20/contracts.js';
import { normalizeNs5OntologyBindings, normalizeNs5OntologyPlan } from '/_102035_/l2/solution/gates/ontology30/contracts.js';
import { normalizeNs5RulesPayload } from '/_102035_/l2/solution/gates/rules40/contracts.js';
import { normalizeNs5WorkflowsPayload } from '/_102035_/l2/solution/gates/workflows50/contracts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOLUTION = path.resolve(HERE, '..');
const SCHEMAS = path.resolve(HERE, '../../agentNewSolution5/schemas');
const MODULE = 'controleEstoque';

const readJson = (file: string): Record<string, unknown> => JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;

interface Step {
  name: string;
  /** The normalizer lets values through that the schema forbids; the gate after it is the only defence (l4_p4_95 s3). */
  leaks?: string;
  schema: string;
  draft: string;
  run: (value: unknown) => unknown;
}

const STEPS: Step[] = [
  { name: 'journeys20', leaks: 'título, goal, steps e outcome vazios; actorRef e entity fora do pattern', schema: 'journey.schema.json', draft: `fixtures/journeys20/${MODULE}-draft.json`, run: value => normalizeNs5JourneysPayload(value) },
  { name: 'ontology30 plan', leaks: 'vazio e pattern em entidades do plano', schema: 'ontology-plan.schema.json', draft: `fixtures/ontology30/${MODULE}-plan-draft.json`, run: value => normalizeNs5OntologyPlan(value, MODULE) },
  { name: 'ontology30 bindings', leaks: 'vazio e pattern', schema: 'ontology-bindings.schema.json', draft: `fixtures/ontology30/${MODULE}-bindings-draft.json`, run: value => normalizeNs5OntologyBindings(value) },
  { name: 'rules40', schema: 'rules.schema.json', draft: `fixtures/rules40/${MODULE}-draft.json`, run: value => normalizeNs5RulesPayload(value) },
  { name: 'workflows50', schema: 'workflows.schema.json', draft: `fixtures/workflows50/${MODULE}-draft.json`, run: value => normalizeNs5WorkflowsPayload(value) },
  { name: 'access60', leaks: 'vazio e pattern em grants e atores', schema: 'access.schema.json', draft: `fixtures/access60/${MODULE}-draft.json`, run: value => normalizeNs5AccessPayload(value) },
  { name: 'integration70', leaks: 'vazio e pattern em itens', schema: 'integration.schema.json', draft: `fixtures/integration70/${MODULE}-draft.json`, run: value => normalizeNs5IntegrationPayload(value) },
];

/** Every `[key, value]` in a result, to look for a value the provider let through. */
function entries(value: unknown, out: Array<[string, unknown]> = []): Array<[string, unknown]> {
  if (Array.isArray(value)) for (const item of value) entries(item, out);
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) { out.push([key, child]); entries(child, out); }
  }
  return out;
}

function leaked(item: ProviderEdgeCase, result: unknown): string | null {
  const key = item.path.replace(/\[\d+\]/gu, '').split('.').pop() ?? '';
  const sent = (() => {
    let node: unknown = item.value;
    for (const part of item.path.split('.')) {
      const match = /^([^[]*)((?:\[\d+\])*)$/u.exec(part);
      if (!match) return undefined;
      if (match[1]) node = (node as Record<string, unknown> | undefined)?.[match[1]];
      for (const index of match[2].matchAll(/\[(\d+)\]/gu)) node = (node as unknown[] | undefined)?.[Number(index[1])];
    }
    return node;
  })();
  for (const [name, found] of entries(result)) {
    if (name !== key) continue;
    if (item.rule === 'minLength' && typeof found === 'string' && !found.trim()) return `${key} = ${JSON.stringify(found)}`;
    if ((item.rule === 'pattern' || item.rule === 'maxLength' || item.rule === 'format') && found === sent) return `${key} kept the value sent`;
    if (item.rule === 'minItems' && Array.isArray(found) && !found.length) return `${key} = []`;
    if (item.rule === 'maxItems' && Array.isArray(found) && Array.isArray(sent) && found.length === sent.length) return `${key} kept ${found.length} items`;
  }
  return null;
}

for (const step of STEPS) {
  void test(`${step.name}: what the provider lets through is normalized or refused with a reason`, { todo: step.leaks ? `the normalizer passes it on (${step.leaks}); the step gate refuses it or the normalizer replaces it, see ns5GateDefense.test.ts` : false }, () => {
    const schema = readJson(path.join(SCHEMAS, step.schema));
    const example = readJson(path.join(SOLUTION, step.draft));
    const cases = providerEdgeCases(schema, example);
    assert.ok(cases.length > 0, `no case for ${step.name}`);
    const leaks: string[] = [];
    for (const item of cases) {
      const label = `${item.path} ${item.rule} ${item.variant}`;
      let result: unknown;
      try {
        result = step.run(item.value);
      } catch (error) {
        assert.ok(error instanceof Error && error.message.length > 10, `${label}: the refusal says why`);
        continue;
      }
      const found = leaked(item, result);
      if (found) leaks.push(`${label} -> ${found}`);
    }
    assert.deepEqual(leaks, [], `${step.name}: values that went through the normalizer`);
  });
}
