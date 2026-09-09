/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/ns4TextPaths.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractI18n,
  injectI18n,
  pathMatches,
  TEXT_PATHS_BY_SCHEMA,
  TEXT_PATHS_VERSION,
  uncoveredNonAscii,
} from '/_102035_/l2/agentNewSolution/helpers/ns4TextPaths.js';
import { TEXT_PATHS_2026_08_09_ns4_rules_v2 } from '/_102035_/l2/agentNewSolution/steps/e5/contracts.js';
import { NS4_RULES_SCHEMA_VERSION } from '/_102035_/l2/agentNewSolution/steps/e5/contracts.js';

test('textPaths patterns match concrete JSON paths including dotted phrase keys', () => {
  assert.equal(pathMatches('rules[0].description', 'rules[].description'), true);
  assert.equal(pathMatches('business.outcome.evidence[1]', 'business.outcome.evidence[]'), true);
  assert.equal(pathMatches('presentation.phrases["catalogue.list.title"]', 'presentation.phrases.*'), true);
  assert.equal(pathMatches('presentation.stepTitles["e1-clarification"]', 'presentation.stepTitles.*'), true);
  assert.equal(pathMatches('module.moduleName', 'module.title'), false);
});

test('extract and inject round-trip the declared human fields', () => {
  const artifact = {
    schemaVersion: NS4_RULES_SCHEMA_VERSION,
    rules: [{ id: 'clienteSoloConsultaSusOrdenes', description: 'El cliente ve sólo sus órdenes.' }],
    rulesHash: 'sha256:00',
  };
  const i18n = extractI18n(artifact, TEXT_PATHS_2026_08_09_ns4_rules_v2);
  assert.deepEqual(i18n, { 'rules[0].description': 'El cliente ve sólo sus órdenes.' });
  const translated = injectI18n(artifact, { 'rules[0].description': 'The customer sees only their orders.' });
  assert.equal(translated.rules[0].description, 'The customer sees only their orders.');
  assert.equal(translated.rules[0].id, 'clienteSoloConsultaSusOrdenes');
});

test('uncoveredNonAscii lists human text that is not under a textPath', () => {
  const leaked = { rules: [{ id: 'x', description: 'ok' }], leaked: 'señal oculta' };
  const hits = uncoveredNonAscii(leaked, TEXT_PATHS_2026_08_09_ns4_rules_v2);
  assert.deepEqual(hits.map(hit => hit.path), ['leaked']);
  assert.equal(TEXT_PATHS_BY_SCHEMA[NS4_RULES_SCHEMA_VERSION], TEXT_PATHS_2026_08_09_ns4_rules_v2);
  assert.equal(TEXT_PATHS_VERSION, '2026-09-09-n14');
});
