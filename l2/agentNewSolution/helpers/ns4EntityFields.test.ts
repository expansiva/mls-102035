/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/ns4EntityFields.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  NS4_IDENTITY_FIELD_DESCRIPTION,
  ns4BindingPromptEntity,
  ns4EntityIdField,
  ns4ResolvableFieldIds,
  ns4ResolvableFieldOf,
  ns4ResolvableFields,
} from '/_102035_/l2/agentNewSolution/helpers/ns4EntityFields.js';

test('mdm with empty fields[] exposes storage.idField as a synthetic uuid identity', () => {
  const entity = { entityId: 'Mesa', kind: 'mdm', fields: [], storage: { idField: 'mesaId' } };
  const fields = ns4ResolvableFields(entity);
  assert.equal(fields.length, 1);
  assert.deepEqual(fields[0], {
    fieldId: 'mesaId',
    title: 'mesaId',
    type: 'uuid',
    required: true,
    description: NS4_IDENTITY_FIELD_DESCRIPTION,
    constraints: [],
  });
  assert.deepEqual([...ns4ResolvableFieldIds(entity)], ['mesaId']);
  assert.equal(ns4ResolvableFieldOf(entity, 'mesaId')?.required, true);
  assert.equal(ns4ResolvableFieldOf(entity, 'price'), undefined);
  assert.equal(ns4EntityIdField(entity), 'mesaId');
});

test('mdm with namespace fields unions storage.idField without duplicating it', () => {
  const entity = {
    entityId: 'ItemCardapio',
    kind: 'mdm',
    fields: [{
      fieldId: 'price', title: 'Price', type: 'money' as const, required: true, description: 'Price.', constraints: [],
    }],
    storage: { idField: 'itemCardapioId' },
  };
  assert.deepEqual([...ns4ResolvableFieldIds(entity)].sort(), ['itemCardapioId', 'price']);
  assert.equal(ns4ResolvableFieldOf(entity, 'price')?.type, 'money');
  assert.equal(ns4ResolvableFieldOf(entity, 'itemCardapioId')?.type, 'uuid');
});

test('core with id already in fields[] does not duplicate the identity', () => {
  const entity = {
    entityId: 'Comanda',
    kind: 'core',
    fields: [{
      fieldId: 'comandaId', title: 'Id', type: 'uuid' as const, required: true, description: 'Id.', constraints: [],
    }],
    storage: { idField: 'comandaId' },
  };
  const fields = ns4ResolvableFields(entity);
  assert.equal(fields.length, 1);
  assert.equal(fields[0].fieldId, 'comandaId');
  assert.equal(fields[0].description, 'Id.');
});

test('entity without storage yields declared fields only and an empty idField', () => {
  const entity = {
    entityId: 'Note',
    fields: [{
      fieldId: 'text', title: 'Text', type: 'string' as const, required: false, description: 'Note.', constraints: [],
    }],
  };
  assert.deepEqual([...ns4ResolvableFieldIds(entity)], ['text']);
  assert.equal(ns4EntityIdField(entity), '');
  assert.deepEqual([...ns4ResolvableFieldIds(undefined)], []);
  assert.equal(ns4EntityIdField(undefined), '');
});

test('binding prompt compact lists the synthetic identity of an empty-fields mdm entity', () => {
  const compact = ns4BindingPromptEntity({
    entityId: 'Mesa', kind: 'mdm', fields: [], storage: { idField: 'mesaId' },
  });
  assert.equal(compact.entityId, 'Mesa');
  assert.ok(compact.fields.some(field => field.fieldId === 'mesaId' && field.type === 'uuid' && field.required));
});

test('ns4EntityIdField never infers identity from a field name', () => {
  const entity = {
    fields: [{ fieldId: 'mesaId' }],
    storage: {},
  };
  assert.equal(ns4EntityIdField(entity), '');
  assert.deepEqual([...ns4ResolvableFieldIds(entity)], ['mesaId']);
});

const TOUCHED = [
  'ns4EntityFields.ts',
  'ns4EntityFields.test.ts',
  'ns4Context.ts',
  '../steps/e4/gate.ts',
  '../steps/e4/agentNs4E4.ts',
  '../steps/e4/promptRelationships.md',
  '../steps/e4/mdmIdField.test.ts',
  '../steps/e4b/gate.ts',
  '../steps/e4b/mdmIdField.test.ts',
  '../steps/e7/gate.ts',
  '../steps/e7/mdmIdField.test.ts',
  '../steps/e8/modelGate.ts',
  '../steps/e8/tiers.ts',
  '../steps/e8/model.ts',
  '../steps/e9/classic.ts',
  '../steps/e10/gate.ts',
];

test('n15 touched files stay English in comments and identifiers', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const rel of TOUCHED) {
    const source = readFileSync(join(here, rel), 'utf8');
    assert.doesNotMatch(source, /portuguese\s*\?/, rel);
    for (const line of source.split('\n')) {
      const trimmed = line.trim();
      const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
        || trimmed.startsWith('<!--');
      if (!isComment) continue;
      assert.doesNotMatch(line, /[À-ÿ]/, `${rel}: ${trimmed}`);
    }
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/`(?:\\.|[^`])*`/g, '')
      .replace(/'(?:\\.|[^'\\])*'/g, '')
      .replace(/"(?:\\.|[^"\\])*"/g, '');
    assert.doesNotMatch(stripped, /[À-ÿ]/, rel);
  }
});

const ENTITY_FIELD_ID_MAP = /fields\.map\(\s*(?:field|item)\s*=>\s*(?:field|item)\.fieldId\s*\)/;
const ALLOWED_ENTITY_FIELD_ID_MAP: Array<{ file: string; snippet: string; reason: string }> = [
  {
    file: 'steps/e4/gate.ts',
    snippet: 'return entity.fields.map(field => field.fieldId).filter(Boolean);',
    reason: 'derivationFieldIds — declared fields of a projection, not entity resolvable set',
  },
  {
    file: 'steps/e8/tiers.ts',
    snippet: 'audience.projection ? new Set(audience.projection.fields.map(field => field.fieldId)) : null',
    reason: 'catalogue audience projection field list',
  },
  {
    file: 'steps/e10/gate.ts',
    snippet: 'const allowed = new Set(projection.fields.map(field => field.fieldId));',
    reason: 'disclosure projection field list',
  },
  {
    file: 'steps/e4b/gate.ts',
    snippet: 'const projectedIds = projection.fields.map(field => field.fieldId);',
    reason: 'disclosure projection field list',
  },
];

test('entity field-id sets go through ns4ResolvableFieldIds; projection maps stay named', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'fixtures' || entry.name === 'node_modules') continue;
        walk(path);
        continue;
      }
      if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) continue;
      const source = readFileSync(path, 'utf8');
      const rel = relative(root, path).replaceAll('\\', '/');
      for (const line of source.split('\n')) {
        if (!ENTITY_FIELD_ID_MAP.test(line)) continue;
        const allowed = ALLOWED_ENTITY_FIELD_ID_MAP.some(item => item.file === rel && line.includes(item.snippet));
        if (!allowed) hits.push(`${rel}: ${line.trim()}`);
      }
    }
  };
  walk(root);
  assert.deepEqual(hits, [], hits.join('\n'));
});
