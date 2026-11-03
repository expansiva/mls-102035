import test from 'node:test';
import assert from 'node:assert/strict';

const documentStub = globalThis.document as Document & Record<string, unknown>;
documentStub.createTreeWalker = (() => ({ nextNode: () => null, currentNode: null })) as never;
documentStub.createElement = ((tag: string) => ({ tagName: tag.toUpperCase(), textContent: '' })) as never;
documentStub.createComment = (() => ({})) as never;
documentStub.head = { querySelector: () => null, appendChild: () => undefined } as never;
(globalThis as unknown as { window: typeof globalThis }).window = globalThis;
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

test('prompt progress blocks navigation and shows a recoverable 10 minute limit', async () => {
  const { createNewReleaseTranslator, loadNewReleaseMessages } = await import('../helpers/i18n.ts');
  const index = new indexModule.NewReleaseIndex102035() as unknown as Record<string, any>;
  index.t = createNewReleaseTranslator(await loadNewReleaseMessages(102035, 'pt'));
  index.project = 102047;
  index.moduleName = 'tarefas';
  index.version = 'tobe';
  index.activeTab = 'journeys';
  index.requestText = 'Alterar regra';
  index.requestBusy = true;
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
    assert.match(templateText(index.renderRequestProgress()), /Limite de espera atingido/);
    assert.doesNotMatch(templateText(index.renderRequestProgress()), /<progress/);
    assert.equal(index.requestBusy, true);
    assert.match(templateText(index.renderRequest()), /Limite de espera atingido/);
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
