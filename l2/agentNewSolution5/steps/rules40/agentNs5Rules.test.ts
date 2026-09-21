/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/rules40/agentNs5Rules.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/agentNewSolution/helpers/ns4WorkerTools.js';
import { ownerStepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import { ns5OntologyEntityViews } from '/_102035_/l2/solution/ontologyView.js';
import {
  loadNs5FixtureJson,
  NS5_REAL_MODULES,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import type { Ns5JourneyArtifact, Ns5OntologyEntityArtifact, Ns5Rule } from '/_102035_/l2/solution/types.js';
import { buildNs5RulesHumanPrompt } from '/_102035_/l2/agentNewSolution5/steps/rules40/agentNs5Rules.js';
import {
  buildNs5RulesArtifactV2,
  buildNs5RulesTool,
  normalizeNs5RulesPayload,
  partitionCitedRules,
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

/** normalize + gate together: the duplicate evidence only exists on the way through (ns5_45). */
function gateOf(payload: unknown, moduleName?: string) {
  const { rules, duplicateRuleIds } = normalizeNs5RulesPayload(payload);
  return { rules, duplicateRuleIds, gate: validateNs5Rules(rules, { moduleName, duplicateRuleIds }) };
}

function drafts(payload: unknown): Record<string, string> {
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
    const { rules, gate } = gateOf(draft, moduleName);
    assert.equal(gate.ok, true, `${moduleName}: ${gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n')}`);
    // The map form keeps the sentence and nothing else: title/appliesTo have no place to live.
    assert.equal(Object.values(rules).every(text => typeof text === 'string' && text.length > 0), true, moduleName);
    assert.equal(Object.keys(rules).length, draft.rules.length, moduleName);
  }
  const comanda = loadNs5FixtureJson<{ rules: Ns5Rule[] }>('steps/rules40/fixtures', 'comandaRestaurante5-draft.json');
  assert.equal(comanda.rules.length, 8);
  assert.ok(comanda.rules.some(rule => rule.ruleId === 'fecharComandaAposQuitacao'));
  const orden = loadNs5FixtureJson<{ rules: Ns5Rule[] }>('steps/rules40/fixtures', 'ordenServicio5-draft.json');
  assert.equal(orden.rules.length, 7);
  assert.ok(orden.rules.some(rule => rule.ruleId === 'visibilidadPortalCliente'));
});

void test('normalize + gate accept a valid payload of id and description only', () => {
  const { rules, gate } = gateOf({ rules: [validRule()] });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.deepEqual(Object.keys(rules), ['discountWithinTotal']);
  assert.equal(rules.discountWithinTotal, 'The optional discount cannot exceed the total of active items.');
});

void test('a payload already in the map form is read unchanged (repair hands the draft back)', () => {
  const { rules, gate } = gateOf({
    schemaVersion: '2026-09-16-ns5-rules-v2',
    rules: { discountWithinTotal: 'The optional discount cannot exceed the total of active items.' },
  });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.deepEqual(Object.keys(rules), ['discountWithinTotal']);
});

void test('empty catalog is valid', () => {
  const { gate } = gateOf({ rules: [] });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('gate rejects duplicate lowerCamel rule ids', () => {
  const { rules, duplicateRuleIds, gate } = gateOf({
    rules: [validRule(), validRule({ description: 'Same id again.' })],
  });
  // The map cannot hold the duplicate: the evidence is the side channel, and the gate still fails.
  assert.deepEqual(Object.keys(rules), ['discountWithinTotal']);
  assert.deepEqual(duplicateRuleIds, ['discountWithinTotal']);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_RULES_ID_DUPLICATE'));
});

void test('a catalog read off disk has no duplicate evidence and is not accused of one', () => {
  const gate = validateNs5Rules({ discountWithinTotal: 'The discount cannot exceed the total.' });
  assert.equal(gate.ok, true);
  assert.equal(gate.issues.length, 0);
});

void test('gate rejects empty description and non-lowerCamel id', () => {
  const empty = gateOf({ rules: [validRule({ description: '' })] }).gate;
  assert.equal(empty.ok, false);
  assert.ok(empty.issues.some(issue => issue.code === 'NS5_RULES_DESCRIPTION'));
  const badId = validateNs5Rules({ NotCamel: 'A constraint.' });
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
  assert.deepEqual(rules, { discountWithinTotal: 'The discount cannot exceed the total.' });
});

void test('buildNs5RulesArtifactV2 keeps schemaVersion and rule order', () => {
  const rules = drafts({ rules: [validRule({ ruleId: 'aFirst' }), validRule()] });
  const artifact = buildNs5RulesArtifactV2('comandaRestaurante5', rules);
  assert.equal(artifact.schemaVersion, '2026-09-16-ns5-rules-v2');
  assert.equal(artifact.moduleName, 'comandaRestaurante5');
  assert.deepEqual(Object.keys(artifact.rules), ['aFirst', 'discountWithinTotal']);
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
    entities: ns5OntologyEntityViews([comanda]),
  });
  assert.match(human, /Source request/);
  assert.match(human, /fecharComanda \(caixa\)/);
  assert.match(human, /fecharComandaAposQuitacao/);
});

void test('the prompt carries the rule ids ontology30 recorded, cited or not by a transition (ns5_43 T2)', () => {
  const comanda = {
    schemaVersion: '2026-09-11-ns5-ontology-v2',
    moduleName: 'comandaRestaurante5',
    entityId: 'Comanda',
    title: 'Order',
    description: 'Open table order.',
    kind: 'core',
    party: 'none',
    displayField: 'status',
    fields: [
      { fieldId: 'status', title: 'Status', type: 'string', required: true, description: 'Open or closed.' },
    ],
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
      steps: [{ stepId: 'close', kind: 'act', entity: 'Comanda', title: 'Close', description: 'The order is closed.' }],
      outcome: { statement: 'Closed.', evidence: ['Closed.'] },
    },
    businessHash: 'sha256:0',
  } as Ns5JourneyArtifact;
  const without = buildNs5RulesHumanPrompt({
    sourcePrompt: 'modulo comanda.',
    userLanguage: 'pt',
    journeys: [journey],
    entities: ns5OntologyEntityViews([comanda]),
  });
  assert.doesNotMatch(without, /rule-person-privacy-consent-required-br-eu/);

  const withCited = buildNs5RulesHumanPrompt({
    sourcePrompt: 'modulo comanda.',
    userLanguage: 'pt',
    journeys: [journey],
    entities: ns5OntologyEntityViews([comanda]),
    citedRules: ['rule-person-privacy-consent-required-br-eu', 'fecharComandaAposQuitacao'],
  });
  assert.match(withCited, /## rules the ontology cited; keep these ids/);
  assert.match(withCited, /- rule-person-privacy-consent-required-br-eu/);
  // A transition ruleRef and an ontology30 citation are the same list, without duplicates.
  assert.equal(withCited.match(/- fecharComandaAposQuitacao/g)?.length, 1);
});

void test('the repair prompt shows the saved draft in the shape the tool takes back (ns5_45)', () => {
  // What rules40 leaves on disk is the ARTIFACT: a map, with a schemaVersion the strict tool schema
  // does not accept. The model is asked to submit the draft back, so it is shown as a list.
  const saved = buildNs5RulesArtifactV2('comandaRestaurante5', drafts({ rules: [validRule()] }));
  const human = buildNs5RulesHumanPrompt({
    sourcePrompt: 'modulo comanda.',
    userLanguage: 'pt',
    journeys: [],
    entities: [],
    gateFeedback: 'NS5_RULES_DESCRIPTION rules.x.description: Business description is required.',
    previousDraft: saved,
  });
  const block = human.slice(human.indexOf('## Current draft'));
  const shown = JSON.parse(block.slice(block.indexOf('{'))) as { rules: unknown };
  assert.ok(Array.isArray(shown.rules), 'the draft is shown as a list, like the tool asks for');
  assert.deepEqual(shown, { rules: [validRule()] });
  assert.doesNotMatch(block, /schemaVersion/);
  // And what is shown normalizes straight back to what was saved.
  assert.deepEqual(normalizeNs5RulesPayload(shown).rules, saved.rules);
});

void test('rules40 prompt has no domain examples and no appliesTo/title', () => {
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /submitNs5Rules/);
  assert.match(prompt, /ruleId/);
  assert.match(prompt, /description/);
  assert.doesNotMatch(prompt, /appliesTo/);
  assert.doesNotMatch(prompt, /title is a short label/);
  assert.match(prompt, /Do not invent a rule that has no basis/);
  assert.match(prompt, /Platform rules already defined by the platform — cite them, never restate or rename them/);
  assert.doesNotMatch(prompt, /comanda|garcom|waiter|stock|quantity|descuento|presupuesto/i);
});

