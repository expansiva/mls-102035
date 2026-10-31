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
