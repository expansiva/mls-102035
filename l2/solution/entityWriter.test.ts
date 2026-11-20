/// <mls fileReference="_102035_/l2/solution/entityWriter.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ns5ResolveEntityWriter,
  type Ns5WriterJourneyView,
  type Ns5WriterPlanView,
} from '/_102035_/l2/solution/entityWriter.js';

const source = readFileSync(new URL('./entityWriter.ts', import.meta.url), 'utf8');

void test('entityWriter.ts stays a pure file', () => {
  assert.equal(/\/solution\/fs\.js|\/gates\/|agentNewSolution5/.test(source), false);
});

const actOnParent: Ns5WriterJourneyView = {
  journeyId: 'abre',
  business: {
    steps: [{ stepId: 'grava', kind: 'act', entity: 'Pai', effect: 'create' }],
  },
};

void test('a direct act resolves journey', () => {
  const resolved = ns5ResolveEntityWriter(
    { entityId: 'Pai', kind: 'core' },
    undefined,
    [actOnParent],
  );
  assert.deepEqual(resolved, { kind: 'journey' });
});

void test('the many side of a written one resolves parent', () => {
  const plan: Ns5WriterPlanView = {
    entities: [
      { entityId: 'Pai', kind: 'core' },
      { entityId: 'Filha', kind: 'supporting' },
    ],
    relationships: [{
      relationshipId: 'filhaPai',
      fromEntity: 'Filha',
      toEntity: 'Pai',
      type: 'manyToOne',
    }],
  };
  const resolved = ns5ResolveEntityWriter({ entityId: 'Filha', kind: 'supporting' }, plan, [actOnParent]);
  assert.equal(resolved.kind, 'parent');
  assert.equal(resolved.via?.entityId, 'Pai');
  assert.equal(resolved.via?.relationshipId, 'filhaPai');
});

void test('an entity with no act and no parent resolves none', () => {
  const resolved = ns5ResolveEntityWriter({ entityId: 'Solta', kind: 'supporting' }, {
    entities: [{ entityId: 'Solta', kind: 'supporting' }],
    relationships: [],
  }, []);
  assert.deepEqual(resolved, { kind: 'none' });
});
