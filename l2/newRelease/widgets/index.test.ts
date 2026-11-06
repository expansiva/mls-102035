import test from 'node:test';
import assert from 'node:assert/strict';

const documentStub = globalThis.document as Document & Record<string, unknown>;
documentStub.createTreeWalker = (() => ({ nextNode: () => null, currentNode: null })) as never;
documentStub.createElement = ((tag: string) => ({ tagName: tag.toUpperCase(), textContent: '' })) as never;
documentStub.createComment = (() => ({})) as never;
documentStub.head = { querySelector: () => null, appendChild: () => undefined } as never;
(globalThis as unknown as { window: typeof globalThis }).window = globalThis;
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => key === 'collabMessages_userId' ? null : JSON.stringify({ userId: 'user-1' }),
} as Storage;
if (!globalThis.customElements) (globalThis as unknown as { customElements: unknown }).customElements = { define() {}, get() {} };
if (!globalThis.HTMLElement) (globalThis as unknown as { HTMLElement: unknown }).HTMLElement = class extends EventTarget {};

const loader = require('node:module') as { _load: (request: string, ...args: unknown[]) => any };
const previousLoad = loader._load;
let indexModule: typeof import('./index.ts');
try {
  loader._load = function (request, ...args) {
    if (request === 'lit/decorators.js') return { customElement: () => () => undefined,
      property: () => () => undefined, state: () => () => undefined, query: () => () => undefined };
    return previousLoad.call(this, request, ...args);
  };
  indexModule = require('./index.ts');
} finally { loader._load = previousLoad; }

function templateText(value: any): string {
  if (value?.strings) return value.strings.reduce((text: string, part: string, index: number) => text + part + templateText(value.values[index]), '');
  return Array.isArray(value) ? value.map(templateText).join('') : typeof value === 'string' ? value : '';
}

test('selected module with an unreadable snapshot shows its read error instead of the no-module screen', async () => {
  const { createNewReleaseTranslator, loadNewReleaseMessages } = await import('../helpers/i18n.ts');
  const index = new indexModule.NewReleaseIndex102035() as unknown as Record<string, any>;
  index.t = createNewReleaseTranslator(await loadNewReleaseMessages(102035, 'pt'));
  assert.match(templateText(index.renderEmpty()), /Nenhum módulo de nível 4 encontrado/);
  index.project = 102047;
  index.moduleName = 'tarefas';
  index.mutationError = 'Historical release is incomplete.';
  const view = templateText(index.renderEmpty());
  assert.match(view, /Não foi possível carregar este módulo/);
  assert.match(view, /Historical release is incomplete/);
  assert.doesNotMatch(view, /Nenhum módulo de nível 4 encontrado/);
});

test('active implementation keeps content readable and blocks editing until the stored record clears', async () => {
  const index = new indexModule.NewReleaseIndex102035() as unknown as Record<string, any>;
  index.project = 102047;
  index.moduleName = 'tarefas';
  index.version = 'tobe';
  index.activeTab = 'rules';
  index.activeEditor = () => null;
  index.implementationReader = async () => ({ changeId: 'change1' });
  await index.refreshImplementationLock();
  assert.equal(index.implementationActive, true);
  assert.match(templateText(index.renderTabContent()), /release:implementation-active/);
  assert.doesNotMatch(templateText(index.renderCommonControls()), /common\.prompt/);
  assert.equal(templateText(index.renderRequest()), '');
  index.requestText = 'Novo pedido';
  assert.equal(index.canSubmitRequest(), false);
  let blocked = '';
  index.onArtifactChanged({ preventDefault() {}, detail: { path: 'rules.defs.ts', complete: (error: Error) => { blocked = error.message; } } });
  assert.equal(blocked, 'request.applicationActive');
  index.activeTab = 'review';
  assert.match(templateText(index.renderTabContent()), /tobe/);
  index.presentation = 'prompt';
  index.onImplementationState({ detail: { project: 102047, moduleName: 'tarefas', active: true } });
  assert.equal(index.presentation, 'graph');
  index.implementationReader = async () => null;
  await index.refreshImplementationLock();
  assert.equal(index.implementationActive, false);
  index.activeTab = 'rules';
  assert.match(templateText(index.renderTabContent()), /tobe/);
  assert.equal(index.canSubmitRequest(), true);
  index.implementationReader = async () => { throw new Error('read failed'); };
  await index.refreshImplementationLock();
  assert.equal(index.implementationActive, true);
  assert.equal(index.mutationError, 'read failed');
});

