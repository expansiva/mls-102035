/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/promptSummary.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { tobeDiff } from '/_102035_/l2/solution/candidate/tobeDiff.js';
import {
  promptAssumptionsLine,
  promptChangeSummary,
  promptHoldSummary,
  promptTwinSummary,
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
    'Adicionada: Anotar pedido',
    'Alterada: Mesa, garcomAtendimento',
    'Removida: fechaComanda',
  ].join('\n'));
  assert.equal(promptChangeSummary('en', [entity('Table', 'added')]), 'Added: Table');
  assert.equal(promptChangeSummary(undefined, [entity('Table', 'removed')]), 'Removed: Table');
});

void test('prompt summary keeps six lines and counts the rest', () => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(title => entity(title, 'changed'));
  const text = promptChangeSummary('pt', files);
  assert.equal(text, 'Alterada: a, b, c, d, e\ne mais 2');
  assert.equal(promptChangeSummary('en', files).split('\n').at(-1), 'and 2 more');
});

void test('a question or a refusal is the summary and is not a change report', () => {
  const question = promptHoldSummary('O campo statusAtendimento deve aparecer para o ator garçom?', 'pt-BR');
  const reason = promptHoldSummary('The request does not say which actor performs the step.', 'en');
  const refused = promptHoldSummary('Repair of rules left the same errors. Nothing was written.', 'pt');
  assert.equal(question.includes('alterado'), false);
  assert.equal(reason.includes('changed'), false);
  assert.equal(refused.includes('alterado'), false);
  assert.match(question, /statusAtendimento/);
  assert.match(reason, /which actor/);
  assert.equal(refused, 'O reparo de rules deixou os mesmos erros. Nada foi gravado.');
  assert.equal(
    promptHoldSummary('Verification failed. Nothing was written.', 'en'),
    'Verification failed. Nothing was written.',
  );
});

void test('a rules map is named by its keys, and a grant stays a list', () => {
  const before = {
    schemaVersion: '2026-09-16-ns5-rules-v2',
    moduleName: 'comandaRestaurante',
    rules: {
      itemComandaOperacaoSomenteComandaAberta: 'Um item lançado só pode ser cancelado enquanto sua comanda estiver aberta.',
      fechaComanda: 'Fecha.',
    },
  };
  const after = {
    ...before,
    rules: {
      itemComandaOperacaoSomenteComandaAberta: 'Um item só pode ser cancelado com a comanda aberta.',
      abreMesa: 'Abre a mesa.',
    },
  };
  const diffs = tobeDiff(before, after);
  assert.equal(diffs.some(entry => entry.jsonPath === '$.rules.itemComandaOperacaoSomenteComandaAberta'), true);
  assert.equal(diffs.some(entry => entry.jsonPath.includes('[ruleId=')), false);
  const text = promptChangeSummary('pt', [{
    file: 'rules.defs.ts',
    state: 'changed',
    before,
    after,
    diffs,
  }, {
    file: 'access.defs.ts',
    state: 'changed',
    before: { grants: [{ grantId: 'garcomAtendimentoComandas' }] },
    after: { grants: [{ grantId: 'garcomAtendimentoComandas' }, { grantId: 'caixaFechamento' }] },
    diffs: [{ jsonPath: '$.grants[grantId=caixaFechamento]', after: { grantId: 'caixaFechamento' } }],
  }]);
  assert.equal(text, [
    'Adicionada: abreMesa, caixaFechamento',
    'Alterada: itemComandaOperacaoSomenteComandaAberta',
    'Removida: fechaComanda',
  ].join('\n'));
  assert.equal(text.includes('rules changed'), false);
});

void test('the assumptions line is empty without assumptions and follows the language', () => {
  assert.equal(promptAssumptionsLine('pt', []), '');
  assert.equal(promptAssumptionsLine('pt-BR', ['a', 'b']), 'Suposições do modelo: a; b');
  assert.equal(promptAssumptionsLine('en', ['a']), 'Model assumptions: a');
  assert.equal(promptAssumptionsLine(null, ['a']), 'Model assumptions: a');
});

void test('a journey that changed is not reported as new, whatever the model assumed', () => {
  const summary = promptChangeSummary('pt', [{
    file: 'journeys/minhasTarefas.defs.ts',
    state: 'changed',
    before: { journeyId: 'minhasTarefas', business: { title: 'minhasTarefas' } },
    after: { journeyId: 'minhasTarefas', business: { title: 'minhasTarefas' } },
    diffs: [{ jsonPath: '$.steps', before: ['verDetalhe'], after: ['listarAtrasadas', 'verDetalhe'] }],
  }]);
  const assumed = promptAssumptionsLine('pt', ['A tela entra como uma jornada nova, separada de minhasTarefas.']);
  assert.equal(summary, 'Alterada: minhasTarefas');
  assert.equal(assumed.startsWith('Suposições do modelo:'), true);
});

void test('a twin request ends with the journey that already exists, in the user language', () => {
  assert.equal(
    promptTwinSummary('pt-BR', ['minhasTarefas']),
    'Já existe a jornada minhasTarefas com o mesmo ator e as mesmas operações. Nada foi gravado. Peça para estender essa jornada (um filtro, uma coluna ou uma ação).',
  );
  assert.equal(
    promptTwinSummary('en', ['a', 'b']),
    'Journeys a, b already do this for the same actor and operations. Nothing was written. Ask to extend one of them (a filter, a column or an action).',
  );
});
