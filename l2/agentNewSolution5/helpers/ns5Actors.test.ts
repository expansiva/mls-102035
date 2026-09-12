/// <mls fileReference="_102035_/l2/agentNewSolution5/helpers/ns5Actors.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { survivingNs5Actors } from '/_102035_/l2/agentNewSolution5/helpers/ns5Actors.js';
import { NS5_PIPELINE_SCHEMA_VERSION, type Ns5ModuleActor, type Ns5PipelineState } from '/_102035_/l2/solution/types.js';

const garcom: Ns5ModuleActor = {
  actorId: 'garcom',
  kind: 'internal',
  origin: 'named',
  title: 'Garçom',
  description: 'Opens tabs.',
};
const cliente: Ns5ModuleActor = {
  actorId: 'cliente',
  kind: 'external',
  origin: 'inferred',
  title: 'Cliente',
  description: 'Pays.',
};

function pipeline(overrides: Partial<Ns5PipelineState['steps']> = {}): Ns5PipelineState {
  return {
    schemaVersion: NS5_PIPELINE_SCHEMA_VERSION,
    flowId: 'agentNewSolution5',
    moduleName: 'comandaRestaurante5',
    status: 'inProgress',
    steps: overrides,
    sourcePrompt: 'x',
    invocation: { fast: true, module: 'comandaRestaurante5', rebuildAll: false },
    updatedAt: '2026-09-11T00:00:00.000Z',
  };
}

void test('survivingNs5Actors returns module10 actors when journeys20 has not dropped any', () => {
  const actors = survivingNs5Actors(pipeline({
    module10: {
      status: 'approved',
      updatedAt: '2026-09-11T00:00:00.000Z',
      actors: [garcom, cliente],
    },
  }));
  assert.deepEqual(actors.map(actor => actor.actorId), ['garcom', 'cliente']);
});

void test('survivingNs5Actors subtracts journeys20.droppedActors', () => {
  const actors = survivingNs5Actors(pipeline({
    module10: {
      status: 'approved',
      updatedAt: '2026-09-11T00:00:00.000Z',
      actors: [garcom, cliente],
    },
    journeys20: {
      status: 'approved',
      updatedAt: '2026-09-11T00:00:00.000Z',
      droppedActors: ['cliente'],
    },
  }));
  assert.deepEqual(actors.map(actor => actor.actorId), ['garcom']);
});

void test('survivingNs5Actors is empty without a pipeline or module10 actors', () => {
  assert.deepEqual(survivingNs5Actors(null), []);
  assert.deepEqual(survivingNs5Actors(pipeline()), []);
});
