/// <mls fileReference="_102035_/l2/newRelease/helpers/menuReader.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { MENU_SCHEMA_VERSION } from '/_102035_/l2/solution/poolPlan.js';
import { buildReviewView } from '/_102035_/l2/newRelease/widgets/reviewModel.js';
import { menuFileForProject, readModuleMenu } from './menuReader.js';

function withFiles<T>(run: (put: (file: object, value: unknown) => void) => Promise<T>): Promise<T> {
  const saved = globalThis.mls;
  const files: Record<string, unknown> = {};
  globalThis.mls = { stor: { files, getKeyToFile: (file: object) => JSON.stringify(file) } } as unknown as typeof mls;
  const put = (file: object, value: unknown) => {
    files[JSON.stringify(file)] = { getContent: async () => JSON.stringify(value) };
  };
  return run(put).finally(() => { globalThis.mls = saved; });
}

const plan = {
  schemaVersion: MENU_SCHEMA_VERSION,
  moduleName: 'tarefas',
  device: 'web',
  tree: [{ id: 'old', kind: 'hub', label: 'Plano antigo', action: 'new', context: 'contexto', text: 'texto', children: [] }],
  authorities: {},
  meta: { removed: [] },
};

test('generated menu shows a manually edited config label, page details and actor entry without plan hubs', async () => withFiles(async put => {
  put(menuFileForProject(102047, 'tarefas'), plan);
  put({ project: 102047, level: 5, folder: '', shortName: 'config', extension: '.json' }, {
    projects: { '102047': { modules: [{ moduleId: 'tarefas', navigation: [
      { id: 'inicio', label: 'Início revisado à mão', href: '/tarefas/inicio', description: 'Página atual', actors: ['membroEquipe'], landing: true },
      { id: 'gestao', label: 'Gestão', href: '/tarefas/gestao', description: 'Visão do gestor', actors: ['gestor'] },
    ] }] } },
  });
  const read = await readModuleMenu(102047, 'tarefas', { generated: true });
  assert.equal(read.status, 'ok');
  assert.equal(read.path, 'l5/config.json');
  const view = buildReviewView({ pendingCount: 0, readStatus: read.status, raw: read.value,
    selectedActor: 'actor:membroEquipe', selectedId: 'inicio', selectedScope: 'future' });
  assert.deepEqual(view.tree.map(node => [node.id, node.label, node.kind, node.action]),
    [['inicio', 'Início revisado à mão', 'page', 'keep']]);
  assert.equal(view.selected?.href, '/tarefas/inicio');
  assert.equal(view.selected?.description, 'Página atual');
  assert.deepEqual(view.selected?.actors, ['membroEquipe']);
  assert.equal(view.selected?.landing, true);
}));

test('new module reads its pool plan', async () => withFiles(async put => {
  put(menuFileForProject(102047, 'tarefas'), plan);
  const read = await readModuleMenu(102047, 'tarefas', { generated: false });
  assert.equal(read.status, 'ok');
  assert.equal(read.path, 'l4/tarefas/pool/l2/web/menu.json');
  const view = buildReviewView({ pendingCount: 0, readStatus: read.status, raw: read.value,
    selectedActor: 'all', selectedId: '', selectedScope: 'future' });
  assert.deepEqual(view.tree.map(node => node.label), ['Plano antigo']);
}));

test('generated module absent from config has a visible reason and never falls back to the plan', async () => withFiles(async put => {
  put(menuFileForProject(102047, 'tarefas'), plan);
  put({ project: 102047, level: 5, folder: '', shortName: 'config', extension: '.json' },
    { projects: { '102047': { modules: [{ moduleId: 'outro', navigation: [] }] } } });
  const read = await readModuleMenu(102047, 'tarefas', { generated: true });
  assert.deepEqual(read, { status: 'moduleMissing', path: 'l5/config.json' });
  const view = buildReviewView({ pendingCount: 0, readStatus: read.status,
    selectedActor: 'all', selectedId: '', selectedScope: 'future' });
  assert.equal(view.kind, 'invalid');
  assert.equal(view.errorCode, 'review.error.moduleMissing');
}));
