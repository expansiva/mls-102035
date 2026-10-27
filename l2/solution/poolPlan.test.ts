import assert from 'node:assert/strict';
import test from 'node:test';
import { isPresentationOnlyChange, isTextOnlyChange, type L4DiffItem } from '/_102035_/l2/solution/poolPlan.js';

function fieldChange(before: unknown, after: unknown, op: L4DiffItem['op'] = 'changed'): L4DiffItem {
  return { changeId: 'c1', kind: 'field', op, entity: 'Paciente', source: 'ontology', before, after };
}

test('p4_35 title only is text', () => {
  const item = fieldChange(
    { fieldId: 'sexo', type: 'enum', title: 'Sexo' },
    { fieldId: 'sexo', type: 'enum', title: 'Sexo biológico' },
  );
  assert.equal(isTextOnlyChange(item), true);
});

test('p4_35 title and type is not text only', () => {
  const item = fieldChange(
    { fieldId: 'sexo', type: 'enum', title: 'Sexo' },
    { fieldId: 'sexo', type: 'string', title: 'Sexo biológico' },
  );
  assert.equal(isTextOnlyChange(item), false);
});

test('p4_35 enum value label is text', () => {
  const item = fieldChange(
    { fieldId: 'sexo', type: 'enum', values: [{ value: 'M', title: 'M' }, { value: 'F', title: 'F' }] },
    { fieldId: 'sexo', type: 'enum', values: [{ value: 'M', title: 'Masculino' }, { value: 'F', title: 'F' }] },
  );
  assert.equal(isTextOnlyChange(item), true);
});

test('p4_35 added enum value is not text only', () => {
  const item = fieldChange(
    { fieldId: 'sexo', type: 'enum', values: [{ value: 'M', title: 'Masculino' }] },
    { fieldId: 'sexo', type: 'enum', values: [{ value: 'M', title: 'Masculino' }, { value: 'F', title: 'Feminino' }] },
  );
  assert.equal(isTextOnlyChange(item), false);
});

test('p4_74 a step whose only change is icon is text', () => {
  const before = { journeyId: 'j1', stepId: 's1', kind: 'act', title: 'Enviar', icon: 'send' };
  const after = { ...before, icon: 'clipboard-check' };
  assert.equal(isTextOnlyChange(fieldChange(before, after)), true);
  assert.equal(isTextOnlyChange(fieldChange({ ...before, icon: undefined }, { ...before, icon: 'send' })), true);
});

function presentationItem(
  kind: L4DiffItem['kind'],
  before: unknown,
  after: unknown,
  op: L4DiffItem['op'] = 'changed',
): L4DiffItem {
  return { changeId: `${kind}:id`, kind, op, entity: 'Tarefa', source: 'journeys', before, after };
}

test('p4_74 only icon on a journey, step or task is presentation', () => {
  const before = { title: 'Criar', icon: 'plus' };
  const after = { title: 'Criar', icon: 'clipboard-check' };
  for (const kind of ['journey', 'step', 'task'] as const) {
    assert.equal(isPresentationOnlyChange(presentationItem(kind, before, after)), true);
  }
  assert.equal(isPresentationOnlyChange(presentationItem('step', { title: 'Criar' }, { title: 'Criar', icon: 'plus' })), true);
  assert.equal(isPresentationOnlyChange(presentationItem('step', before, { ...before, icon: 'plus', title: 'Outro' })), false);
  assert.equal(isPresentationOnlyChange(presentationItem('step', before, { ...before, decisionRef: 'decidir' })), false);
  assert.equal(isPresentationOnlyChange(presentationItem('field', before, after)), false);
  assert.equal(isPresentationOnlyChange(presentationItem('step', before, after, 'added')), false);
  assert.equal(isPresentationOnlyChange(presentationItem('step', before, after, 'removed')), false);
});

test('p4_74 decisionRef is not text', () => {
  const before = { journeyId: 'j1', stepId: 's2', kind: 'act', decisionRef: 'd1' };
  assert.equal(isTextOnlyChange(fieldChange(before, { ...before, decisionRef: 'd2' })), false);
});

test('p4_35 derived, required and a non-field item are not text only', () => {
  assert.equal(isTextOnlyChange(fieldChange({ derived: true }, { derived: false })), false);
  assert.equal(isTextOnlyChange(fieldChange({ required: true }, {})), false);
  assert.equal(isTextOnlyChange({ ...fieldChange({ title: 'A' }, { title: 'B' }), kind: 'rule' }), false);
  assert.equal(isTextOnlyChange(fieldChange({ title: 'A' }, { title: 'B' }, 'added')), false);
});