test('confirmed snapshot keeps graph and text navigation but hides prompt and discard', () => {
  const index = new indexModule.NewReleaseIndex102035() as unknown as Record<string, any>;
  index.project = 102047;
  index.moduleName = 'tarefas';
  index.version = 'release:snap-change1';
  index.activeTab = 'rules';
  index.activeEditor = () => null;
  index.implementationActive = true;
  index.data = { confirmedRound: { changeId: 'change1', revisionId: 'rev1', sourceBaseId: 'base1', confirmedAt: '', confirmedBy: '' },
    diffs: [{ path: 'rules.defs.ts', entries: [{ jsonPath: '$.rules.one', before: 'A', after: 'B' }] }] };
  assert.match(templateText(index.renderTabContent()), /release:snap-change1/);
  assert.doesNotMatch(templateText(index.renderCommonControls()), /common\.prompt/);
  assert.equal(templateText(index.renderRequest()), '');
  index.activeTab = 'review';
  const changed = templateText(index.renderDiffs());
  assert.match(changed, /common\.copy/);
  assert.doesNotMatch(changed, /tobe\.discardPath|review\.clearChanges/);
});

test('change request controls do not submit empty text and clear prior-tab feedback', async () => {
  const index = new indexModule.NewReleaseIndex102035() as unknown as Record<string, any>;
  index.activeTab = 'journeys';
  index.savedRequest = '';
  index.requestText = '';
  assert.match(templateText(index.renderRequest()), /request\.unsaved/);
  index.savedRequest = 'Pedido anterior';
  index.requestText = '   ';
  assert.equal(index.canSubmitRequest(), false);
  index.requestText = 'Pedido anterior';
  assert.equal(index.canSubmitRequest(), false);
  index.requestText = 'Novo pedido';
  assert.equal(index.canSubmitRequest(), true);
  index.requestText = '   ';
  index.requestNeedsRetry = true;
  assert.equal(index.canSubmitRequest(), false);
  index.requestNeedsRetry = false;
  index.requestReady = true;
  index.requestText = '';
  assert.match(templateText(index.renderRequest()), /request\.ready/);
  index.requestText = 'Pedido anterior';
  assert.equal(index.canSubmitRequest(), true);

  index.requestResult = 'Arquivos gravados';
  index.requestFileStates = [{ path: 'rules.defs.ts', state: 'changed' }];
  index.requestError = 'Erro anterior';
  index.requestFeedbackTab = 'journeys';
  index.canLeaveTab = () => true;
  index.activeEditor = () => null;
  await index.activateTab('rules');
  assert.equal(index.requestResult, '');
  assert.deepEqual(index.requestFileStates, []);
  assert.equal(index.requestError, '');
  assert.equal(index.requestFeedbackTab, null);
  index.requestResult = 'Resultado tardio da jornada';
  index.requestError = 'Erro tardio da jornada';
  assert.doesNotMatch(templateText(index.renderRequest()), /tardio da jornada/);
});

test('prompt progress ends visual wait at 10 minutes, but keeps another prompt blocked', async () => {
  const { createNewReleaseTranslator, loadNewReleaseMessages } = await import('../helpers/i18n.ts');
  const index = new indexModule.NewReleaseIndex102035() as unknown as Record<string, any>;
  index.t = createNewReleaseTranslator(await loadNewReleaseMessages(102035, 'pt'));
  index.project = 102047;
  index.moduleName = 'tarefas';
  index.version = 'tobe';
  index.activeTab = 'journeys';
  index.requestText = 'Alterar regra';
  index.requestBusy = true;
  index.canLeaveTab = () => true;
  index.activeEditor = () => null;
  const originalTimeout = globalThis.setTimeout;
  const originalInterval = globalThis.setInterval;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalClearInterval = globalThis.clearInterval;
  let expire: (() => void) | undefined;
  let timeoutMs = 0;
  try {
    globalThis.setTimeout = ((callback: () => void, delay: number) => {
      expire = callback;
      timeoutMs = delay;
      return 91;
    }) as typeof setTimeout;
    globalThis.setInterval = (() => 92) as typeof setInterval;
    globalThis.clearTimeout = (() => undefined) as typeof clearTimeout;
    globalThis.clearInterval = (() => undefined) as typeof clearInterval;
    index.startRequestProgress({ project: 102047, moduleName: 'tarefas', version: 'tobe' });
    assert.equal(timeoutMs, 600_000);
    assert.match(templateText(index.renderRequestProgress()), /role="dialog"/);
    assert.match(templateText(index.renderRequestProgress()), /<progress max="600"/);
    await index.activateTab('rules');
    assert.equal(index.activeTab, 'journeys');
    expire?.();
    assert.equal(index.requestTimedOut, true);
    assert.match(index.requestError, /não respondeu após 10 minutos/i);
    assert.equal(templateText(index.renderRequestProgress()), '');
    assert.equal(index.requestBusy, true);
    assert.match(templateText(index.renderRequest()), /Limite de espera atingido/);
    await index.activateTab('rules');
    assert.equal(index.activeTab, 'rules');
    await index.activateTab('journeys');
    assert.match(index.requestError, /não respondeu após 10 minutos/i);
    await index.saveRequest();
    assert.equal(index.requestBusy, true);
    index.stopRequestProgress();
    assert.equal(index.requestTimedOut, false);
  } finally {
    globalThis.setTimeout = originalTimeout;
    globalThis.setInterval = originalInterval;
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.clearInterval = originalClearInterval;
  }
});