// --- ns5_56: an id this step received CITED belongs to whoever cited it ------

void test('ns5_56: a cited id returned with another case adopts the cited spelling', () => {
  // Measured on `compras`: the ontology cited `pedidoDeveTerFornecedorEItens`, rules40 wrote
  // `…Eitens`, and finalize80 I4 compares exact strings.
  const { rules, normalizations, duplicateRuleIds } = normalizeNs5RulesPayload(
    { rules: [{ ruleId: 'pedidoDeveTerFornecedorEitens', description: 'Um pedido tem fornecedor e itens.' }] },
    ['pedidoDeveTerFornecedorEItens'],
  );
  assert.deepEqual(Object.keys(rules), ['pedidoDeveTerFornecedorEItens']);
  assert.deepEqual(normalizations, [
    { kind: 'citedIdSpellingAdopted', detail: 'pedidoDeveTerFornecedorEitens -> pedidoDeveTerFornecedorEItens' },
  ]);
  assert.deepEqual(duplicateRuleIds, []);
});

void test('ns5_56: an id that is genuinely different is left alone', () => {
  const { rules, normalizations } = normalizeNs5RulesPayload(
    { rules: [{ ruleId: 'pedidoDeveTerFornecedor', description: 'Um pedido tem fornecedor.' }] },
    ['pedidoDeveTerFornecedorEItens'],
  );
  assert.deepEqual(Object.keys(rules), ['pedidoDeveTerFornecedor']);
  assert.deepEqual(normalizations, []);
});

