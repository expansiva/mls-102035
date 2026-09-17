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

void test('mdm skill: a lifted panel is the source of overlapping module.details keys', () => {
  const skill = readFileSync(path.join(AGENT_ROOT, 'skills', 'mdm.md'), 'utf8');
  assert.match(skill, /lifted into\s+`module.details`/);
  assert.match(skill, /the panel is the source of overlapping keys/);
});

void test('mdm skill: internal actor with personal scope is a Person role; assigned is a FK', () => {
  const skill = readFileSync(path.join(AGENT_ROOT, 'skills', 'mdm.md'), 'utf8');
  assert.match(skill, /internal actor whose\s+records are scoped to \*her own\*/);
  assert.match(skill, /`Person` role of the\s+module/);
  assert.match(skill, /`MemberOf`, `ReportsTo`, `Employs`/);
  assert.match(skill, /`assigned`: a direct foreign key to the Person of the login/);
  assert.match(skill, /`related`: a level-1 relationship/);
});

void test('mdm skill says registering a login person is an act, never an invite step', () => {
  const skill = readFileSync(path.join(AGENT_ROOT, 'skills', 'mdm.md'), 'utf8');
  assert.match(skill, /Registering a person who will sign in is a write by an internal actor/);
  assert.match(skill, /`act` that attaches her \(`affects`\)/);
  assert.match(skill, /`writer: 'crud'` with that actor's grant/);
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
  // ontology30 (ns5_42) injects TWO skills, mdm.md then ontologyTable.md, in its two model passes.
  const ontology = readFileSync(path.join(AGENT_ROOT, 'steps/ontology30/agentNs5Ontology.ts'), 'utf8');
  assert.match(ontology, /readNs5OntologyTableSkill/);
  assert.match(ontology, /composeNs5SystemPrompt\(\[mdmSkill, tableSkill\], stepPrompt\)/);
  assert.equal((ontology.match(/await ontologySystemPrompt\(prompt\)/g) || []).length, 2);
});

void test('composeNs5SystemPrompt keeps two skills in order and drops their html comments', () => {
  const composed = composeNs5SystemPrompt(
    ['<!-- header -->\n# First skill\nbody', '<!-- header -->\n# Second skill\nbody'],
    '<!-- modelType: reasoning -->\nYou are ontology30.',
  );
  assert.equal(composed.startsWith('# First skill'), true);
  assert.ok(composed.indexOf('# First skill') < composed.indexOf('# Second skill'));
  assert.match(composed, /You are ontology30/);
  assert.doesNotMatch(composed, /<!-- header -->/);
});

void test('the injected ontology table skill teaches the v3 grammar, not origin/layer', () => {
  const skill = readFileSync(path.join(AGENT_ROOT, 'skills', 'ontologyTable.md'), 'utf8');
  assert.match(skill, /`indexed: true` says so and a column without it is refused/);
  assert.match(skill, /Starting point/);
  assert.doesNotMatch(skill, /origin: nivel1/);
  assert.doesNotMatch(skill, /layer: column/);
});
