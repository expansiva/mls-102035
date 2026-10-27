/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import type { NrpCompactIndex } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import { pipelineJsonFileForProject } from '/_102035_/l2/solution/fs.js';
import {
  NRP_TRIAGE_SYSTEM_PROMPT,
  NrpTriageRefusal,
  buildNrpTriageHumanPrompt,
  buildNrpTriageTool,
  normalizeNrpTriage,
  nrpTriageNotes,
  recordNrpTriageRefusal,
} from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const index: NrpCompactIndex = {
  moduleName: 'sample',
  entities: [{ entityId: 'WorkItem', kind: 'record', fields: [{ id: 'priority', type: 'enum', required: true }], transitions: [] }],
  rules: [],
  journeys: [],
  grants: [],
  processes: [],
  events: [],
};

void test('triage schema is strict and the prompt states intention only', () => {
  const tool = buildNrpTriageTool();
  assert.equal(tool.function.name, 'submitNrpTriage');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
  const parameters = tool.function.parameters as { required: string[]; properties: { result: { required: string[] } } };
  assert.deepEqual(parameters.properties.result.required, [
    'valid', 'reason', 'clarification', 'artifacts', 'targets', 'intent', 'mechanical', 'mechanicalOnly',
  ]);
  assert.equal(/tarefas/i.test(NRP_TRIAGE_SYSTEM_PROMPT), false);
  assert.match(NRP_TRIAGE_SYSTEM_PROMPT, /making a field optional or required/);
  assert.match(NRP_TRIAGE_SYSTEM_PROMPT, /removing an item/);
  assert.match(NRP_TRIAGE_SYSTEM_PROMPT, /targetId is the owner of the item/);
  assert.match(NRP_TRIAGE_SYSTEM_PROMPT, /dotted path/);
  assert.match(NRP_TRIAGE_SYSTEM_PROMPT, /Removing a whole entity is not a mechanical mark/);
  assert.match(NRP_TRIAGE_SYSTEM_PROMPT, /replacing one scalar/);
  assert.match(NRP_TRIAGE_SYSTEM_PROMPT, /default value/);
  assert.match(NRP_TRIAGE_SYSTEM_PROMPT, /new rule/);
  assert.match(NRP_TRIAGE_SYSTEM_PROMPT, /Put that kind in artifacts and describe that part in intent/);
  assert.match(NRP_TRIAGE_SYSTEM_PROMPT, /mechanicalOnly is true only when those marks, by themselves, fulfill the whole request/);
  assert.match(NRP_TRIAGE_SYSTEM_PROMPT, /new text makes mechanicalOnly false/);
  const human = buildNrpTriageHumanPrompt('Make priority optional.', index);
  assert.match(human, /Make priority optional\./);
  assert.match(human, /"entityId":"WorkItem"/);
});

void test('a recorded triage response normalizes and stops when it cannot edit', () => {
  const recorded = JSON.parse(readFileSync(path.join(HERE, 'fixtures/recorded.json'), 'utf8')) as Record<string, unknown>;
  const outside = normalizeNrpTriage(recorded.outside);
  assert.equal(outside.valid, false);
  assert.equal(outside.artifacts.length, 0);
  const vague = normalizeNrpTriage(recorded.vague);
  assert.equal(vague.clarification, 'Which part of the specification should change?');
  const optional = normalizeNrpTriage(recorded.fieldOptional);
  assert.equal(optional.valid, true);
  assert.deepEqual(optional.artifacts, ['ontology']);
  assert.deepEqual(optional.mechanical, [
    { op: 'setOptional', targetId: 'WorkItem', fieldId: 'priority', value: '' },
  ]);
  assert.equal(optional.mechanicalOnly, true);
  assert.throws(() => normalizeNrpTriage({ ...recorded.fieldOptional, reason: 'extra' }), /null reason/);
});

