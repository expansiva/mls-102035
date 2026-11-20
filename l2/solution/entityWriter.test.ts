/// <mls fileReference="_102035_/l2/solution/entityWriter.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { runNs5Oracle } from '/_102035_/l2/solution/gates/finalize80/gate.js';
import { loadNs5OracleSources } from '/_102035_/l2/solution/testing/ns5RealFixtures.test.js';
import {
  ns5ResolveEntityWriter,
  ns5WrittenOutsideJourneys,
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

function twoParentsPlan(firstRel: 'childCrud' | 'childJourney'): Ns5WriterPlanView {
  const childCrud = {
    relationshipId: 'childCrud',
    fromEntity: 'Child',
    toEntity: 'Catalog',
    type: 'manyToOne' as const,
  };
  const childJourney = {
    relationshipId: 'childJourney',
    fromEntity: 'Child',
    toEntity: 'File',
    type: 'manyToOne' as const,
  };
  return {
    entities: [
      { entityId: 'Catalog', kind: 'core', writer: 'crud' },
      { entityId: 'File', kind: 'core' },
      { entityId: 'Child', kind: 'event' },
    ],
    relationships: firstRel === 'childCrud' ? [childCrud, childJourney] : [childJourney, childCrud],
  };
}

const fileAct: Ns5WriterJourneyView = {
  journeyId: 'save',
  business: { steps: [{ stepId: 'write', kind: 'act', entity: 'File', effect: 'create' }] },
};

void test('among two parents, the journey writer wins regardless of relationship order', () => {
  for (const order of ['childCrud', 'childJourney'] as const) {
    const resolved = ns5ResolveEntityWriter({ entityId: 'Child', kind: 'event' }, twoParentsPlan(order), [fileAct]);
    assert.equal(resolved.kind, 'parent', order);
    assert.equal(resolved.via?.entityId, 'File', order);
    assert.equal(resolved.via?.relationshipId, 'childJourney', order);
  }
});

void test('among two equal parent kinds, the first relationship wins', () => {
  const plan: Ns5WriterPlanView = {
    entities: [
      { entityId: 'One', kind: 'core', writer: 'crud' },
      { entityId: 'Two', kind: 'core', writer: 'crud' },
      { entityId: 'Child', kind: 'event' },
    ],
    relationships: [
      { relationshipId: 'childOne', fromEntity: 'Child', toEntity: 'One', type: 'manyToOne' },
      { relationshipId: 'childTwo', fromEntity: 'Child', toEntity: 'Two', type: 'manyToOne' },
    ],
  };
  const resolved = ns5ResolveEntityWriter({ entityId: 'Child', kind: 'event' }, plan, []);
  assert.equal(resolved.kind, 'parent');
  assert.equal(resolved.via?.entityId, 'One');
});

void test('a process stage without act resolves process when outside is passed, parent without it', () => {
  const plan: Ns5WriterPlanView = {
    entities: [
      { entityId: 'Supplier', kind: 'core', writer: 'crud' },
      { entityId: 'Order', kind: 'supporting' },
    ],
    relationships: [{
      relationshipId: 'orderSupplier',
      fromEntity: 'Order',
      toEntity: 'Supplier',
      type: 'manyToOne',
    }],
  };
  const outside = ns5WrittenOutsideJourneys({
    workflows: {
      processes: [{
        processId: 'cycle',
        tasks: [{ taskId: 'make', kind: 'mechanical', entityRef: 'Order', effect: 'create' }],
      }],
    },
  });
  const withOutside = ns5ResolveEntityWriter({ entityId: 'Order', kind: 'supporting' }, plan, [], outside);
  assert.deepEqual(withOutside, {
    kind: 'process',
    outside: { source: 'process', ref: 'cycle.make' },
  });
  const without = ns5ResolveEntityWriter({ entityId: 'Order', kind: 'supporting' }, plan, []);
  assert.equal(without.kind, 'parent');
  assert.equal(without.via?.entityId, 'Supplier');
});

void test('inbound.writes and serve create resolve inbound with outside', () => {
  const inboundOutside = ns5WrittenOutsideJourneys({
    integration: { inbound: [{ id: 'arrived', writes: ['Record'] }] },
  });
  assert.deepEqual(
    ns5ResolveEntityWriter({ entityId: 'Record', kind: 'core' }, undefined, [], inboundOutside),
    { kind: 'inbound', outside: { source: 'inbound', ref: 'arrived' } },
  );
  const serveOutside = ns5WrittenOutsideJourneys({
    integration: {
      connections: [{
        connectionId: 'cm',
        operationId: 'open',
        direction: 'serve',
        effect: 'create',
        entityRefs: ['Record'],
      }],
    },
  });
  assert.deepEqual(
    ns5ResolveEntityWriter({ entityId: 'Record', kind: 'core' }, undefined, [], serveOutside),
    { kind: 'inbound', outside: { source: 'serve', ref: 'cm.open' } },
  );
});

void test('a direct act wins over outside', () => {
  const outside = ns5WrittenOutsideJourneys({
    workflows: {
      processes: [{
        processId: 'cycle',
        tasks: [{ taskId: 'make', kind: 'mechanical', entityRef: 'Pai', effect: 'create' }],
      }],
    },
  });
  const resolved = ns5ResolveEntityWriter({ entityId: 'Pai', kind: 'core' }, undefined, [actOnParent], outside);
  assert.deepEqual(resolved, { kind: 'journey' });
});

void test('ns5WrittenOutsideJourneys prefers inbound then serve then process; skips serve remove and human', () => {
  const map = ns5WrittenOutsideJourneys({
    workflows: {
      processes: [{
        processId: 'cycle',
        tasks: [
          { taskId: 'make', kind: 'mechanical', entityRef: 'Shared', effect: 'create' },
          { taskId: 'wait', kind: 'human', entityRef: 'HumanOnly', effect: 'create' },
          { taskId: 'pause', kind: 'wait', entityRef: 'WaitOnly', effect: 'create' },
        ],
      }],
    },
    integration: {
      inbound: [{ id: 'in', writes: ['Shared'] }],
      connections: [
        { connectionId: 'cm', operationId: 'open', direction: 'serve', effect: 'create', entityRefs: ['Shared'] },
        { connectionId: 'cm', operationId: 'drop', direction: 'serve', effect: 'remove', entityRefs: ['Dropped'] },
        { connectionId: 'cm', operationId: 'move', direction: 'serve', effect: 'transition', entityRefs: ['Moved'] },
      ],
    },
  });
  assert.deepEqual(map.get('Shared'), { source: 'inbound', ref: 'in' });
  assert.equal(map.has('HumanOnly'), false);
  assert.equal(map.has('WaitOnly'), false);
  assert.equal(map.has('Dropped'), false);
  assert.equal(map.has('Moved'), false);
  const serveThenProcess = ns5WrittenOutsideJourneys({
    workflows: {
      processes: [{
        processId: 'cycle',
        tasks: [{ taskId: 'make', kind: 'mechanical', entityRef: 'Later', effect: 'create' }],
      }],
    },
    integration: {
      connections: [{
        connectionId: 'cm', operationId: 'open', direction: 'serve', effect: 'create', entityRefs: ['Later'],
      }],
    },
  });
  assert.deepEqual(serveThenProcess.get('Later'), { source: 'serve', ref: 'cm.open' });
});

void test('I10 passes a process-only entity and still fails inbound without an arrival', () => {
  const sources = JSON.parse(JSON.stringify(loadNs5OracleSources('comandaRestaurante5'))) as ReturnType<typeof loadNs5OracleSources>;
  const mesa = sources.entities.find(entity => entity.entityId === 'Mesa')!;
  const generated = {
    ...JSON.parse(JSON.stringify(mesa)),
    entityId: 'PedidoGerado',
    party: 'none',
    writer: undefined,
    fields: [
      { fieldId: mesa.idField, title: 'Id', type: 'uuid', required: true, description: 'Id.' },
      { fieldId: 'total', title: 'Total', type: 'money', required: true, description: 'Total.' },
    ],
  };
  sources.entities.push(generated);
  sources.ontologyIndex.entities.push('PedidoGerado');
  sources.workflows.processes.push({
    processId: 'ciclo',
    title: 'Ciclo',
    description: 'Gera o pedido.',
    trigger: { kind: 'manual' },
    tasks: [{
      taskId: 'gerar',
      kind: 'mechanical',
      entityRef: 'PedidoGerado',
      effect: 'create',
      next: [],
      description: 'Gera o pedido.',
    }],
  });
  const passing = runNs5Oracle(sources);
  assert.equal(
    passing.errors.filter(issue => issue.checkId === 'I10' && /PedidoGerado/.test(issue.message)).length,
    0,
    passing.errors.map(issue => `${issue.code} ${issue.message}`).join('\n'),
  );

  const inboundOnly = JSON.parse(JSON.stringify(loadNs5OracleSources('comandaRestaurante5'))) as ReturnType<typeof loadNs5OracleSources>;
  const orphan = {
    ...JSON.parse(JSON.stringify(mesa)),
    entityId: 'Chegada',
    party: 'none',
    writer: 'inbound' as const,
    fields: [
      { fieldId: mesa.idField, title: 'Id', type: 'uuid', required: true, description: 'Id.' },
      { fieldId: 'payload', title: 'Payload', type: 'string', required: true, description: 'Payload.' },
    ],
  };
  inboundOnly.entities.push(orphan);
  inboundOnly.ontologyIndex.entities.push('Chegada');
  inboundOnly.integration = { ...inboundOnly.integration, inbound: [], connections: [] };
  const failing = runNs5Oracle(inboundOnly);
  assert.ok(
    failing.errors.some(issue => issue.checkId === 'I10' && /Chegada/.test(issue.message) && /inbound/.test(issue.message)),
    failing.errors.map(issue => `${issue.code} ${issue.message}`).join('\n'),
  );
});
