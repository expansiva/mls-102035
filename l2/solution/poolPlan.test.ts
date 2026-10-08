import assert from 'node:assert/strict';
import test from 'node:test';
import { isTextOnlyChange, type L4DiffItem } from '/_102035_/l2/solution/poolPlan.js';

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

test('p4_35 derived, required and a non-field item are not text only', () => {
  assert.equal(isTextOnlyChange(fieldChange({ derived: true }, { derived: false })), false);
  assert.equal(isTextOnlyChange(fieldChange({ required: true }, {})), false);
  assert.equal(isTextOnlyChange({ ...fieldChange({ title: 'A' }, { title: 'B' }), kind: 'rule' }), false);
  assert.equal(isTextOnlyChange(fieldChange({ title: 'A' }, { title: 'B' }, 'added')), false);
});
