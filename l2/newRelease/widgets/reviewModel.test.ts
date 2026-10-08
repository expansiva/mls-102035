/// <mls fileReference="_102035_/l2/newRelease/widgets/reviewModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { menuFileForProject } from '../helpers/menuReader.js';
import {
  actorIdFromKey,
  beginReviewPrimaryAction,
  buildReviewActionPresentation,
  buildReviewActionPlacements,
  buildReviewView,
  canAcceptImplementation,
  canStartReviewRun,
  implementationProgress,
  menuTreeForActor,
  openReviewExpansionKeys,
  parseReviewMenu,
  resolveSelectedActor,
  REVIEW_ALL_ACTORS,
  reviewExpansionKey,
  sameReviewStartSnapshot,
  toggleReviewExpansion,
  toggleReviewSelection,
  type ReviewInput,
  type ReviewImplementationInput,
  type ReviewTreeNode,
  type ReviewView,
} from './reviewModel.js';
import { MENU_ACTIONS, MENU_SCHEMA_VERSION, type MenuStampedNode } from '/_102035_/l2/solution/poolPlan.js';
import { L4_IMPLEMENTATION_SCHEMA, type L4ImplementationRecord, type L4ImplementationPhase } from '/_102035_/l2/solution/candidate/moduleImplementation.js';

const menu = JSON.parse(readFileSync(new URL('./fixtures/review-menu.json', import.meta.url), 'utf8'));
const changeEffort = JSON.parse(readFileSync(new URL('../../solution/fixtures/changeEffort/agendaClinica-regra-anotacao/changeEffort.json', import.meta.url), 'utf8'));

function progressRecord(phases: L4ImplementationPhase[] = []): L4ImplementationRecord {
  const merged = structuredClone(changeEffort.merged);
  merged.materialize = [];
  merged.runAgents = [0, 1].map(index => ({ agent: 'agentAddLanguage', command: `@@agentAddLanguage ${index}` }));
  return {
    schemaVersion: L4_IMPLEMENTATION_SCHEMA, changeId: 'change-one', revisionId: 'revision-one',
    acceptedBy: 'user', acceptedAt: '2026-10-08T00:00:00Z',
    hashes: { changeEffort: 'effort' }, merged, phases,
  };
}

function progressPhase(patch: Partial<L4ImplementationPhase> = {}): L4ImplementationPhase {
  return {
    name: 'runAgents:0', attempt: 1, agent: 'agentAddLanguage', command: '@@agentAddLanguage []',
    taskId: 'task', threadId: 'thread', messageId: 'message', status: 'running',
    startedAt: '2026-10-08T00:00:00Z', previousAttempts: [], ...patch,
  };
}

test('mr_12: absent phases follow accepted runAgents order', () => {
  const expected = ['runAgents:0', 'runAgents:1'].map(name => ({ name, status: 'aguardando', podeTentarDeNovo: false }));
  assert.deepEqual(implementationProgress(null, 'change-one'), []);
  assert.deepEqual(implementationProgress(progressRecord(), 'change-one'), expected);
});

test('materialization keeps agents waiting for the team without claiming completion', () => {
  const record = progressRecord();
  record.merged.materialize = structuredClone(changeEffort.merged.materialize);
  assert.deepEqual(implementationProgress(record, 'change-one').map(phase => phase.status),
    ['depoisDaMaterializacao', 'depoisDaMaterializacao']);
});

test('mr_12: running phase exposes its attempt and never offers retry', () => {
  const result = implementationProgress(progressRecord([progressPhase({ name: 'runAgents:1', attempt: 2 })]), 'change-one');
  assert.equal(result[0].status, 'aguardando');
  assert.deepEqual(result[1], { name: 'runAgents:1', status: 'executando', attempt: 2, podeTentarDeNovo: false });
});

