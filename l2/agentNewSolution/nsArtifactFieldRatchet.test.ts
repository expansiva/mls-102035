import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * One-way ratchet: human-facing artifact contracts must not gain a structured key
 * without a non-LLM reader. A new key fails until it is added here with `{ reader, since }`.
 * Measured 2026-09-08; n04 added mdmSubtype and displayField.
 */
interface KeyEntry { reader: string; since: string }

const AGENT_ROOT = fileURLToPath(new URL('.', import.meta.url));

const CONTRACTS: Record<string, { file: string; name: string }> = {
  Ns4BusinessActor: { file: 'steps/e1/contracts.ts', name: 'Ns4BusinessActor' },
  Ns4JourneyStep: { file: 'steps/e2/contracts.ts', name: 'Ns4JourneyStep' },
  Ns4Rule: { file: 'steps/e5/contracts.ts', name: 'Ns4RuleDefinition' },
  Ns4AccessGrant: { file: 'steps/e3/contracts.ts', name: 'Ns4AccessGrant' },
  Ns4OntologyEntity: { file: 'steps/e4/contracts.ts', name: 'Ns4OntologyEntity' },
  Ns4OntologyField: { file: 'steps/e4/contracts.ts', name: 'Ns4OntologyField' },
  Ns4LifecycleState: { file: 'steps/e4/contracts.ts', name: 'Ns4LifecycleState' },
};

const KEYS: Record<string, Record<string, KeyEntry>> = {
  Ns4BusinessActor: {
    actorId: { reader: 'steps/e1/gate.ts', since: '2026-09-08' },
    title: { reader: 'steps/e1/gate.ts', since: '2026-09-08' },
    kind: { reader: 'steps/e1/gate.ts', since: '2026-09-08' },
    origin: { reader: 'steps/e2/gate.ts', since: '2026-09-09' },
    expectedOutcome: { reader: 'steps/e1/gate.ts', since: '2026-09-08' },
  },
  Ns4JourneyStep: {
    stepId: { reader: 'helpers/ns4Context.ts', since: '2026-09-08' },
    kind: { reader: 'helpers/ns4Context.ts', since: '2026-09-08' },
    entity: { reader: 'helpers/ns4Context.ts', since: '2026-09-08' },
    affects: { reader: 'steps/e2/coverageSignals.ts, steps/e7/gate.ts', since: '2026-09-09' },
    title: { reader: 'widgets/widgetNs4Journeys.ts', since: '2026-09-08' },
    description: { reader: 'steps/e8/tiers.ts', since: '2026-09-08' },
    featureRefs: { reader: 'steps/e2/gate.ts', since: '2026-09-08' },
    targetProfile: { reader: 'steps/e9/classic.ts', since: '2026-09-08' },
  },
  Ns4Rule: {
    id: { reader: 'steps/e7/contracts.ts', since: '2026-09-08' },
    description: { reader: 'steps/e7/contracts.ts', since: '2026-09-08' },
  },
  Ns4AccessGrant: {
    profileRef: { reader: 'steps/e3/gate.ts', since: '2026-09-08' },
    authorityRef: { reader: 'steps/e3/gate.ts', since: '2026-09-08' },
    reason: { reader: 'steps/e3/gate.ts', since: '2026-09-08' },
    dataScope: { reader: 'steps/e3/gate.ts', since: '2026-09-08' },
    disclosure: { reader: 'steps/e3/gate.ts', since: '2026-09-08' },
    useRules: { reader: 'steps/e3/gate.ts', since: '2026-09-08' },
  },
  Ns4OntologyEntity: {
    entityId: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    title: { reader: 'widgets/widgetNs4Ontology.ts', since: '2026-09-08' },
    description: { reader: 'widgets/widgetNs4Ontology.ts', since: '2026-09-08' },
    kind: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    ownership: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    cardinality: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    mutability: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    party: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    derivation: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    mdmSubtype: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    role: { reader: 'steps/e4/contracts.ts', since: '2026-09-08' },
    displayField: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    sourceRefs: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    fields: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    lifecycleStates: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    statusEnum: { reader: 'steps/e4/contracts.ts', since: '2026-09-08' },
    lifecycleLabels: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    initialState: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    terminalStates: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    lifecyclePredicates: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    useRules: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    storage: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
  },
  Ns4OntologyField: {
    fieldId: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    title: { reader: 'widgets/widgetNs4Ontology.ts', since: '2026-09-08' },
    type: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    required: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    description: { reader: 'widgets/widgetNs4Ontology.ts', since: '2026-09-08' },
    constraints: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    enum: { reader: 'steps/e4/contracts.ts', since: '2026-09-08' },
    enumLabels: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
  },
  Ns4LifecycleState: {
    state: { reader: 'steps/e4/gate.ts', since: '2026-09-08' },
    reachedBy: { reader: 'steps/e7/gate.ts, steps/e10/gate.ts', since: '2026-09-09' },
    ruleRef: { reader: 'steps/e4/gate.ts, steps/e7/gate.ts', since: '2026-09-09' },
  },
};

function interfaceBody(source: string, name: string): string {
  const match = source.match(new RegExp(`export interface ${name}\\b[^{]*\\{`));
  if (!match || match.index === undefined) throw new Error(`interface ${name} not found`);
  const start = match.index + match[0].length - 1;
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start + 1, index);
    }
  }
  throw new Error(`interface ${name} is unclosed`);
}