void test('a clarification with extra fields becomes a clean question', () => {
  const cleaned = normalizeNrpTriage({
    valid: true,
    reason: 'kept by mistake',
    clarification: 'Which actor should lose cancel?',
    artifacts: ['rules'],
    targets: ['cancelar'],
    intent: 'Only the manager cancels.',
    mechanical: [{ op: 'setScalar', targetId: 'cancelar', fieldId: 'by', value: 'gestor' }],
    mechanicalOnly: true,
  });
  assert.equal(cleaned.valid, false);
  assert.equal(cleaned.reason, null);
  assert.equal(cleaned.clarification, 'Which actor should lose cancel?');
  assert.equal(cleaned.intent, null);
  assert.deepEqual(cleaned.artifacts, []);
  assert.deepEqual(cleaned.targets, []);
  assert.deepEqual(cleaned.mechanical, []);
  assert.deepEqual(nrpTriageNotes(cleaned), ['Discarded fields.']);
});

void test('a long clarification is cut to a whole sentence', () => {
  const sentence = 'Which actor should cancel the work item? ';
  const long = `${sentence}${'Extra detail. '.repeat(80)}`;
  assert.ok(long.length > 1000);
  const cleaned = normalizeNrpTriage({
    valid: false,
    reason: null,
    clarification: long,
    artifacts: [],
    targets: [],
    intent: null,
    mechanical: [],
    mechanicalOnly: false,
  });
  assert.ok((cleaned.clarification || '').length <= 1000);
  assert.ok(long.startsWith(cleaned.clarification || ''));
  assert.match(cleaned.clarification || '', /Extra detail\.$/u);
  assert.deepEqual(nrpTriageNotes(cleaned), ['clarification exceeded 1000 characters and was cut to a whole sentence']);
});

void test('an invalid request drops change fields and keeps the reason', () => {
  const cleaned = normalizeNrpTriage({
    valid: false,
    reason: 'Button color is outside the specification.',
    clarification: null,
    artifacts: ['ontology'],
    targets: ['WorkItem'],
    intent: 'Paint the button.',
    mechanical: [],
    mechanicalOnly: false,
  });
  assert.equal(cleaned.valid, false);
  assert.equal(cleaned.reason, 'Button color is outside the specification.');
  assert.equal(cleaned.intent, null);
  assert.deepEqual(cleaned.artifacts, []);
  assert.deepEqual(nrpTriageNotes(cleaned), ['Discarded fields.']);
});

void test('a malformed triage is refused and the raw answer is recorded without secrets', async () => {
  const raw = { valid: 'yes', token: 'sk-secret' };
  assert.throws(() => normalizeNrpTriage(raw), NrpTriageRefusal);
  const info = pipelineJsonFileForProject(1, 'sample', 'newReleasePrompt-refused');
  let stored: { reason?: string; raw?: { token?: string } } | undefined;
  const citation = await recordNrpTriageRefusal(info, 'Triage valid must be a boolean.', raw, async (_file, value) => {
    stored = value as { reason?: string; raw?: { token?: string } };
  });
  assert.equal(citation, 'l4/sample/pipeline/newReleasePrompt-refused.json');
  assert.equal(stored?.reason, 'Triage valid must be a boolean.');
  assert.equal(stored?.raw?.token, '[redacted]');
  assert.throws(
    () => normalizeNrpTriage({ valid: true, reason: null, clarification: null, artifacts: [], targets: [], intent: null, mechanical: [], mechanicalOnly: false }),
    /at least one artifact/,
  );
  assert.throws(() => normalizeNrpTriage({
    valid: true, reason: null, clarification: null, artifacts: ['button'], targets: [], intent: 'Add a button.', mechanical: [], mechanicalOnly: false,
  }), /Unknown artifact kind/);
});

void test('mechanicalOnly is true only when marks fulfill the request', () => {
  const base = {
    valid: true, reason: null, clarification: null, artifacts: ['ontology'], targets: ['WorkItem'], intent: 'Make priority optional and record the medium default.',
  };
  const both = normalizeNrpTriage({
    ...base,
    mechanical: [{ op: 'setOptional', targetId: 'WorkItem', fieldId: 'priority', value: '' }],
    mechanicalOnly: false,
  });
  assert.equal(both.mechanicalOnly, false);
  assert.deepEqual(both.artifacts, ['ontology']);
  assert.throws(
    () => normalizeNrpTriage({ ...base, mechanical: [], mechanicalOnly: true }),
    /mechanicalOnly needs at least one mechanical mark/,
  );
  assert.throws(
    () => normalizeNrpTriage({ ...base, mechanical: [], mechanicalOnly: 'no' }),
    /mechanicalOnly must be a boolean/,
  );
});