test('mr_12: completed phases preserve changedDefs and accepted order without commits', () => {
  const changedDefs: NonNullable<L4ImplementationPhase['changedDefs']> = [
    { path: 'l2/agenda.defs.ts', status: 'changed', level: 2 },
    { path: 'l2/new.defs.ts', status: 'added', level: 2 },
    { path: 'l2/old.defs.ts', status: 'removed', level: 2 },
  ];
  const result = implementationProgress(progressRecord([
    progressPhase({ name: 'runAgents:1', status: 'done', changedDefs: [] }),
    { ...progressPhase({ status: 'done', changedDefs }), commits: ['unexpected'] } as L4ImplementationPhase,
  ]), 'change-one');
  assert.deepEqual(result[0], { name: 'runAgents:0', status: 'concluido', attempt: 1, changedDefs, podeTentarDeNovo: false });
  assert.equal(result[1].name, 'runAgents:1');
  assert.equal(result[1].status, 'concluido');
});

test('mr_12: any first failure offers retry with error and previous attempts', () => {
  const failed = progressPhase({ status: 'failed', error: 'Invalid defs' });
  assert.deepEqual(implementationProgress(progressRecord([failed]), 'change-one')[0], {
    name: 'runAgents:0', status: 'falhou', attempt: 1, error: failed.error, previousAttempts: [], podeTentarDeNovo: true,
  });
});

test('mr_12: second failure preserves history without retry', () => {
  const previous = progressPhase({ status: 'failed', error: 'First failure' });
  const failed = progressPhase({ status: 'failed', attempt: 2, error: 'Second failure', previousAttempts: [previous] });
  assert.deepEqual(implementationProgress(progressRecord([failed]), 'change-one')[0], {
    name: 'runAgents:0', status: 'falhou', attempt: 2, error: failed.error, previousAttempts: [previous], podeTentarDeNovo: false,
  });
});

test('mr_12: another change or no current change discards the record', () => {
  const record = progressRecord([progressPhase({ status: 'failed', error: 'Obsolete failure' })]);
  for (const currentChangeId of ['change-other', null]) {
    assert.deepEqual(implementationProgress(record, currentChangeId), implementationProgress(null, currentChangeId));
  }
});

function implementationInput(): ReviewImplementationInput {
  const root = 'l4/agendaClinica/pipeline/changes/change-one/revisions/revision-one/l4/pool/l4';
  return {
    project: 102047,
    moduleName: 'agendaClinica',
    data: { changeId: 'change-one', revisionId: 'revision-one', resultCurrent: true },
    runStatus: 'ready',
    changeEffort: { status: 'ok', path: `${root}/changeEffort.json`, value: changeEffort },
    hashes: { changeEffort: 'effort-hash' },
    implementation: null,
  };
}

test('mr_10 s2: ready current revision and three empty boxes allow acceptance', () => {
  assert.equal(canAcceptImplementation(implementationInput()), true);
});

test('mr_10 s2: absent or unfinished run and non-current result prevent acceptance', () => {
  const input = implementationInput();
  for (const runStatus of [null, 'running', 'failed', 'disputed']) {
    assert.equal(canAcceptImplementation({ ...input, runStatus }), false);
  }
  assert.equal(canAcceptImplementation({ ...input, data: null }), false);
  for (const data of [
    { ...input.data!, resultCurrent: false },
    { ...input.data!, changeId: null },
    { ...input.data!, revisionId: null },
  ]) assert.equal(canAcceptImplementation({ ...input, data }), false);
});

test('mr_28 s1: effort must be valid and readable from the current revision with its hash', () => {
  const input = implementationInput();
  for (const status of ['missing', 'invalid'] as const)
    assert.equal(canAcceptImplementation({ ...input, changeEffort: { ...input.changeEffort, status } }), false);
  for (const path of [input.changeEffort.path.replace('revision-one', 'revision-old'),
    input.changeEffort.path.replace('change-one', 'change-old'), 'l4/agendaClinica/pool/l4/changeEffort.json'])
    assert.equal(canAcceptImplementation({ ...input, changeEffort: { ...input.changeEffort, path } }), false);
  assert.equal(canAcceptImplementation({ ...input, hashes: { changeEffort: '' } }), false);
  assert.equal(canAcceptImplementation({ ...input, changeEffort: { ...input.changeEffort, value: {} } }), false);
});