void test('ns5_56: adopting a spelling that collides is reported as a duplicate, not swallowed', () => {
  const { rules, duplicateRuleIds } = normalizeNs5RulesPayload(
    {
      rules: [
        { ruleId: 'pedidoDeveTerFornecedorEItens', description: 'A.' },
        { ruleId: 'pedidoDeveTerFornecedorEitens', description: 'B.' },
      ],
    },
    ['pedidoDeveTerFornecedorEItens'],
  );
  assert.deepEqual(Object.keys(rules), ['pedidoDeveTerFornecedorEItens']);
  assert.deepEqual(duplicateRuleIds, ['pedidoDeveTerFornecedorEItens']);
  assert.equal(validateNs5Rules(rules, { duplicateRuleIds }).ok, false);
});

void test('ns5_56: a platform (kebab) cited id never lends its spelling', () => {
  // ns5_67 supersedes keeping the camelCase restatement: it is discarded, not adopted.
  const { rules, normalizations } = normalizeNs5RulesPayload(
    { rules: [{ ruleId: 'ruleDocumentShapeValidated', description: 'X.' }] },
    ['rule-document-shape-validated'],
  );
  assert.deepEqual(Object.keys(rules), []);
  assert.deepEqual(normalizations, [
    { kind: 'platformRuleNotRestated', detail: 'ruleDocumentShapeValidated -> rule-document-shape-validated' },
  ]);
});

// --- ns5_67: a platform rule is cited, never restated --------------------------

