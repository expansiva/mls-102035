/// <mls fileReference="_102035_/l2/agentNewSolution5/helpers/ns5Skills.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  composeNs5SystemPrompt,
  NS5_MDM_SKILL_HEADING,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Skills.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AGENT_ROOT = path.resolve(HERE, '..');

void test('composeNs5SystemPrompt starts with the MDM skill heading', () => {
  const skill = readFileSync(path.join(AGENT_ROOT, 'skills', 'mdm.md'), 'utf8');
  const composed = composeNs5SystemPrompt(skill, '<!-- modelType: reasoning -->\nYou are module10.');
  assert.equal(composed.startsWith(NS5_MDM_SKILL_HEADING), true);
  assert.match(composed, /You are module10/);
});

void test('mdm skill says registering a login person is an act, never an invite step', () => {
  const skill = readFileSync(path.join(AGENT_ROOT, 'skills', 'mdm.md'), 'utf8');
  assert.match(skill, /Registering a person who will sign in is a write by an internal actor/);
  assert.match(skill, /`act` that attaches her \(`affects`\)/);
  assert.match(skill, /`maintenance: 'crud'` with that actor's grant/);
  assert.match(skill, /registers herself \(an `act` of her own external actor that writes her\)/);
  assert.match(skill, /A journey never has an 'invite' or\s+'verify e-mail' step/);
});

void test('module10, journeys20, ontology30 and access60 prepend the mdm skill in beforePromptStep', () => {
  const files = [
    'steps/module10/agentNs5Module.ts',
    'steps/journeys20/agentNs5Journeys.ts',
    'steps/ontology30/agentNs5Ontology.ts',
    'steps/access60/agentNs5Access.ts',
  ];
  for (const rel of files) {
    const source = readFileSync(path.join(AGENT_ROOT, rel), 'utf8');
    assert.match(source, /readNs5MdmSkill/, `${rel} must load the mdm skill`);
    assert.match(source, /composeNs5SystemPrompt/, `${rel} must prepend the mdm skill`);
  }
  const ontology = readFileSync(path.join(AGENT_ROOT, 'steps/ontology30/agentNs5Ontology.ts'), 'utf8');
  assert.equal((ontology.match(/composeNs5SystemPrompt\(mdm, prompt\)/g) || []).length, 3);
});