test('mr_28 s1: blocked and regeneration effort cannot be accepted', () => {
  const input = implementationInput();
  const blocked = structuredClone(changeEffort);
  blocked.perItem[0].answers[0].status = 'abend';
  blocked.perItem[0].answers[0].abend = { reason: 'unavailable' };
  blocked.merged.abend = [{ item: blocked.perItem[0].item, master: blocked.perItem[0].answers[0].master, reason: 'unavailable' }];
  blocked.status = 'blocked';
  assert.equal(canAcceptImplementation({ ...input, changeEffort: { ...input.changeEffort, value: blocked } }), false);
  const regenerate = structuredClone(changeEffort);
  const unit = { kind: 'page', id: 'agenda_diaria', path: 'l2/agendaClinica/web/contracts/agenda_diaria.defs.ts' };
  regenerate.perItem[0].answers[0].regenerateDefs = [unit];
  regenerate.perItem[0].answers[0].materialize = [];
  regenerate.merged.regenerateDefs = [{ project: '102020', ...unit }];
  regenerate.merged.materialize = regenerate.merged.materialize.filter((item: { project: string; id: string }) => item.project !== '102020' || item.id !== unit.id);
  assert.equal(canAcceptImplementation({ ...input, changeEffort: { ...input.changeEffort, value: regenerate } }), false);
});

test('mr_10 s2: identical acceptance is idempotent; different revision or hashes block it', () => {
  const input = implementationInput();
  input.implementation = {
    schemaVersion: L4_IMPLEMENTATION_SCHEMA,
    changeId: input.data!.changeId!, revisionId: input.data!.revisionId!,
    acceptedBy: 'user-one', acceptedAt: '2026-10-08T00:00:00.000Z',
    hashes: { ...input.hashes }, phases: [],
  };
  assert.equal(canAcceptImplementation(input), true);
  assert.equal(canAcceptImplementation({ ...input, implementation: {
    ...input.implementation, hashes: { changeEffort: 'different' },
  } }), false);
  assert.equal(canAcceptImplementation({ ...input, implementation: {
    ...input.implementation, revisionId: 'revision-old',
  } }), false);
});

test('mr_10 s2: each official pool box blocks on messages, ignoring artifacts and deleted messages', () => {
  const previous = mls.stor.files;
  try {
    for (const box of ['l4', 'l2', 'l1']) {
      const file = {
        project: 102047, level: 4, folder: `agendaClinica/pool/${box}`,
        shortName: '20261008000000_thread_1', extension: '.json', status: 'loaded',
      };
      mls.stor.files = { message: file } as unknown as typeof mls.stor.files;
      assert.equal(canAcceptImplementation(implementationInput()), false, box);
      mls.stor.files = { message: { ...file, status: 'deleted' }, artifact: { ...file, shortName: 'menu' } } as unknown as typeof mls.stor.files;
      assert.equal(canAcceptImplementation(implementationInput()), true, box);
    }
  } finally {
    mls.stor.files = previous;
  }
});

const sealedPreflight = {
  request: 'Add one field',
  sources: [{ path: 'module.defs.ts', source: 'export const module = {}' }],
  manifest: {
    project: 102047,
    moduleName: 'agendaClinica',
    changeId: 'change-one',
    revisionId: 'revision-one',
    baseId: 'base-one',
    requestRevision: 1,
    requestHash: `sha256:${'a'.repeat(64)}`,
    files: { 'module.defs.ts': `sha256:${'b'.repeat(64)}` },
  },
};

test('review start preflight accepts a sealed text-only request and rejects incomplete identities', () => {
  const input = {
    project: 102047,
    moduleName: 'agendaClinica',
    changeId: 'change-one',
    revisionId: 'revision-one',
    request: 'Add one field',
    userId: 'user-one',
    hasRun: false,
    sealedRevision: sealedPreflight,
  };
  assert.equal(canStartReviewRun(input), true);
  assert.equal(canStartReviewRun({ ...input, userId: null }), false);
  assert.equal(canStartReviewRun({ ...input, hasRun: true }), false);
  assert.equal(canStartReviewRun({ ...input, request: 'Changed after seal' }), false);
  assert.equal(canStartReviewRun({ ...input, revisionId: 'revision-two' }), false);
  assert.equal(canStartReviewRun({ ...input, sealedRevision: {
    ...sealedPreflight,
    manifest: { ...sealedPreflight.manifest, requestHash: 'sha256:invalid' },
  } }), false);
  assert.equal(canStartReviewRun({ ...input, sealedRevision: {
    ...sealedPreflight,
    sources: [],
  } }), false);
});

