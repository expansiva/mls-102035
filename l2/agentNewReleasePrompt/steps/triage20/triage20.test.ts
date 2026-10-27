/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import type { NrpCompactIndex } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import {
  NRP_TRIAGE_SYSTEM_PROMPT,
  buildNrpTriageHumanPrompt,
  buildNrpTriageTool,
  normalizeNrpTriage,
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
    'valid', 'reason', 'clarification', 'artifacts', 'targets', 'intent', 'mechanical',
  ]);
  assert.equal(/tarefas/i.test(NRP_TRIAGE_SYSTEM_PROMPT), false);
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
  assert.throws(() => normalizeNrpTriage({ ...recorded.fieldOptional, reason: 'extra' }), /null reason/);
});
