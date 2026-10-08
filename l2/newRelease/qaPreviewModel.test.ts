/// <mls fileReference="_102035_/l2/newRelease/qaPreviewModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { L4ImplementationRecord } from '../solution/candidate/moduleImplementation.js';
import {
  QA_IMPLEMENTATION_FIXTURES,
  QA_CHANGE_EFFORT_FIXTURES,
  isQaChangeEffortFixture,
  buildNewReleaseQaChangeEffort,
  isQaImplementationFixture,
  buildNewReleaseQaFixture,
  buildNewReleaseQaMenuFixture,
  canAnnounceQaReady,
  isQaProtectedRequest,
  newReleaseQaScenarios,
  parseNewReleaseQaParams,
  qaScenarioRequiresReview,
} from './qaPreviewModel.js';
import { buildReviewView, implementationProgress } from './widgets/reviewModel.js';
import { buildChangeEffortView } from './widgets/changeEffortModel.js';

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
  assert.equal(scenarios.length, 240);
  assert.deepEqual(new Set(scenarios.map(item => item.width)), new Set([390, 800, 1280]));
  assert.deepEqual(new Set(scenarios.map(item => item.tab)), new Set(['general', 'review']));
  assert.deepEqual(new Set(scenarios.map(item => item.language)), new Set(['pt-BR', 'en-US']));
  assert.deepEqual(new Set(scenarios.map(item => item.theme)), new Set(['light', 'dark']));
});

test('mr_27: effort fixtures cover every review presentation and preserve the verified golden input', () => {
  const golden = JSON.parse(readFileSync(new URL('./widgets/fixtures/changeEffort-agendaClinica-regra-anotacao.json', import.meta.url), 'utf8'));
  const before = structuredClone(golden);
  for (const fixture of QA_CHANGE_EFFORT_FIXTURES) {
    assert.equal(isQaChangeEffortFixture(fixture), true);
    assert.equal(parseNewReleaseQaParams(`fixture=${fixture}&tab=review`).ok, true);
    const scenarios = newReleaseQaScenarios().filter(item => item.fixture === fixture);
    assert.equal(scenarios.length, 12);
    assert.equal(new Set(scenarios.map(item => `${item.width}/${item.language}/${item.theme}`)).size, 12);
    assert.ok(scenarios.every(item => qaScenarioRequiresReview(item)));
    assert.equal(buildNewReleaseQaFixture(fixture, 'agendaClinica').resultCurrent, true);
    const content = buildNewReleaseQaChangeEffort(fixture, golden);
    if (fixture === 'effort-invalid') {
      assert.throws(() => JSON.parse(content));
      assert.equal(buildChangeEffortView({ status: 'invalid', path: 'qa' }).kind, 'invalid');
      continue;
    }
    const view = buildChangeEffortView({ status: 'ok', path: 'qa', value: JSON.parse(content) });
    assert.equal(view.kind, 'ready');
    assert.equal(view.status, fixture === 'effort-simple' ? 'simple' : 'blocked');
    assert.equal(view.items.length, 1);
    assert.equal(view.items[0].answers.length, 2);
    assert.equal(view.items[0].answers[0].materialize[0].id, 'agenda_diaria');
    if (fixture === 'effort-simple') assert.deepEqual(JSON.parse(content), golden);
    else {
      assert.match(view.items[0].answers[1].abend!.reason, /102021/);
      assert.equal(view.merged!.abend.length, 1);
    }
  }
  assert.deepEqual(golden, before);
  assert.equal(isQaChangeEffortFixture('ready'), false);
  assert.throws(() => buildNewReleaseQaChangeEffort('effort-simple', {}), /qa.changeEffortFixtureInvalid/);
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

test('mr_12: all seven implementation states are included in every review presentation', () => {
  for (const fixture of QA_IMPLEMENTATION_FIXTURES) {
    assert.equal(isQaImplementationFixture(fixture), true);
    assert.equal(parseNewReleaseQaParams(`fixture=${fixture}&tab=review`).ok, true);
    const scenarios = newReleaseQaScenarios().filter(item => item.fixture === fixture);
    assert.equal(scenarios.length, 12);
    assert.ok(scenarios.every(item => qaScenarioRequiresReview(item)));
    assert.equal(buildNewReleaseQaFixture(fixture, 'qa').resultCurrent, true);
  }
  assert.equal(isQaImplementationFixture('ready'), false);
});

test('mr_12: rehearsal JSON renders waiting, both running phases, retry limit, artifacts and stale response', () => {
  const records = JSON.parse(readFileSync(new URL('./fixtures/implementation.json', import.meta.url), 'utf8')) as Record<string, L4ImplementationRecord>;
  const view = (name: string) => implementationProgress(records[`implementation-${name}`], 'qa-implementation-change');
  assert.deepEqual(view('waiting').map(phase => phase.status), ['aguardando', 'aguardando']);
  assert.deepEqual(view('l2').map(phase => phase.status), ['executando', 'aguardando']);
  assert.deepEqual(view('l1').map(phase => phase.status), ['concluido', 'executando']);
  assert.equal(view('retry')[0].podeTentarDeNovo, true);
  assert.equal(view('failed')[0].podeTentarDeNovo, false);
  assert.equal(view('failed')[0].attempt, 2);
  assert.equal(view('failed')[0].previousAttempts?.length, 1);
  assert.deepEqual(view('success').map(phase => phase.status), ['concluido', 'concluido']);
  assert.ok(view('success').every(phase => phase.changedDefs?.length));
  assert.deepEqual(view('stale').map(phase => phase.status), ['aguardando', 'aguardando']);
});
