import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  changeEffortFile,
  describeItemEffort,
  effortMasters,
  mergeEffort,
  writeChangeEffort,
  type EffortRegistry,
} from '/_102035_/l2/agentPlannerL4/helpers/plEffort.js';
import type { ChangeEffortFile, EffortAnswer, EffortInput, L4DiffItem } from '/_102035_/l2/solution/poolPlan.js';

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

const PROJECT = 102047;

type Stored = {
  project: number; level: number; folder: string; shortName: string; extension: string;
  status: string; versionRef: string; content: string;
  getValueInfo: () => Promise<{ content: string }>;
  getContent: () => Promise<string>;
};

function keyOf(info: { project: number | string; level: number | string; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function installHost(): { files: Record<string, Stored> } {
  const files: Record<string, Stored> = {};
  (globalThis as unknown as Record<string, unknown>).mls = {
    actualProject: PROJECT,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (params: { project: number; level: number; folder: string; shortName: string; extension: string }) => {
        const file: Stored = {
          project: params.project, level: params.level, folder: params.folder,
          shortName: params.shortName, extension: params.extension,
          status: 'new', versionRef: '0', content: '',
          getValueInfo: async () => ({ content: file.content }),
          getContent: async () => file.content,
        };
        files[keyOf(file)] = file;
        return file;
      },
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; },
        listFolder: () => [],
        deleteFile: (file: Stored) => { file.status = 'deleted'; },
      },
    },
  };
  return { files };
}

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

const l1 = { project: '102021', kind: 'l1' as const, device: 'web' as const };
const unit = { kind: 'entity' as const, id: 'Consulta', path: 'model/Consulta.json' };

function item(partial: Pick<L4DiffItem, 'changeId' | 'op' | 'kind'> & Partial<L4DiffItem>): L4DiffItem {
  return { entity: 'Consulta', source: 'l4', ...partial };
}

test('dois itens na mesma unidade: regenerateDefs vence materialize', () => {
  const merged = mergeEffort([
    {
      item: item({ changeId: 'a', op: 'changed', kind: 'field' }),
      answers: [{
        master: l1, item: 'a', status: 'computed',
        regenerateDefs: [], materialize: [unit], runAgents: [],
      }],
    },
    {
      item: item({ changeId: 'b', op: 'changed', kind: 'rule' }),
      answers: [{
        master: l1, item: 'b', status: 'computed',
        regenerateDefs: [unit], materialize: [unit], runAgents: [{ agent: 'x', command: 'run' }],
      }],
    },
  ]);
  assert.deepEqual(merged.merged.regenerateDefs, [{ ...unit, project: l1.project }]);
  assert.deepEqual(merged.merged.materialize, []);
  assert.deepEqual(merged.merged.runAgents, [{ agent: 'x', command: 'run' }]);
  assert.equal(merged.status, 'simple');
});

test('campo added vem antes da regra changed na mesma entidade', () => {
  const field = item({ changeId: 'field:nota', op: 'added', kind: 'field' });
  const rule = item({ changeId: 'rule:anotacao', op: 'changed', kind: 'rule' });
  const empty = (changeId: string): EffortAnswer => ({
    master: l2, item: changeId, status: 'computed', regenerateDefs: [], materialize: [], runAgents: [],
  });
  const merged = mergeEffort([
    { item: rule, answers: [empty(rule.changeId)] },
    { item: field, answers: [empty(field.changeId)] },
  ]);
  assert.deepEqual(merged.perItem.map(row => row.item), ['field:nota', 'rule:anotacao']);
});

test('item que nenhum master calcula fica blocked', () => {
  const merged = mergeEffort([{
    item: item({ changeId: 'c1', op: 'changed', kind: 'field' }),
    answers: [{
      master: l2, item: 'c1', status: 'abend',
      regenerateDefs: [], materialize: [], runAgents: [],
      abend: { reason: 'describeEffort not registered for master 102020' },
    }],
  }]);
  assert.equal(merged.status, 'blocked');
  assert.equal(merged.merged.abend.length, 1);
  assert.equal(merged.merged.abend[0]?.item, 'c1');
});

test('respostas iguais ao gabarito reproduzem a fixture dourada', async () => {
  const fixturePath = fileURLToPath(new URL(
    '../../solution/fixtures/changeEffort/agendaClinica-regra-anotacao/changeEffort.json',
    import.meta.url,
  ));
  const golden = JSON.parse(readFileSync(fixturePath, 'utf8')) as ChangeEffortFile;
  const merged = mergeEffort(golden.request.items.map(row => ({
    item: row,
    answers: golden.perItem.find(entry => entry.item === row.changeId)?.answers ?? [],
  })));
  assert.deepEqual(merged.merged, golden.merged);
  assert.equal(merged.status, golden.status);

  const host = installHost();
  const file: ChangeEffortFile = golden;
  const written = await writeChangeEffort(golden.module, file);
  const info = changeEffortFile(golden.module);
  const stored = host.files[keyOf(info)];
  const back = JSON.parse(stored?.content || 'null') as ChangeEffortFile;
  assert.equal(info.folder, `${golden.module}/pool/l4`);
  assert.equal(info.shortName, 'changeEffort');
  assert.equal(info.extension, '.json');
  assert.equal(stored?.content, `${JSON.stringify(file, null, 2)}\n`);
  assert.ok(written.length > 0);
  assert.deepEqual(back, file);
  await assert.rejects(() => writeChangeEffort('outro', file));
});
