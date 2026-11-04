/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { providerEdgeCases } from '/_102035_/l2/solution/testing/providerEdgeCases.js';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import type { NrpCompactIndex } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import { pipelineJsonFileForProject } from '/_102035_/l2/solution/fs.js';
import {
  NRP_TRIAGE_SCHEMA,
  NRP_TRIAGE_SYSTEM_PROMPT,
  NrpTriageRefusal,
  buildNrpTriageHumanPrompt,
  buildNrpTriageTool,
  normalizeNrpTriage,
  nrpTriageNotes,
  nrpTriagePayload,
  recordNrpTriageRefusal,
} from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function withAssumptions(value: unknown, assumptions: string[] = []): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return { ...value, assumptions: assumptions, l3Notice: null };
}

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
    'valid', 'reason', 'clarification', 'artifacts', 'targets', 'intent', 'mechanical', 'mechanicalOnly', 'assumptions', 'l3Notice',
  ]);
  assert.match(NRP_TRIAGE_SYSTEM_PROMPT, /assumptions are short sentences/);
  assert.match(NRP_TRIAGE_SYSTEM_PROMPT, /Do not propose a default/);
  assert.equal(/revisedPrompt|square brackets/.test(NRP_TRIAGE_SYSTEM_PROMPT), false);
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
  assert.match(NRP_TRIAGE_SYSTEM_PROMPT, /choose the one the journeys and grants of the index make most probable/);
  const human = buildNrpTriageHumanPrompt('Make priority optional.', index);
  assert.match(human, /Make priority optional\./);
  assert.match(human, /"entityId":"WorkItem"/);
});

void test('a recorded triage response normalizes and stops when it cannot edit', () => {
  const recorded = JSON.parse(readFileSync(path.join(HERE, 'fixtures/recorded.json'), 'utf8')) as Record<string, unknown>;
  const outside = normalizeNrpTriage(withAssumptions(recorded.outside));
  assert.equal(outside.valid, false);
  assert.equal(outside.artifacts.length, 0);
  assert.deepEqual(outside.assumptions, []);
  const vague = normalizeNrpTriage(withAssumptions(recorded.vague));
  assert.equal(vague.clarification, 'Which part of the specification should change?');
  const optional = normalizeNrpTriage(withAssumptions(recorded.fieldOptional));
  assert.equal(optional.valid, true);
  assert.deepEqual(optional.artifacts, ['ontology']);
  assert.deepEqual(optional.mechanical, [
    { op: 'setOptional', targetId: 'WorkItem', fieldId: 'priority', value: '' },
  ]);
  assert.equal(optional.mechanicalOnly, true);
  assert.throws(() => normalizeNrpTriage(withAssumptions({ ...recorded.fieldOptional as object, reason: 'extra' })), /null reason/);
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
    assumptions: [], l3Notice: null,
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
    assumptions: [], l3Notice: null,
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
    assumptions: [], l3Notice: null,
  });
  assert.equal(cleaned.valid, false);
  assert.deepEqual(cleaned.assumptions, []);
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
    () => normalizeNrpTriage({ valid: true, reason: null, clarification: null, artifacts: [], targets: [], intent: null, mechanical: [], mechanicalOnly: false, assumptions: [], l3Notice: null }),
    /at least one artifact/,
  );
  assert.throws(() => normalizeNrpTriage({
    valid: true, reason: null, clarification: null, artifacts: ['button'], targets: [], intent: 'Add a button.', mechanical: [], mechanicalOnly: false, assumptions: [], l3Notice: null,
  }), /Unknown artifact kind/);
});

