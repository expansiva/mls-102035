/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/promptSummary.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  promptChangeSummary,
  promptHoldSummary,
  type PromptSummaryFile,
} from '/_102035_/l2/agentNewReleasePrompt/helpers/promptSummary.js';

const entity = (title: string, state: PromptSummaryFile['state']): PromptSummaryFile => ({
  file: `ontology/${title}.defs.ts`,
  state,
  before: state === 'added' ? undefined : { title, entityId: title },
  after: state === 'removed' ? undefined : { title, entityId: title },
  diffs: [{ jsonPath: '$.title', ...(state === 'added' ? { after: title } : {}), ...(state === 'removed' ? { before: title } : { before: title, after: title }) }],
});

void test('prompt summary names added, changed and removed artifacts in pt and en', () => {
  const files: PromptSummaryFile[] = [
    entity('Mesa', 'changed'),
    {
      file: 'journeys/anotarPedido.defs.ts',
      state: 'added',
      after: { journeyId: 'anotarPedido', business: { title: 'Anotar pedido' } },
      diffs: [{ jsonPath: '$', after: { journeyId: 'anotarPedido' } }],
    },
    {
      file: 'rules.defs.ts',
      state: 'changed',
      before: { rules: [{ ruleId: 'fechaComanda' }] },
      after: { rules: [] },
      diffs: [{ jsonPath: '$.rules[ruleId=fechaComanda]', before: { ruleId: 'fechaComanda' } }],
    },
    {
      file: 'access.defs.ts',
      state: 'changed',
      diffs: [{ jsonPath: '$.grants[grantId=garcomAtendimento].title', before: 'a', after: 'b' }],
    },
  ];
  assert.equal(promptChangeSummary('pt-BR', files), [
    'Mesa mudou',
    'Anotar pedido entrou',
    'fechaComanda saiu',
    'garcomAtendimento mudou',
  ].join('\n'));
  assert.equal(promptChangeSummary('en', [entity('Table', 'added')]), 'Table added');
  assert.equal(promptChangeSummary(undefined, [entity('Table', 'removed')]), 'Table removed');
});

void test('prompt summary keeps six lines and counts the rest', () => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(title => entity(title, 'changed'));
  const text = promptChangeSummary('pt', files);
  assert.equal(text.split('\n').length, 6);
  assert.match(text, /e mais 2$/u);
  assert.equal(promptChangeSummary('en', files).split('\n').at(-1), 'and 2 more');
});

void test('a question or a refusal is the summary and is not a change report', () => {
  const question = promptHoldSummary('O campo statusAtendimento deve aparecer para o ator garçom?');
  const reason = promptHoldSummary('The request does not say which actor performs the step.');
  assert.equal(question.includes('alterado'), false);
  assert.equal(reason.includes('changed'), false);
  assert.match(question, /statusAtendimento/);
  assert.match(reason, /which actor/);
});
