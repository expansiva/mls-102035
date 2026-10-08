import assert from 'node:assert/strict';
import test from 'node:test';

import { describeItemEffort, effortMasters, type EffortRegistry } from '/_102035_/l2/agentPlannerL4/helpers/plEffort.js';
import type { EffortAnswer, EffortInput } from '/_102035_/l2/solution/poolPlan.js';

const input: EffortInput = {
  module: 'agendaClinica',
  base: { baseId: 'b1', revisionId: 'r1' },
  item: {
    changeId: 'c1',
    kind: 'field',
    op: 'changed',
    entity: 'Paciente',
    source: 'l4',
  },
};

const l2 = { project: '102020', kind: 'l2' as const, device: 'web' as const };

test('sem registro devolve abend com reason', async () => {
  const answer = await describeItemEffort(l2, input, {});
  assert.equal(answer.status, 'abend');
  assert.equal(answer.abend?.reason, 'describeEffort not registered for master 102020');
  assert.equal(answer.item, 'c1');
  assert.deepEqual(answer.runAgents, []);
});

test('describeEffort falso devolve a resposta dele', async () => {
  const computed: EffortAnswer = {
    master: l2,
    item: 'c1',
    status: 'computed',
    regenerateDefs: [],
    materialize: [{ kind: 'entity', id: 'Paciente', path: 'model/Paciente.json' }],
    runAgents: [],
  };
  const registry: EffortRegistry = {
    '102020': {
      describeEffort: received => {
        assert.deepEqual(received, input);
        return computed;
      },
    },
  };
  const answer = await describeItemEffort(l2, input, registry);
  assert.equal(answer, computed);
});

test('erro do describeEffort vira abend', async () => {
  const registry: EffortRegistry = {
    '102020': { describeEffort: () => { throw new Error('master caiu'); } },
  };
  const answer = await describeItemEffort(l2, input, registry);
  assert.equal(answer.status, 'abend');
  assert.equal(answer.abend?.reason, 'describeEffort failed for master 102020: master caiu');
  assert.equal(answer.item, input.item.changeId);
});

test('master fora do workspaceDependencies não é consultado', () => {
  const masters = effortMasters({ workspaceDependencies: ['102020', '109999'] });
  assert.deepEqual(masters, [l2]);
  assert.equal(masters.some(master => master.project === '102021'), false);
});

test('os dois planners declarados entram na ordem do registro', () => {
  const masters = effortMasters({ workspaceDependencies: ['102021', '102020'] });
  assert.deepEqual(masters, [
    l2,
    { project: '102021', kind: 'l1', device: 'web' },
  ]);
});