test('prompt result displays assumptions separately and in the active language', async () => {
  const { createNewReleaseTranslator, loadNewReleaseMessages } = await import('../helpers/i18n.ts');
  const index = new indexModule.NewReleaseIndex102035() as unknown as Record<string, any>;
  index.t = createNewReleaseTranslator(await loadNewReleaseMessages(102035, 'pt'));
  index.activeTab = 'journeys';
  index.requestFeedbackTab = 'journeys';
  index.requestResult = 'Jornada adicionada';
  index.requestAssumptions = ['ator: membro da equipe', 'escopo: próprio'];
  const view = templateText(index.renderRequest());
  assert.match(view, /Jornada adicionada/);
  assert.match(view, /<strong>Assumi:<\/strong><ul><li>ator: membro da equipe<\/li><li>escopo: próprio<\/li><\/ul>/);
});

test('failed prompt keeps its task card and shows the terminal log once', async () => {
  const index = new indexModule.NewReleaseIndex102035() as unknown as Record<string, any>;
  index.activeTab = 'journeys';
  index.requestFeedbackTab = 'journeys';
  index.requestResult = 'request.failed';
  index.requestError = '';
  index.requestText = 'Correct this request';
  index.requestTask = { id: 'task/#failed', threadId: 'thread-1', messageId: 'thread-1/20261104', cost: null,
    snapshot: { PK: 'task/#failed', SK: 'metadata', owner: 'user-1', status: 'failed', last_updated: 1,
      last_update_log: 'Terminal failure detail', messageid_created: 'thread-1/20261104' } };
  const view = templateText(index.renderRequest());
  assert.match(view, /collab-messages-task-102025[\s\S]*Terminal failure detail/);
  assert.match(view, /Terminal failure detail/);
  assert.equal((view.match(/request\.failed/g) || []).length, 1);
  assert.equal(index.requestTask.snapshot.status, 'failed');
  assert.equal(index.requestText, 'Correct this request');
  let releaseStore!: () => void;
  const stored = new Promise<void>(resolve => { releaseStore = resolve; });
  const next = new indexModule.NewReleaseIndex102035() as unknown as Record<string, any>;
  next.project = 102047;
  next.moduleName = 'tarefas';
  next.version = 'tobe';
  const saving = next.rememberRequestTask(index.requestTask.snapshot,
    { project: 102047, moduleName: 'tarefas', version: 'tobe' }, async () => { await stored; });
  assert.equal(next.requestTask, null);
  releaseStore();
  await saving;
  assert.equal(next.requestTask.snapshot.status, 'failed');
});

test('review counts new warnings and keeps previous observations in closed details', async () => {
  const { createNewReleaseTranslator, loadNewReleaseMessages } = await import('../helpers/i18n.ts');
  for (const [language, title, warnings, errors] of [
    ['en', 'Previous observations: 1', '1 warnings', '1 errors'],
    ['pt', 'Observações anteriores: 1', '1 avisos', '1 erros'],
  ]) {
    const index = new indexModule.NewReleaseIndex102035() as unknown as Record<string, any>;
    index.t = createNewReleaseTranslator(await loadNewReleaseMessages(102035, language));
    index.activeTab = 'review';
    index.version = 'tobe';
    index.data = {
      changeId: 'candidate', manifest: { changes: [], author: 'User', updatedAt: '2026-10-31T12:00:00Z' }, stalePaths: [],
      validation: { issues: [
        { severity: 'warning', artifact: 'workflows.json', path: '$.room', message: 'Previous message', baseline: true },
        { severity: 'warning', artifact: 'journeys.json', path: '$.steps', message: 'New message' },
        { severity: 'error', artifact: 'ontology.json', path: '$', message: 'Error message', baseline: true },
      ] },
    };
    const status = templateText(index.renderTobeStatus());
    assert.ok(status.includes(warnings), status);
    assert.ok(status.includes(errors), status);
    assert.ok(status.includes(`<span>${title}</span>`), status);
    const log = templateText(index.renderValidationLog());
    const [main, previous] = log.split('<details');
    assert.match(main, /New message/);
    assert.match(main, /Error message/);
    assert.doesNotMatch(main, /Previous message/);
    assert.ok(previous.includes(`<summary>${title}</summary>`));
    assert.match(previous, /workflows.json · \$\.room/);
    assert.match(previous, /Previous message/);
    assert.doesNotMatch(previous, /\bopen(?:=|\s|>)/);
    assert.doesNotMatch(previous, /is-warning/);
    index.data.validation.issues = [index.data.validation.issues[0]];
    assert.doesNotMatch(templateText(index.renderValidationLog()), /No warnings|Nenhum aviso/);
    index.data.validation.issues = [];
    assert.doesNotMatch(templateText(index.renderValidationLog()), /<details/);
  }
});

