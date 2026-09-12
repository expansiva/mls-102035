/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/rules40/agentNs5Rules.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/agentNewSolution/helpers/ns4WorkerTools.js';
import { ownerStepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import {
  loadNs5FixtureJson,
  NS5_REAL_MODULES,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import type { Ns5JourneyArtifact, Ns5OntologyEntityArtifact, Ns5Rule } from '/_102035_/l2/solution/types.js';
import { buildNs5RulesHumanPrompt } from '/_102035_/l2/agentNewSolution5/steps/rules40/agentNs5Rules.js';
import {
  buildNs5RulesArtifact,
  buildNs5RulesTool,
  normalizeNs5RulesPayload,
} from '/_102035_/l2/agentNewSolution5/steps/rules40/contracts.js';
import {
  formatNs5RulesGate,
  validateNs5Rules,
} from '/_102035_/l2/agentNewSolution5/steps/rules40/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function loadSchema(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(HERE, '../../schemas/rules.schema.json'), 'utf8'),
  ) as Record<string, unknown>;
}

function validRule(overrides: Partial<Ns5Rule> = {}): Record<string, unknown> {
  return {
    ruleId: 'discountWithinTotal',
    description: 'The optional discount cannot exceed the total of active items.',
    ...overrides,
  };
}

function drafts(payload: unknown): Ns5Rule[] {
  return normalizeNs5RulesPayload(payload).rules;
}

void test('rules40 tool schema is provider-clean', () => {
  const tool = buildNs5RulesTool(loadSchema(), createNs4FlexibleWorkerTool);
  assert.equal(tool.function.name, 'submitNs5Rules');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
});

void test('real rules40 drafts of both runs pass the gate', () => {
  for (const moduleName of NS5_REAL_MODULES) {
    const draft = loadNs5FixtureJson<{ rules: Ns5Rule[] }>('steps/rules40/fixtures', `${moduleName}-draft.json`);
    const rules = drafts(draft);
    const gate = validateNs5Rules(rules, { moduleName });
    assert.equal(gate.ok, true, `${moduleName}: ${gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n')}`);
    assert.equal(rules.every(rule => !('title' in rule) && !('appliesTo' in rule)), true, moduleName);
  }
  const comanda = loadNs5FixtureJson<{ rules: Ns5Rule[] }>('steps/rules40/fixtures', 'comandaRestaurante5-draft.json');
  assert.equal(comanda.rules.length, 8);
  assert.ok(comanda.rules.some(rule => rule.ruleId === 'fecharComandaAposQuitacao'));
  const orden = loadNs5FixtureJson<{ rules: Ns5Rule[] }>('steps/rules40/fixtures', 'ordenServicio5-draft.json');
  assert.equal(orden.rules.length, 7);
  assert.ok(orden.rules.some(rule => rule.ruleId === 'visibilidadPortalCliente'));
});

void test('normalize + gate accept a valid payload of id and description only', () => {
  const rules = drafts({ schemaVersion: '2026-09-10-ns5-rules-v1', rules: [validRule()] });
  const gate = validateNs5Rules(rules);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(rules[0].ruleId, 'discountWithinTotal');
  assert.ok(!('title' in rules[0]));
  assert.ok(!('appliesTo' in rules[0]));
});

