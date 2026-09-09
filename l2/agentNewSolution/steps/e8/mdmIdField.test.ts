/// <mls fileReference="_102035_/l2/agentNewSolution/steps/e8/mdmIdField.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNs4E8Model } from '/_102035_/l2/agentNewSolution/steps/e8/modelGate.js';
import { NS4_E8_MODEL_VERSION, type Ns4E8Model } from '/_102035_/l2/agentNewSolution/steps/e8/model.js';
import type { Ns4E8Sources } from '/_102035_/l2/agentNewSolution/steps/e8/contracts.js';

function mdmSources(): Ns4E8Sources {
  return {
    journeys: { moduleName: 'mod', journeys: [], features: [] },
    ontology: {
      moduleName: 'mod',
      entities: [{
        entityId: 'Produto',
        kind: 'mdm',
        fields: [{ fieldId: 'precoVigente' }, { fieldId: 'disponivel' }],
        storage: { target: 'mdm', idField: 'produtoId' },
      }],
      relationships: [],
    },
    access: { profiles: [] },
    useCases: [],
    workflows: [],
  } as unknown as Ns4E8Sources;
}

function modelWithInput(fieldId: string): Ns4E8Model {
  return {
    planId: 'e8-workspace-model',
    schemaVersion: NS4_E8_MODEL_VERSION,
    moduleName: 'mod',
    userLanguage: 'pt-BR',
    title: 'Workspaces',
    reviewRound: 1,
    hubEntity: 'Produto',
    workspaces: [],
    operations: [{
      operationId: 'selectProduto',
      title: 'Selecionar produto',
      kind: 'command',
      entityRef: 'Produto',
      entityRefs: ['Produto'],
      accessPattern: { kind: 'commandInput' },
      inputs: [{
        inputId: fieldId,
        fieldRef: { entityId: 'Produto', fieldId },
        source: 'selectedEntity',
        required: true,
        description: 'Produto.',
      }],
      outputRefs: [],
      useRules: [],
      transitionRefs: [],
      story: ['Selecionar'],
    }],
    menu: [],
    landings: [],
    systemDecisions: [],
  };
}

test('mdm storage.idField is a resolvable input even when it is absent from fields[]', () => {
  const gate = validateNs4E8Model(modelWithInput('produtoId'), mdmSources());
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_INPUT_FIELD'), false, gate.issues.map(issue => issue.message).join('; '));
  assert.equal(gate.ok, true);
});

test('an input that is neither a real field nor storage.idField still fails NS4_E8_INPUT_FIELD', () => {
  const gate = validateNs4E8Model(modelWithInput('campoInexistente'), mdmSources());
  const hit = gate.issues.filter(issue => issue.code === 'NS4_E8_INPUT_FIELD');
  assert.equal(hit.length, 1, gate.issues.map(issue => `${issue.code}:${issue.message}`).join(' | '));
  assert.match(hit[0].message, /Produto\.campoInexistente/);
  assert.equal(gate.ok, false);
});