void test('mechanicalOnly is true only when marks fulfill the request', () => {
  const base = {
    valid: true, reason: null, clarification: null, artifacts: ['ontology'], targets: ['WorkItem'], intent: 'Make priority optional and record the medium default.', assumptions: [], l3Notice: null,
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

void test('a valid request keeps its assumptions and a question or a refusal drops them', () => {
  const valid = {
    valid: true, reason: null, clarification: null, artifacts: ['ontology', 'access'], targets: ['WorkItem'],
    intent: 'Add a field.', mechanical: [], mechanicalOnly: false, l3Notice: null,
  };
  const kept = normalizeNrpTriage({ ...valid, assumptions: ['who sees it: the manager'] });
  assert.deepEqual(kept.assumptions, ['who sees it: the manager']);
  const question = normalizeNrpTriage({
    valid: false, reason: null, clarification: 'Removing WorkItem deletes its records. Continue?',
    artifacts: [], targets: [], intent: null, mechanical: [], mechanicalOnly: false, assumptions: ['x'], l3Notice: null,
  });
  assert.deepEqual(question.assumptions, []);
  assert.throws(() => normalizeNrpTriage({ ...valid, assumptions: [''] }), /non-empty text/);
  assert.throws(() => normalizeNrpTriage({ ...valid, assumptions: 'x' }), /must be an array/);
});

void test('l3Notice answers interface work alone and rides along with a change', () => {
  const alone = normalizeNrpTriage({
    valid: false, reason: null, clarification: null, artifacts: [], targets: [], intent: null, mechanical: [],
    mechanicalOnly: false, assumptions: [], l3Notice: 'This is interface work: check the point adjustments in l3.',
  });
  assert.equal(alone.valid, false);
  assert.match(alone.l3Notice || '', /l3/);
  assert.throws(() => normalizeNrpTriage({ ...alone, l3Notice: null }), /needs a reason or an l3Notice/);
  const mixed = normalizeNrpTriage({
    valid: true, reason: null, clarification: null, artifacts: ['ontology'], targets: ['WorkItem'],
    intent: 'Add a field.', mechanical: [], mechanicalOnly: false, assumptions: [], l3Notice: 'The color is l3.',
  });
  assert.equal(mixed.valid, true);
  assert.equal(mixed.l3Notice, 'The color is l3.');
});

void test('a triage step without a tool-call payload is refused with the real cause and keeps the trace', () => {
  const step = { interaction: { input: [], cost: 0.04, trace: ['provider: x outputTokens:746'], payload: null } } as unknown as mls.msg.AIAgentStep;
  assert.throws(() => nrpTriagePayload(step), (error: unknown) => {
    assert.ok(error instanceof NrpTriageRefusal);
    assert.match(error.message, /without a tool call/);
    assert.match(JSON.stringify(error.raw), /outputTokens:746/);
    return true;
  });
  const ok = { interaction: { payload: [{ valid: false }] } } as unknown as mls.msg.AIAgentStep;
  assert.deepEqual(nrpTriagePayload(ok), { valid: false });
});

void test('empty or blank text in an optional field is null; a missing field or another type is refused', () => {
  const valid = {
    valid: true, reason: '', clarification: ' ', artifacts: ['ontology'], targets: ['WorkItem'],
    intent: 'Add a field.', mechanical: [], mechanicalOnly: false, assumptions: [], l3Notice: '',
  };
  const blank = normalizeNrpTriage(valid);
  assert.equal(blank.reason, null);
  assert.equal(blank.clarification, null);
  assert.equal(blank.l3Notice, null);
  assert.equal(blank.intent, 'Add a field.');
  for (const field of ['reason', 'clarification', 'l3Notice'] as const) {
    assert.equal(normalizeNrpTriage({ ...valid, [field]: '  ' })[field], null, field);
  }
  const noIntent = normalizeNrpTriage({
    valid: false, reason: 'Not about this module.', clarification: '', artifacts: [], targets: [], intent: '  ',
    mechanical: [], mechanicalOnly: false, assumptions: [], l3Notice: '',
  });
  assert.equal(noIntent.intent, null);
  assert.equal(noIntent.reason, 'Not about this module.');
  for (const field of ['reason', 'clarification', 'intent', 'l3Notice']) {
    const { [field]: _removed, ...without } = valid as Record<string, unknown>;
    assert.throws(() => normalizeNrpTriage(without), /must be text or null/, `${field} missing`);
    assert.throws(() => normalizeNrpTriage({ ...valid, [field]: 7 }), /must be text or null/, `${field} number`);
  }
  assert.throws(() => normalizeNrpTriage({ ...valid, valid: false, reason: '', l3Notice: '' }), /needs a reason or an l3Notice/);
});

void test('what the provider lets through (empty, blank, limits) is normalized or refused with a typed refusal', () => {
  const base = { artifacts: [] as string[], targets: [] as string[], intent: null, mechanical: [] as unknown[], mechanicalOnly: false, assumptions: [] as string[], l3Notice: null, reason: null, clarification: null };
  const examples = [
    { ...base, valid: true, artifacts: ['ontology'], targets: ['WorkItem'], intent: 'Add a field.',
      mechanical: [{ op: 'setRequired', targetId: 'WorkItem', fieldId: 'f', value: '' }], assumptions: ['who sees it: the manager'], l3Notice: 'The color is l3.' },
    { ...base, valid: false, clarification: 'Removing it deletes data. Continue?' },
    { ...base, valid: false, reason: 'Not about this module.' },
    { ...base, valid: false, l3Notice: 'This is interface work.' },
  ];
  const textFields = ['reason', 'clarification', 'intent', 'l3Notice'] as const;
  let total = 0;
  for (const example of examples) {
    for (const item of providerEdgeCases(NRP_TRIAGE_SCHEMA, example)) {
      total += 1;
      const label = `${item.path} ${item.rule} ${item.variant}`;
      let result: ReturnType<typeof normalizeNrpTriage>;
      try {
        result = normalizeNrpTriage(item.value);
      } catch (error) {
        assert.ok(error instanceof NrpTriageRefusal, `${label}: the refusal is typed`);
        assert.ok(error.message.length > 20, `${label}: the refusal says why: ${error.message}`);
        continue;
      }
      for (const field of textFields) assert.notEqual(result[field]?.trim(), '', `${label}: ${field} stays empty`);
      assert.equal(result.targets.some(text => !text.trim()), false, `${label}: an empty target got through`);
      assert.equal(result.assumptions.some(text => !text.trim()), false, `${label}: an empty assumption got through`);
      assert.equal(result.mechanical.some(mark => !mark.targetId.trim()), false, `${label}: an empty targetId got through`);
    }
  }
  assert.ok(total >= 12, `cases found: ${total}`);
});
