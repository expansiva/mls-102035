/// <mls fileReference="_102035_/l2/solution/helpers/ontologyLifecycleForm.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { NS5_LIFECYCLE_FORM, NS5_LIFECYCLE_FORM_PLACEHOLDER, withNs5LifecycleForm } from '/_102035_/l2/solution/helpers/ontologyLifecycleForm.js';

const PROMPT = new URL('../../agentNewSolution5/steps/ontology30/promptEntity.md', import.meta.url);

test('the ontology30 prompt keeps the lifecycle form only as a placeholder and expands to the shared text', () => {
  const raw = readFileSync(PROMPT, 'utf8');
  assert.equal(raw.split(NS5_LIFECYCLE_FORM_PLACEHOLDER).length, 2, 'one placeholder');
  assert.ok(!raw.includes('Each state is'), 'the form text lives in one place only');
  const expanded = withNs5LifecycleForm(raw);
  assert.ok(expanded.includes(NS5_LIFECYCLE_FORM));
  assert.ok(!expanded.includes(NS5_LIFECYCLE_FORM_PLACEHOLDER));
  assert.match(NS5_LIFECYCLE_FORM, /`\{ transitionId, from, to, by, description, payload\?, ruleRefs\? \}`/);
});
