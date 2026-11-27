/// <mls fileReference="_102035_/l2/agentNewSolution5/externalConfigSentence.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// l4_p4_151 (reverses l4_p4_126): no step text forbids the access key of an outside system as data of the module;
// where the key lives is the module prompt's choice. `integration70` still describes `externalSystems.settings`.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FORBIDDEN = 'the platform keeps it and has the screen';
const WITH = ['journeys20/prompt.md', 'ontology30/prompt.md', 'ontology30/promptEntity.md', 'rules40/prompt.md', 'workflows50/prompt.md', 'access60/prompt.md'];
const WITHOUT = ['module10/prompt.md', 'judge35/prompt.md', 'integration70/prompt.md'];

void test('no step text forbids the access key of an outside system as data of the module', () => {
  for (const file of [...WITH, ...WITHOUT]) {
    const text = readFileSync(path.join(HERE, 'steps', file), 'utf8');
    assert.equal(text.includes(FORBIDDEN), false, file);
  }
});

void test('integration70 still describes the settings of an outside system', () => {
  const text = readFileSync(path.join(HERE, 'steps', 'integration70/prompt.md'), 'utf8');
  assert.equal(text.includes('externalSystems'), true);
  assert.equal(text.includes('secret'), true);
});

void test('no step with a prompt is left out of the table', () => {
  const steps = ['module10', 'journeys20', 'workflows50', 'ontology30', 'judge35', 'rules40', 'access60', 'integration70'];
  for (const step of steps) {
    const known = [...WITH, ...WITHOUT].some(file => file.startsWith(`${step}/`));
    assert.equal(known, true, `${step} is in the table`);
  }
});

// l4_p4_187 s2: only the table section of the entity prompt tells the model when a field is `secret: true`; no other step text carries the mark (integration70 has its own `secret: true`, the one of a connection setting).
void test('l4_p4_187: the secret mark is described once, in the ontology entity prompt, with what it is not', () => {
  const entity = readFileSync(path.join(HERE, 'steps/ontology30/promptEntity.md'), 'utf8');
  assert.equal(entity.split('`secret: true`').length - 1, 1);
  assert.ok(entity.includes('a password, an access key or a token as data of a record'));
  assert.ok(entity.includes('the platform keeps that one as a setting'));
  for (const other of ['journeys20/prompt.md', 'ontology30/prompt.md', 'rules40/prompt.md', 'access60/prompt.md', 'workflows50/prompt.md']) {
    assert.equal(readFileSync(path.join(HERE, 'steps', other), 'utf8').includes('secret: true'), false, other);
  }
});
