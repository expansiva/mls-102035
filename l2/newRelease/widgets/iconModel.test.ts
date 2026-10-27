/// <mls fileReference="_102035_/l2/newRelease/widgets/iconModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { LUCIDE_ICONS, LUCIDE_VERSION } from '../../solution/lucideIcons.js';
import type { Ns5JourneyArtifact, Ns5JourneyStep, Ns5WorkflowTask } from '../../solution/types.js';
import { LUCIDE_ARTWORK_VERSION, lucideArtwork } from './lucideArtwork.js';
import { JOURNEY_ICON_DEFAULTS, WORKFLOW_ICON_DEFAULTS, iconNeedsFallback, resolveNewReleaseIcon, searchNewReleaseIcons, withNewReleaseIcon } from './iconModel.js';
import { normalizeWorkflows } from './workflowsModel.js';

test('local official artwork covers every pinned catalog name and every type default', () => {
  assert.equal(LUCIDE_ARTWORK_VERSION, LUCIDE_VERSION);
  assert.equal(LUCIDE_ICONS.length, 2176);
  for (const name of [...LUCIDE_ICONS, ...Object.values(JOURNEY_ICON_DEFAULTS), ...Object.values(WORKFLOW_ICON_DEFAULTS), 'route']) {
    const drawing = lucideArtwork(name);
    assert.ok(drawing, name);
    assert.match(drawing, /<(path|circle|rect|line|polygon|polyline|ellipse)\b/);
    assert.doesNotMatch(drawing, /<script|<foreignObject|\bon\w+=|\bhref=|url\(/i);
  }
  assert.equal(lucideArtwork('constructor'), undefined);
  assert.equal(lucideArtwork('<svg onload="evil()">'), undefined);
});

test('missing and unknown icons use the declared type default with a nonblocking notice', () => {
  for (const value of [undefined, '', 'unknown', 'https://example.com/icon.svg', '<svg>']) {
    assert.equal(resolveNewReleaseIcon(value, 'search'), 'search');
    assert.equal(iconNeedsFallback(value), true);
  }
  assert.equal(resolveNewReleaseIcon('clipboard-check', 'search'), 'clipboard-check');
  assert.equal(iconNeedsFallback('clipboard-check'), false);
});

test('search is case insensitive and can reach names at the end of the complete catalog', () => {
  assert.deepEqual(searchNewReleaseIcons(' CLIPBOARD-CHECK '), ['clipboard-check']);
  assert.ok(searchNewReleaseIcons('zoom').includes('zoom-out'));
  assert.equal(searchNewReleaseIcons('').length, LUCIDE_ICONS.length);
  assert.deepEqual(searchNewReleaseIcons('no-such-lucide-icon'), []);
});

test('journey, step and workflow icon edits preserve every other property and remove the optional key', () => {
  const business: Ns5JourneyArtifact['business'] = { actorRef: 'buyer', title: 'Buy', goal: 'Buy safely', entry: {mode: 'coldStart'}, steps: [], outcome: {statement: 'Done', evidence: ['Record']} };
  const step: Ns5JourneyStep = {stepId: 'inspectOrder', kind: 'inspect', title: 'Inspect', description: 'Check order', entity: 'Order', decisionRef: 'decideOrder'};
  const task: Ns5WorkflowTask = {taskId: 'inspectOrder', kind: 'human', description: 'Check order', actorRef: 'buyer', journeyRef: 'buy', next: ['finish']};
  for (const item of [business, step, task]) {
    const before = structuredClone(item);
    const changed = withNewReleaseIcon(item, 'clipboard-check');
    assert.equal(changed.icon, 'clipboard-check');
    assert.deepEqual(withNewReleaseIcon(changed, ''), before);
    assert.equal(Object.hasOwn(withNewReleaseIcon(changed, ''), 'icon'), false);
    assert.deepEqual(item, before);
    assert.equal(withNewReleaseIcon(item, 'bad-name'), item);
  }
});

test('workflow view retains known and unknown icons for rendering and notice without mutating sources', () => {
  for (const icon of ['clipboard-check', 'future-icon']) {
    const raw = {schemaVersion: '2026-09-10-ns5-workflows-v3', moduleName: 'orders', processes: [{processId: 'order', tasks: [{taskId: 'check', kind: 'wait', icon, description: 'Check', next: []}]}]};
    const before = structuredClone(raw);
    const view = normalizeWorkflows(raw);
    assert.equal(view.processes[0].tasks[0].icon, icon);
    assert.deepEqual(raw, before);
  }
});