test('review click fence rejects identity, manifest hash and source byte races after preflight', () => {
  assert.equal(sameReviewStartSnapshot(sealedPreflight, structuredClone(sealedPreflight)), true);
  assert.equal(sameReviewStartSnapshot(sealedPreflight, {
    ...structuredClone(sealedPreflight),
    manifest: { ...sealedPreflight.manifest, baseId: 'base-two' },
  }), false);
  assert.equal(sameReviewStartSnapshot(sealedPreflight, {
    ...structuredClone(sealedPreflight),
    manifest: { ...sealedPreflight.manifest, requestRevision: 2 },
  }), false);
  assert.equal(sameReviewStartSnapshot(sealedPreflight, {
    ...structuredClone(sealedPreflight),
    manifest: { ...sealedPreflight.manifest, files: { 'module.defs.ts': `sha256:${'c'.repeat(64)}` } },
  }), false);
  assert.equal(sameReviewStartSnapshot(sealedPreflight, {
    ...structuredClone(sealedPreflight),
    sources: [{ ...sealedPreflight.sources[0], source: 'export const module = { changed: true }' }],
  }), false);
});

function view(patch: Partial<ReviewInput> = {}) {
  return buildReviewView({
    pendingCount: 0,
    readStatus: 'ok',
    raw: menu,
    selectedActor: REVIEW_ALL_ACTORS,
    selectedId: '',
    selectedScope: 'future',
    ...patch,
  });
}

function labels(nodes: { label: string; children: { label: string }[] }[]): string[] {
  return nodes.map(node => node.label);
}

function find(nodes: MenuStampedNode[], id: string): MenuStampedNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.kind !== 'page') {
      const nested = find(node.children, id);
      if (nested) return nested;
    }
  }
  return undefined;
}

test('menu file of the selected project is l4/<module>/pool/l2/web/menu.json', () => {
  assert.deepEqual(menuFileForProject(102047, 'agendaClinica'), {
    project: 102047,
    level: 4,
    folder: 'agendaClinica/pool/l2/web',
    shortName: 'menu',
    extension: '.json',
  });
});

test('frozen fixture parses as menu v2.2 with the four actions', () => {
  const parsed = parseReviewMenu(menu);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.menu.schemaVersion, MENU_SCHEMA_VERSION);
  const seen = new Set<string>();
  const walk = (nodes: MenuStampedNode[]) => {
    for (const node of nodes) {
      seen.add(node.action);
      if (node.kind !== 'page') walk(node.children);
    }
  };
  walk(parsed.menu.tree);
  walk(parsed.menu.removed);
  assert.deepEqual([...seen].sort(), [...MENU_ACTIONS].sort());
});

test('Todos keeps original tree order and exposes removed as a separate forest', () => {
  const parsed = parseReviewMenu(menu);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const ready = view();
  assert.equal(ready.kind, 'ready');
  assert.deepEqual(labels(ready.tree), ['Início', 'Minha agenda', 'Meu cadastro', 'Início recepção', 'Central oculta']);
  assert.deepEqual(labels(ready.removed), ['Minha agenda antiga']);
  assert.equal(ready.removed[0].children[0].label, 'Painel antigo');
  assert.equal(ready.removed[0].action, 'remove');
  assert.equal(ready.showContinue, true);
  assert.equal(ready.showCalculate, false);
  assert.equal(ready.selectedId, '');
  assert.equal(ready.selected, null);
  assert.deepEqual(menuTreeForActor(parsed.menu, REVIEW_ALL_ACTORS).map(node => node.id), parsed.menu.tree.map(node => node.id));
});

