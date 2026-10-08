/// <mls fileReference="_102035_/l2/solution/effortRegistry.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { describeItemEffort } from '/_102035_/l2/agentPlannerL4/helpers/plEffort.js';
import type { EffortAnswer, EffortInput } from '/_102035_/l2/solution/poolPlan.js';
import {
  clearDescribeEffortCache,
  describeEffortFailure,
  describeEffortModulePath,
  effortRegistry,
  resolveDescribeEffort,
  type DescribeEffortImporter,
} from '/_102035_/l2/solution/effortRegistry.js';

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

const master = { project: '102020', kind: 'l2' as const, device: 'web' as const };

function reset(): void {
  for (const project of Object.keys(effortRegistry)) delete effortRegistry[project];
  clearDescribeEffortCache();
}

test('entrada injetada vence o import', async () => {
  reset();
  const computed = { status: 'computed', item: 'c1', master } as EffortAnswer;
  effortRegistry['102020'] = { describeEffort: () => computed };
  let calls = 0;
  const importer: DescribeEffortImporter = async () => {
    calls += 1;
    throw new Error('should not import');
  };
  const fn = await resolveDescribeEffort('102020', importer);
  assert.equal(calls, 0);
  assert.equal(fn, effortRegistry['102020']!.describeEffort);
  const answer = await describeItemEffort(master, input);
  assert.equal(answer, computed);
  reset();
});

test('import que falha devolve undefined e abend com o caminho', async () => {
  reset();
  const path = describeEffortModulePath('102020')!;
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  try {
    const importer: DescribeEffortImporter = async () => {
      throw new Error('module missing');
    };
    assert.equal(await resolveDescribeEffort('102020', importer), undefined);
    assert.equal(describeEffortFailure('102020'), 'load failed: module missing');
    assert.equal(await resolveDescribeEffort('102020', importer), undefined);
    assert.equal(warnings.length, 1);
    assert.match(String(warnings[0]?.join(' ')), /module missing/);
    assert.ok(String(warnings[0]?.join(' ')).includes(path));
    const answer = await describeItemEffort(master, input);
    assert.equal(answer.status, 'abend');
    assert.equal(
      answer.abend?.reason,
      `describeEffort unavailable for master 102020 at ${path}: load failed: module missing`,
    );
    assert.equal(warnings.length, 1);
  } finally {
    console.warn = originalWarn;
    reset();
  }
});

test('módulo sem describeEffort devolve undefined e abend com o caminho', async () => {
  reset();
  const path = describeEffortModulePath('102021')!;
  await resolveDescribeEffort('102021', async () => ({}));
  const answer = await describeItemEffort(
    { project: '102021', kind: 'l1', device: 'web' },
    input,
  );
  assert.equal(answer.status, 'abend');
  assert.equal(describeEffortFailure('102021'), 'module does not export describeEffort');
  assert.equal(
    answer.abend?.reason,
    `describeEffort unavailable for master 102021 at ${path}: module does not export describeEffort`,
  );
  reset();
});

test('segundo pedido do mesmo projeto usa o cache', async () => {
  reset();
  let calls = 0;
  const describeEffort = () => ({ status: 'computed' }) as EffortAnswer;
  const importer: DescribeEffortImporter = async specifier => {
    calls += 1;
    assert.equal(specifier, '/_102020_/l2/helpers/effort/describeEffort.js');
    return { describeEffort };
  };
  const first = await resolveDescribeEffort('102020', importer);
  const second = await resolveDescribeEffort('102020', importer);
  assert.equal(calls, 1);
  assert.equal(first, describeEffort);
  assert.equal(second, describeEffort);
  reset();
});

test('caminho não numérico não importa', async () => {
  reset();
  let calls = 0;
  const fn = await resolveDescribeEffort('../102020', async () => {
    calls += 1;
    return {};
  });
  assert.equal(fn, undefined);
  assert.equal(calls, 0);
  assert.equal(describeEffortModulePath('102020/../../x'), undefined);
  reset();
});
