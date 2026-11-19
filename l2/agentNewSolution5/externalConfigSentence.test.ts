/// <mls fileReference="_102035_/l2/agentNewSolution5/externalConfigSentence.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// l4_p4_126: one sentence, the same text, in every step that writes a journey, an entity, a field, a rule, a
// permission or a process. A step that writes none of them (module10, judge35) or that declares the data where it
// belongs (integration70, in `externalSystems.settings`) does not carry it.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SENTENCE = 'What an administrator gives to connect the module to a system outside the app (where it is, the key that gives access, a secret agreed with it) is not a journey, an entity, a field, a rule, a permission or a process of the module: the platform keeps it and has the screen for it.';
const WITH = ['journeys20/prompt.md', 'ontology30/prompt.md', 'ontology30/promptEntity.md', 'rules40/prompt.md', 'workflows50/prompt.md', 'access60/prompt.md'];
const WITHOUT = ['module10/prompt.md', 'judge35/prompt.md', 'integration70/prompt.md'];

void test('every step that writes what the sentence forbids carries the same sentence', () => {
  for (const file of WITH) {
    const text = readFileSync(path.join(HERE, 'steps', file), 'utf8');
    assert.equal(text.split(SENTENCE).length - 1, 1, `${file} carries the sentence once`);
  }
});

void test('the steps that write none of them do not carry it', () => {
  for (const file of WITHOUT) {
    const text = readFileSync(path.join(HERE, 'steps', file), 'utf8');
    assert.equal(text.includes('the platform keeps it and has the screen'), false, file);
  }
});

void test('no step with a prompt is left out of the table', () => {
  const steps = ['module10', 'journeys20', 'workflows50', 'ontology30', 'judge35', 'rules40', 'access60', 'integration70'];
  for (const step of steps) {
    const known = [...WITH, ...WITHOUT].some(file => file.startsWith(`${step}/`));
    assert.equal(known, true, `${step} is in the table`);
  }
});