test('menu starts without detail and label selection toggles only the same node and scope', () => {
  const initial = view();
  assert.equal(initial.selectedId, '');
  assert.equal(initial.selected, null);

  const opened = toggleReviewSelection('', 'future', 'inicio', 'future');
  assert.deepEqual(opened, { selectedId: 'inicio', selectedScope: 'future' });
  assert.deepEqual(toggleReviewSelection(opened.selectedId, opened.selectedScope, 'inicio', 'future'), {
    selectedId: '', selectedScope: 'future',
  });
  assert.deepEqual(toggleReviewSelection('inicio', 'future', 'inicio', 'removed'), {
    selectedId: 'inicio', selectedScope: 'removed',
  });
  assert.equal(view({ selectedId: 'does-not-exist' }).selected, null);
});

test('review primary action distinguishes calculate, continue and unavailable while disconnected', () => {
  const base = {
    viewKind: 'ready' as const,
    version: 'tobe' as const,
    loading: false,
    current: true,
    resultCurrent: false,
    backendKind: 'ready' as const,
    effortKind: 'missing' as const,
    busy: false,
    connected: false,
    error: '',
  };
  const calculate = buildReviewActionPresentation({ ...base, viewKind: 'pending' });
  assert.equal(calculate.kind, 'calculate');
  assert.equal(calculate.labelKey, 'review.calculate');
  assert.equal(calculate.disabled, true);
  assert.equal(calculate.availabilityKey, 'review.actionReadinessBlocked');

  const ready = buildReviewActionPresentation({ ...base, resultCurrent: true });
  assert.equal(ready.kind, 'continue');
  assert.equal(ready.labelKey, 'review.continue');
  assert.equal(ready.disabled, true);

  for (const input of [
    { ...base, loading: true },
    { ...base, current: false },
    { ...base, viewKind: 'empty' as const },
    { ...base, viewKind: 'invalid' as const },
    { ...base, version: 'asis' as const, resultCurrent: true },
  ]) {
    const unavailable = buildReviewActionPresentation(input);
    assert.equal(unavailable.kind, 'unavailable');
    assert.equal(unavailable.disabled, true);
  }
});

test('continue requires a current valid backend, accepts missing effort, and rejects invalid effort', () => {
  const base = {
    viewKind: 'ready' as const,
    version: 'tobe' as const,
    loading: false,
    current: true,
    resultCurrent: true,
    backendKind: 'ready' as const,
    effortKind: 'missing' as const,
    busy: false,
    connected: true,
    error: '',
  };
  assert.equal(buildReviewActionPresentation(base).kind, 'continue');
  assert.equal(buildReviewActionPresentation({ ...base, effortKind: 'counts' }).kind, 'continue');
  assert.equal(buildReviewActionPresentation({ ...base, effortKind: 'invalid' }).descriptionKey, 'review.actionEffortInvalid');
  for (const backendKind of ['missing', 'invalid', 'stale'] as const) {
    const result = buildReviewActionPresentation({ ...base, backendKind });
    assert.equal(result.kind, 'unavailable');
    assert.equal(result.descriptionKey, `review.actionBackend${backendKind[0].toUpperCase()}${backendKind.slice(1)}`);
  }
});

test('failed review offers explicit retry until the attempt limit is exhausted', () => {
  const base = {
    viewKind: 'pending' as const,
    version: 'tobe' as const,
    loading: false,
    current: true,
    resultCurrent: false,
    backendKind: 'missing' as const,
    effortKind: 'missing' as const,
    busy: false,
    connected: true,
    retry: true,
    error: '',
  };
  const retry = buildReviewActionPresentation({ ...base, retryAvailable: true });
  assert.equal(retry.kind, 'retry');
  assert.equal(retry.labelKey, 'review.retry');
  assert.equal(retry.descriptionKey, 'review.actionRetryBody');
  assert.equal(retry.disabled, false);

  const exhausted = buildReviewActionPresentation({ ...base, retryAvailable: false });
  assert.equal(exhausted.kind, 'unavailable');
  assert.equal(exhausted.descriptionKey, 'review.actionRetryExhausted');
  assert.equal(exhausted.disabled, true);
});