function keysOf(body: string): string[] {
  const stripped = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const keys: string[] = [];
  let depth = 0;
  for (const line of stripped.split('\n')) {
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    if (depth === 0) {
      const property = line.match(/^\s+(?:readonly\s+)?([A-Za-z][A-Za-z0-9]*)\??\s*:/);
      if (property) keys.push(property[1]);
    }
    depth += opens - closes;
  }
  return keys;
}

test('human-facing artifact contracts do not gain a key without a non-LLM reader', () => {
  for (const [artifact, spec] of Object.entries(CONTRACTS)) {
    const source = readFileSync(new URL(spec.file, import.meta.url), 'utf8');
    const found = keysOf(interfaceBody(source, spec.name));
    const table = KEYS[artifact];
    assert.ok(table, `${artifact} is missing from the ratchet table`);
    const extra = found.filter(key => !(key in table));
    if (extra.length) {
      assert.fail(
        `${artifact} gained structured key(s) without a ratchet entry: ${extra.join(', ')}. `
        + `Add { reader: '<file that reads it without an LLM>', since: 'YYYY-MM-DD' }.`,
      );
    }
    for (const key of found) {
      assert.ok(table[key].reader, `${artifact}.${key} needs a reader`);
      assert.ok(table[key].since, `${artifact}.${key} needs a since date`);
    }
  }
});

test('n04 keys mdmSubtype and displayField are in the entity ratchet with E4 gate readers', () => {
  assert.equal(KEYS.Ns4OntologyEntity.mdmSubtype.reader, 'steps/e4/gate.ts');
  assert.equal(KEYS.Ns4OntologyEntity.displayField.reader, 'steps/e4/gate.ts');
  assert.equal(KEYS.Ns4OntologyEntity.mdmSubtype.since, '2026-09-08');
  assert.doesNotMatch(readFileSync(new URL('nsArtifactFieldRatchet.test.ts', import.meta.url), 'utf8'), /\/todo\//);
  assert.doesNotMatch(AGENT_ROOT, /[À-ÿ]/);
});

test('n12 origin is on the business actor ratchet with the E2 gate reader', () => {
  assert.equal(KEYS.Ns4BusinessActor.origin.reader, 'steps/e2/gate.ts');
  assert.equal(KEYS.Ns4BusinessActor.origin.since, '2026-09-09');
  const actor = keysOf(interfaceBody(
    readFileSync(new URL('steps/e1/contracts.ts', import.meta.url), 'utf8'),
    'Ns4BusinessActor',
  ));
  assert.ok(actor.includes('origin'));
});

test('n13 reachedBy is on the lifecycle state ratchet with E7 and E10 gate readers', () => {
  assert.equal(KEYS.Ns4LifecycleState.reachedBy.reader, 'steps/e7/gate.ts, steps/e10/gate.ts');
  assert.equal(KEYS.Ns4LifecycleState.reachedBy.since, '2026-09-09');
  const state = keysOf(interfaceBody(
    readFileSync(new URL('steps/e4/contracts.ts', import.meta.url), 'utf8'),
    'Ns4LifecycleState',
  ));
  assert.ok(state.includes('reachedBy'));
  assert.ok(state.includes('ruleRef'));
});

test('n10 affects is on the journey step ratchet with coverage and E7 gate readers', () => {
  assert.equal(KEYS.Ns4JourneyStep.affects.reader, 'steps/e2/coverageSignals.ts, steps/e7/gate.ts');
  assert.equal(KEYS.Ns4JourneyStep.affects.since, '2026-09-09');
  const step = keysOf(interfaceBody(
    readFileSync(new URL('steps/e2/contracts.ts', import.meta.url), 'utf8'),
    'Ns4JourneyStep',
  ));
  assert.ok(step.includes('affects'));
});

test('n14 adds no structured key on human-facing artifacts (textPaths are contract metadata)', () => {
  assert.equal('textPaths' in KEYS.Ns4Rule, false);
  assert.equal('textPaths' in KEYS.Ns4JourneyStep, false);
  assert.equal('textPaths' in KEYS.Ns4AccessGrant, false);
  const rule = keysOf(interfaceBody(
    readFileSync(new URL('steps/e5/contracts.ts', import.meta.url), 'utf8'),
    'Ns4RuleDefinition',
  ));
  assert.equal(rule.includes('textPaths'), false);
});

test('n08a projectionRef and excludedFields stay off the human grant', () => {
  assert.equal('projectionRef' in KEYS.Ns4AccessGrant, false);
  assert.equal('excludedFields' in KEYS.Ns4AccessGrant, false);
  const grant = keysOf(interfaceBody(
    readFileSync(new URL('steps/e3/contracts.ts', import.meta.url), 'utf8'),
    'Ns4AccessGrant',
  ));
  assert.equal(grant.includes('projectionRef'), false);
  assert.equal(grant.includes('excludedFields'), false);
  const binding = keysOf(interfaceBody(
    readFileSync(new URL('steps/e4b/contracts.ts', import.meta.url), 'utf8'),
    'Ns4AccessBinding',
  ));
  assert.ok(binding.includes('projectionRef'));
  assert.ok(binding.includes('excludedFields'));
});
