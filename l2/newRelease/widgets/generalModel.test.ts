/// <mls fileReference="_102035_/l2/newRelease/widgets/generalModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ns5ModuleArtifact } from '../../solution/types.js';
import {
  addGeneralDetail,
  generalOracleTab,
  initialGeneralDetailDescription,
  removeGeneralDetail,
  setGeneralLanguages,
} from './generalModel.js';

const moduleFixture: Ns5ModuleArtifact = {
  schemaVersion: '2026-09-10-ns5-module-v2',
  moduleName: 'agendaClinica',
  title: 'Agenda clínica',
  userLanguage: 'pt-BR',
  productLanguages: ['pt-BR'],
  defaultLanguage: 'pt-BR',
  sourcePrompt: 'Criar a agenda clínica.',
};

test('general language editor keeps unique product languages and a valid default', () => {
  const changed = setGeneralLanguages(moduleFixture, ['pt-BR', 'es', 'pt-BR'], 'es');
  assert.deepEqual(changed.productLanguages, ['pt-BR', 'es']);
  assert.equal(changed.defaultLanguage, 'es');

  const fallback = setGeneralLanguages(changed, ['pt-BR'], 'es');
  assert.equal(fallback.defaultLanguage, 'pt-BR');
});

test('general details accept lowerCamel keys and preserve readonly descriptions', () => {
  const added = addGeneralDetail(moduleFixture, 'totalDoDia', 'integer');
  assert.equal(added.details?.totalDoDia.type, 'integer');
  assert.equal(added.details?.totalDoDia.description, 'Resumo de Total Do Dia para este módulo.');
  assert.equal(addGeneralDetail(added, 'Total inválido', 'string'), added);

  const removed = removeGeneralDetail(added, 'totalDoDia');
  assert.equal(removed.details, undefined);
});

test('automatic detail descriptions follow the module request language', () => {
  assert.equal(initialGeneralDetailDescription('importeTotal', 'es'), 'Resumen de Importe Total para este módulo.');
  assert.equal(initialGeneralDetailDescription('openPositions', 'en'), 'Module-level summary for Open Positions.');
});

test('oracle checks navigate to the tab that owns the relevant source', () => {
  assert.equal(generalOracleTab('I2'), 'journeys');
  assert.equal(generalOracleTab('I4'), 'rules');
  assert.equal(generalOracleTab('I6'), 'workflows');
  assert.equal(generalOracleTab('I9'), 'ontology');
  assert.equal(generalOracleTab('I12'), 'integration');
  assert.equal(generalOracleTab('I13'), 'access');
});