test('review action placements share one state, announce one error and deduplicate while busy', () => {
  const input = {
    viewKind: 'pending' as const,
    version: 'tobe' as const,
    loading: false,
    current: true,
    resultCurrent: false,
    backendKind: 'stale' as const,
    effortKind: 'missing' as const,
    busy: false,
    connected: true,
    error: '',
  };
  const available = buildReviewActionPresentation(input);
  assert.equal(available.disabled, false);
  const placements = buildReviewActionPlacements(available);
  assert.equal(placements.length, 2);
  assert.equal(placements[0].action, placements[1].action);
  assert.equal(placements.filter(block => block.announceError).length, 1);
  assert.deepEqual(beginReviewPrimaryAction(available), { accepted: true, busy: true });
  const busy = buildReviewActionPresentation({ ...input, busy: true, error: 'review failed' });
  assert.equal(busy.disabled, true);
  assert.equal(busy.labelKey, 'review.actionBusy');
  assert.equal(busy.error, 'review failed');
  assert.deepEqual(beginReviewPrimaryAction(busy), { accepted: false, busy: true });
});

test('equal ids in future and removed keep expansion and ancestor closing scoped', () => {
  const root = (childId: string): ReviewTreeNode => ({
    id: 'same-root', kind: 'hub', label: 'Root', action: 'keep',
    children: [{ id: childId, kind: 'page', label: childId, action: 'keep', children: [] }],
  });
  const scoped: ReviewView = {
    ...view(),
    tree: [root('future-child')],
    removed: [root('removed-child')],
    selectedId: 'removed-child',
    selectedScope: 'removed',
    selected: null,
  };
  const futureKey = reviewExpansionKey('future', 'same-root');
  const removedKey = reviewExpansionKey('removed', 'same-root');
  assert.notEqual(futureKey, removedKey);
  const automatic = openReviewExpansionKeys([], scoped);
  assert.equal(automatic.has(futureKey), false);
  assert.equal(automatic.has(removedKey), true);

  const futureOpened = toggleReviewExpansion([], scoped, 'same-root', 'future');
  assert.deepEqual(futureOpened.expandedKeys, [futureKey]);
  assert.equal(futureOpened.selectedId, 'removed-child');
  const removedClosed = toggleReviewExpansion(futureOpened.expandedKeys, scoped, 'same-root', 'removed');
  assert.deepEqual(removedClosed.expandedKeys, [futureKey]);
  assert.equal(removedClosed.selectedId, '');
});

test('empty or unknown selection opens the first authorities actor, not Todos', () => {
  const first = view({ selectedActor: '' });
  assert.equal(first.selectedActor, 'actor:profissional');
  assert.deepEqual(labels(first.tree), ['Início', 'Minha agenda', 'Meu cadastro']);
  assert.deepEqual(first.removed, []);
  assert.equal(first.tree[2].children.length, 1);

  const unknown = view({ selectedActor: 'actor:ghost' });
  assert.equal(unknown.selectedActor, 'actor:profissional');
  assert.deepEqual(unknown.removed, []);

  const everyone = view({ selectedActor: REVIEW_ALL_ACTORS });
  assert.equal(everyone.selectedActor, REVIEW_ALL_ACTORS);
  assert.equal(everyone.removed.length, 1);
  assert.equal(resolveSelectedActor(first.actors, ''), 'actor:profissional');
  assert.equal(resolveSelectedActor(first.actors, REVIEW_ALL_ACTORS), REVIEW_ALL_ACTORS);
});