void test('empty catalog is valid', () => {
  const rules = drafts({ rules: [] });
  const gate = validateNs5Rules(rules);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('gate rejects duplicate lowerCamel rule ids', () => {
  const rules = drafts({
    rules: [validRule(), validRule({ description: 'Same id again.' })],
  });
  const gate = validateNs5Rules(rules);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_RULES_ID_DUPLICATE'));
});

void test('gate rejects empty description and non-lowerCamel id', () => {
  const empty = validateNs5Rules(drafts({ rules: [validRule({ description: '' })] }));
  assert.equal(empty.ok, false);
  assert.ok(empty.issues.some(issue => issue.code === 'NS5_RULES_DESCRIPTION'));
  const badId = validateNs5Rules([{ ruleId: 'NotCamel', description: 'A constraint.' }]);
  assert.equal(badId.ok, false);
  assert.ok(badId.issues.some(issue => issue.code === 'NS5_RULES_ID'));
  assert.match(formatNs5RulesGate(badId.issues), /NS5_RULES_ID/);
});

void test('normalize maps id to ruleId and drops title/appliesTo', () => {
  const rules = drafts({
    rules: [{
      id: 'discountWithinTotal',
      title: 'Discount within total',
      description: 'The discount cannot exceed the total.',
      appliesTo: { entityRefs: ['Comanda'], fieldRefs: [], transitionRefs: [], journeyRefs: [] },
    }],
  });
  assert.equal(rules[0].ruleId, 'discountWithinTotal');
  assert.equal(rules[0].description, 'The discount cannot exceed the total.');
  assert.deepEqual(Object.keys(rules[0]).sort(), ['description', 'ruleId']);
});

void test('buildNs5RulesArtifact keeps schemaVersion and rule order', () => {
  const rules = drafts({ rules: [validRule()] });
  const artifact = buildNs5RulesArtifact('comandaRestaurante5', rules);
  assert.equal(artifact.schemaVersion, '2026-09-10-ns5-rules-v1');
  assert.equal(artifact.moduleName, 'comandaRestaurante5');
  assert.equal(artifact.rules[0].ruleId, 'discountWithinTotal');
});

void test('ownerStepId maps rules40 repair planIds', () => {
  assert.equal(ownerStepId('rules40'), 'rules40');
  assert.equal(ownerStepId('rules40-repair-1'), 'rules40');
  assert.equal(ownerStepId('rules40-done'), '');
});

void test('human prompt carries source request, journeys, ontology and cited ruleRefs', () => {
  const comanda = {
    schemaVersion: '2026-09-11-ns5-ontology-v2',
    moduleName: 'comandaRestaurante5',
    entityId: 'Comanda',
    title: 'Order',
    description: 'Open table order.',
    kind: 'core',
    party: 'none',
    displayField: 'comandaNumber',
    fields: [
      { fieldId: 'status', title: 'Status', type: 'string', required: true, description: 'Open or closed.' },
    ],
    details: { total: { type: 'money', description: 'Sum of active items.' } },
    lifecycleStates: [
      { state: 'open', reachedBy: 'actor' },
      { state: 'closed', reachedBy: 'actor' },
    ],
    transitions: [{
      transitionId: 'fecharComanda',
      from: ['open'],
      to: 'closed',
      by: ['caixa'],
      description: 'Cashier closes the order.',
      ruleRefs: ['fecharComandaAposQuitacao'],
    }],
    storage: { target: 'moduleDatabase', scope: 'module', idField: 'comandaId' },
  } as Ns5OntologyEntityArtifact;
  const journey = {
    schemaVersion: '2026-09-10-ns5-journey-v1',
    journeyId: 'fecharComanda',
    business: {
      actorRef: 'caixa',
      title: 'Close the order',
      goal: 'Take payment and free the table.',
      entry: { mode: 'contextOrLookup' },
      steps: [
        { stepId: 'close', kind: 'act', entity: 'Comanda', title: 'Close', description: 'The order is closed.' },
      ],
      outcome: { statement: 'Closed.', evidence: ['Closed.'] },
    },
    businessHash: 'sha256:0',
  } as Ns5JourneyArtifact;
  const human = buildNs5RulesHumanPrompt({
    sourcePrompt: 'modulo comanda, portugues. perfis: garcom e caixa.',
    userLanguage: 'pt',
    journeys: [journey],
    entities: [comanda],
  });
  assert.match(human, /Source request/);
  assert.match(human, /fecharComanda \(caixa\)/);
  assert.match(human, /fecharComandaAposQuitacao/);
});

void test('rules40 prompt has no domain examples and no appliesTo/title', () => {
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /submitNs5Rules/);
  assert.match(prompt, /ruleId/);
  assert.match(prompt, /description/);
  assert.doesNotMatch(prompt, /appliesTo/);
  assert.doesNotMatch(prompt, /title is a short label/);
  assert.match(prompt, /Do not invent a rule that has no basis/);
  assert.doesNotMatch(prompt, /comanda|garcom|waiter|stock|quantity|descuento|presupuesto/i);
});