test('What changed shows the recorded prompt and full value for its exact path', async () => {
  const { createNewReleaseTranslator, loadNewReleaseMessages } = await import('../helpers/i18n.ts');
  const index = new indexModule.NewReleaseIndex102035() as unknown as Record<string, any>;
  index.t = createNewReleaseTranslator(await loadNewReleaseMessages(102035, 'pt'));
  index.activeTab = 'review';
  index.version = 'asis';
  index.data = { diffs: [{ path: 'rules.defs.ts', entries: [{ jsonPath: '$.rules.a', before: 'texto anterior', after: 'texto novo completo' }] }] };
  index.changeOrigins = [{ source: 'prompt', at: '2026-11-02T10:00:00.000Z', request: 'Altere a regra a', taskId: 'task1', changes: [{ file: 'rules.defs.ts', jsonPath: '$.rules.a' }] }];
  const view = templateText(index.renderDiffs());
  assert.match(view, /Pedido em/);
  assert.match(view, /Altere a regra a/);
  assert.match(view, /Abrir task task1/);
  assert.match(view, /texto novo completo/);
});

test('Copy in What changed includes untruncated values and the prompt origin', async () => {
  const { createNewReleaseTranslator, loadNewReleaseMessages } = await import('../helpers/i18n.ts');
  const index = new indexModule.NewReleaseIndex102035() as unknown as Record<string, any>;
  index.t = createNewReleaseTranslator(await loadNewReleaseMessages(102035, 'pt'));
  index.activeTab = 'review';
  index.version = 'tobe';
  index.data = { changeId: 'change', diffs: [{ path: 'rules.defs.ts', entries: [
    { jsonPath: '$.rules.a', before: 'antes', after: 'x'.repeat(250) },
  ] }] };
  index.changeOrigins = [{ source: 'prompt', at: '2026-11-02T10:00:00.000Z', request: 'Altere a regra a', taskId: 'task1',
    changes: [{ file: 'rules.defs.ts', jsonPath: '$.rules.a' }] }];
  const copied: string[] = [];
  const prior = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { copied.push(value); } } });
  try {
    assert.match(templateText(index.renderDiffs()), /Copiar/);
    await index.copyDiffs();
    assert.equal(copied.length, 1);
    assert.match(copied[0], /rules\.defs\.ts/);
    assert.match(copied[0], /\$\.rules\.a/);
    assert.match(copied[0], new RegExp('x'.repeat(250)));
    assert.match(copied[0], /Altere a regra a/);
    assert.match(copied[0], /task1/);
    assert.match(index.diffCopyFeedback, /Copiado/);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied'); } } });
    await index.copyDiffs();
    assert.match(index.diffCopyFeedback, /Não foi possível copiar/);
  } finally {
    if (prior) Object.defineProperty(navigator, 'clipboard', prior);
    else delete (navigator as { clipboard?: unknown }).clipboard;
  }
});

test('openOriginTask opens the module thread', async () => {
  const index = new indexModule.NewReleaseIndex102035() as unknown as Record<string, any>;
  index.project = 102047;
  index.moduleName = 'comanda';
  index.t = (key: string, values?: Record<string, string>) => key + (values?.reason ? `:${values.reason}` : '');
  const opened: string[] = [];
  index.moduleThread = async (project: number, moduleName: string) => {
    assert.deepEqual([project, moduleName], [102047, 'comanda']);
    return { threadId: 'thread-comanda' };
  };
  index.openThread = (threadId: string, taskId: string) => { opened.push(`${threadId}/${taskId}`); };
  await index.openOriginTask('task-9');
  assert.deepEqual(opened, ['thread-comanda/task-9']);
  index.moduleThread = async () => { throw new Error('new-release.thread_invalid:not a token'); };
  await index.openOriginTask('task-9');
  assert.equal(index.mutationError, 'request.threadInvalid:not a token');
});

test('review shows its empty state only once', () => {
  const index = new indexModule.NewReleaseIndex102035() as unknown as Record<string, any>;
  index.activeTab = 'review';
  index.version = 'tobe';
  index.data = { module: { moduleName: 'sample' }, diffs: [], errors: [] };
  index.t = (key: string) => key;
  index.renderTabs = () => '';
  index.renderTobeStatus = () => '';
  index.renderCommonControls = () => '';
  index.renderTabContent = () => '';
  const view = templateText(index.render());
  assert.doesNotMatch(view, /nr-index__changes-summary/);
});