test('actor filter uses authorities order, inherits hub descendants and promotes orphans', () => {
  const parsed = parseReviewMenu(menu);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const professional = view({ selectedActor: 'actor:profissional' });
  assert.deepEqual(professional.actors.map(actor => actor.key), ['actor:profissional', 'actor:recepcionista']);
  assert.deepEqual(professional.actors.map(actor => actor.actorId), ['profissional', 'recepcionista']);
  assert.deepEqual(labels(professional.tree), ['Início', 'Minha agenda', 'Meu cadastro']);
  assert.equal(professional.tree[2].children[0].label, 'Documentos');
  assert.equal(professional.tree[2].children[0].children[0].label, 'Meus dados profissionais');
  assert.equal(professional.tree[2].children[0].children[0].action, 'new');
  assert.deepEqual(professional.removed, []);
  assert.ok(find(menuTreeForActor(parsed.menu, 'actor:profissional'), 'perfil_profissional'));

  const receptionist = view({ selectedActor: 'actor:recepcionista' });
  assert.deepEqual(labels(receptionist.tree), ['Início recepção', 'Pacientes']);
  assert.equal(receptionist.tree[1].kind, 'page');
  assert.equal(find(menuTreeForActor(parsed.menu, 'actor:recepcionista'), 'hidden_hub'), undefined);
});

test('keep stays gray-distinct from change; new is inherited; remove lives only in the removed forest', () => {
  const professional = view({ selectedActor: 'actor:profissional' });
  assert.equal(professional.tree[0].action, 'keep');
  assert.equal(professional.tree[1].action, 'change');
  assert.notEqual(professional.tree[0].action, professional.tree[1].action);
  assert.equal(professional.tree[2].action, 'new');
  const all = view({ selectedId: 'central_profissional', selectedScope: 'removed' });
  assert.equal(all.selected?.scope, 'removed');
  assert.equal(all.selected?.action, 'remove');
  assert.equal(all.selected?.label, 'Minha agenda antiga');
  assert.match(all.selected?.text || '', /Hub anterior/);
});

test('selecting a page, hub or group returns the descriptions of that node', () => {
  const page = view({ selectedActor: 'actor:profissional', selectedId: 'agenda_diaria' });
  assert.equal(page.selected?.kind, 'page');
  assert.deepEqual(page.selected?.organisms.map(item => item.kind), ['list', 'form']);
  const hub = view({ selectedActor: 'actor:profissional', selectedId: 'meu_perfil_profissional' });
  assert.equal(hub.selected?.kind, 'hub');
  assert.equal(hub.selected?.context, 'Profissional');
  const group = view({ selectedActor: 'actor:profissional', selectedId: 'docs_profissional' });
  assert.equal(group.selected?.kind, 'group');
  assert.equal(group.selected?.text, 'Pastas de documentos profissionais.');
});

test('missing and invalid JSON become UI states without continue', () => {
  const missing = view({ readStatus: 'missing', raw: undefined });
  assert.equal(missing.kind, 'empty');
  assert.equal(missing.showContinue, false);
  assert.equal(missing.tree.length, 0);

  const badJson = view({ readStatus: 'invalid', raw: menu });
  assert.equal(badJson.kind, 'invalid');
  assert.equal(badJson.errorCode, 'review.error.invalid');
  assert.equal(badJson.showContinue, false);

  const unknown = view({ raw: { ...menu, schemaVersion: '2026-01-01-old' } });
  assert.equal(unknown.kind, 'invalid');
  assert.equal(unknown.errorCode, 'review.error.schema');

  const malformed = view({ raw: { schemaVersion: MENU_SCHEMA_VERSION, tree: 'nope' } });
  assert.equal(malformed.kind, 'invalid');
  assert.equal(parseReviewMenu(null).ok, false);
});

test('pending tobe changes hide the menu even when a valid menu is present', () => {
  const pending = view({ pendingCount: 2, selectedActor: 'actor:profissional', selectedId: 'agenda_diaria' });
  assert.equal(pending.kind, 'pending');
  assert.equal(pending.showCalculate, true);
  assert.equal(pending.showContinue, false);
  assert.deepEqual(pending.tree, []);
  assert.deepEqual(pending.removed, []);
  assert.equal(pending.selected, null);
  assert.equal(pending.actors.length, 0);
});

test('actor key strips the actor: prefix', () => {
  assert.equal(actorIdFromKey('actor:profissional'), 'profissional');
  assert.equal(actorIdFromKey('recepcionista'), 'recepcionista');
});
