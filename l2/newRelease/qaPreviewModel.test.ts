/// <mls fileReference="_102035_/l2/newRelease/qaPreviewModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNewReleaseQaFixture,
  buildNewReleaseQaMenuFixture,
  canAnnounceQaReady,
  isQaProtectedRequest,
  newReleaseQaScenarios,
  parseNewReleaseQaParams,
  qaScenarioRequiresReview,
} from './qaPreviewModel.js';
import { buildReviewView } from './widgets/reviewModel.js';

test('QA query validates and normalizes the complete public context', () => {
  const parsed = parseNewReleaseQaParams('?project=102047&module=agendaClinica&tab=review&version=release:r-1&lang=en-US&theme=dark&fixture=ready&toolbar=hidden');
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(parsed.value, {
    project: 102047, moduleName: 'agendaClinica', tab: 'review', version: 'release:r-1', language: 'en-US',
    theme: 'dark', fixture: 'ready', toolbar: 'hidden', runAll: false,
  });
  const defaults = parseNewReleaseQaParams('');
  assert.equal(defaults.ok && defaults.value.moduleName, 'agendaClinica');
});

test('every invalid explicit QA parameter is rejected without fallback', () => {
  for (const query of [
    'project=no', 'module=../agenda', 'tab=no', 'version=release:', 'lang=fr', 'theme=blue',
    'fixture=unknown', 'toolbar=no', 'run=one',
  ]) {
    assert.equal(parseNewReleaseQaParams(query).ok, false, query);
  }
});

test('fixtures map to deterministic states without mutation capabilities', () => {
  assert.equal(buildNewReleaseQaFixture('empty', 'agendaClinica').module, null);
  assert.equal(buildNewReleaseQaFixture('error', 'agendaClinica').errors.length, 1);
  assert.equal(buildNewReleaseQaFixture('pending', 'agendaClinica').resultCurrent, false);
  assert.equal(buildNewReleaseQaFixture('ready', 'agendaClinica').resultCurrent, true);
  assert.equal(isQaProtectedRequest('/msg'), true);
  assert.equal(isQaProtectedRequest('/exec/candidate'), true);
  assert.equal(isQaProtectedRequest('/exec/agent'), true);
  assert.equal(isQaProtectedRequest('/agents/agentReviewSolution'), true);
  assert.equal(isQaProtectedRequest('/_102035_/l2/newRelease/i18n/en-US.json'), false);
});

test('automatic matrix is non-empty and covers all required dimensions', () => {
  const scenarios = newReleaseQaScenarios();
  assert.equal(scenarios.length, 120);
  assert.deepEqual(new Set(scenarios.map(item => item.width)), new Set([390, 800, 1280]));
  assert.deepEqual(new Set(scenarios.map(item => item.tab)), new Set(['general', 'review']));
  assert.deepEqual(new Set(scenarios.map(item => item.language)), new Set(['pt-BR', 'en-US']));
  assert.deepEqual(new Set(scenarios.map(item => item.theme)), new Set(['light', 'dark']));
});

test('ready fixture authorities produce two genuinely distinct review trees', () => {
  const menu = buildNewReleaseQaMenuFixture('agendaClinica');
  const initial = buildReviewView({
    pendingCount: 0, readStatus: 'ready', raw: menu, selectedActor: '', selectedId: '', selectedScope: 'future',
  });
  const professional = buildReviewView({
    pendingCount: 0, readStatus: 'ready', raw: menu, selectedActor: 'actor:professional', selectedId: '', selectedScope: 'future',
  });
  const scheduler = buildReviewView({
    pendingCount: 0, readStatus: 'ready', raw: menu, selectedActor: 'actor:scheduler', selectedId: '', selectedScope: 'future',
  });
  assert.deepEqual(professional.actors.map(actor => actor.key), ['actor:professional', 'actor:scheduler']);
  assert.equal(initial.selectedActor, 'actor:professional');
  assert.equal(initial.tree[0].children.length > 0, true);
  assert.deepEqual(professional.tree.map(node => node.id), ['qa-hub']);
  assert.deepEqual(professional.tree[0].children.map(node => node.id), ['qa-list']);
  assert.deepEqual(scheduler.tree.map(node => node.id), ['qa-home']);
  const count = (nodes: typeof professional.tree): number => nodes.reduce((total, node) => total + 1 + count(node.children), 0);
  assert.equal(count(professional.tree) > count(scheduler.tree), true);
});

test('review DOM is required only for fixture states that mount the review widget', () => {
  assert.equal(qaScenarioRequiresReview({ tab: 'review', fixture: 'empty' }), false);
  assert.equal(qaScenarioRequiresReview({ tab: 'review', fixture: 'loading' }), false);
  assert.equal(qaScenarioRequiresReview({ tab: 'review', fixture: 'error' }), true);
  assert.equal(qaScenarioRequiresReview({ tab: 'review', fixture: 'pending' }), true);
  assert.equal(qaScenarioRequiresReview({ tab: 'review', fixture: 'ready' }), true);
  assert.equal(qaScenarioRequiresReview({ tab: 'general', fixture: 'ready' }), false);
});

test('ready is emitted only after component, translation, theme and data resolve', () => {
  assert.equal(canAnnounceQaReady({ component: true, translation: true, theme: true, data: false }), false);
  assert.equal(canAnnounceQaReady({ component: true, translation: true, theme: true, data: true }), true);
});