void test('ns5_67: a platform id returned in camelCase is discarded and recorded', () => {
  // Measured on mensalidadesAcademia: ontology cited kebab `rule-foreign-namespace-refused`,
  // rules40 wrote `ruleForeignNamespaceRefused`. Disabling the discard turns this red.
  const { rules, normalizations, duplicateRuleIds } = normalizeNs5RulesPayload(
    { rules: [{ ruleId: 'ruleForeignNamespaceRefused', description: 'A caller may not write another module key.' }] },
    ['rule-foreign-namespace-refused'],
  );
  assert.deepEqual(Object.keys(rules), []);
  assert.deepEqual(normalizations, [
    { kind: 'platformRuleNotRestated', detail: 'ruleForeignNamespaceRefused -> rule-foreign-namespace-refused' },
  ]);
  assert.deepEqual(duplicateRuleIds, []);
});

void test('ns5_67: a module rule is kept; case adoption of ns5_56 still applies', () => {
  const { rules, normalizations } = normalizeNs5RulesPayload(
    {
      rules: [
        { ruleId: 'ruleForeignNamespaceRefused', description: 'Restated platform rule.' },
        { ruleId: 'pedidoDeveTerFornecedorEitens', description: 'Um pedido tem fornecedor e itens.' },
      ],
    },
    ['rule-foreign-namespace-refused', 'pedidoDeveTerFornecedorEItens'],
  );
  assert.deepEqual(Object.keys(rules), ['pedidoDeveTerFornecedorEItens']);
  assert.deepEqual(normalizations, [
    { kind: 'platformRuleNotRestated', detail: 'ruleForeignNamespaceRefused -> rule-foreign-namespace-refused' },
    { kind: 'citedIdSpellingAdopted', detail: 'pedidoDeveTerFornecedorEitens -> pedidoDeveTerFornecedorEItens' },
  ]);
});

void test('ns5_67: citedRules are partitioned — platform as data, module to produce', () => {
  const split = partitionCitedRules([
    'rule-foreign-namespace-refused',
    'modalidadePlanoPermitida',
    'rule-identity-never-in-namespace',
    'modalidadePlanoPermitida',
  ]);
  assert.deepEqual(split.platform, [
    'rule-foreign-namespace-refused',
    'rule-identity-never-in-namespace',
  ]);
  assert.deepEqual(split.module, ['modalidadePlanoPermitida']);
});

void test('ns5_67: the human prompt labels platform ids as given, not as rules to produce', () => {
  const comanda = {
    schemaVersion: '2026-09-11-ns5-ontology-v2',
    moduleName: 'comandaRestaurante5',
    entityId: 'Comanda',
    title: 'Order',
    description: 'Open table order.',
    kind: 'core',
    party: 'none',
    displayField: 'status',
    fields: [
      { fieldId: 'status', title: 'Status', type: 'string', required: true, description: 'Open or closed.' },
    ],
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
  const human = buildNs5RulesHumanPrompt({
    sourcePrompt: 'modulo comanda.',
    userLanguage: 'pt',
    journeys: [],
    entities: ns5OntologyEntityViews([comanda]),
    citedRules: ['rule-person-privacy-consent-required-br-eu', 'fecharComandaAposQuitacao'],
  });
  const platformAt = human.indexOf('## platform rules already defined by the platform — cite them, never restate or rename them');
  const produceAt = human.indexOf('## rules the ontology cited; keep these ids');
  assert.ok(platformAt >= 0, 'platform heading present');
  assert.ok(produceAt >= 0, 'produce heading present');
  const platformBlock = human.slice(platformAt, produceAt);
  const produceBlock = human.slice(produceAt);
  assert.match(platformBlock, /- rule-person-privacy-consent-required-br-eu/);
  assert.doesNotMatch(platformBlock, /fecharComandaAposQuitacao/);
  assert.match(produceBlock, /- fecharComandaAposQuitacao/);
  assert.doesNotMatch(produceBlock, /rule-person-privacy-consent-required-br-eu/);
});

void test('ns5_67: recorded v2 rule drafts do not restate a platform rule', () => {
  for (const moduleName of NS5_REAL_MODULES) {
    const draft = loadNs5FixtureJson<{ rules: Ns5Rule[] }>('steps/rules40/fixtures', `${moduleName}-draft.json`);
    const { normalizations } = normalizeNs5RulesPayload(draft);
    assert.equal(
      normalizations.filter(item => item.kind === 'platformRuleNotRestated').length,
      0,
      moduleName,
    );
  }
});
