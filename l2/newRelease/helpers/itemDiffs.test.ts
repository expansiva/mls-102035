import assert from 'node:assert/strict';
import { test } from 'node:test';

import { tobeDiff } from '../../solution/candidate/tobeDiff.js';
import { hasItemDiff, hasPluginDiff, idScope, ontologyFieldScope, ruleScopes } from './itemDiffs.js';
import type { NewReleaseTobeDiff } from '../tobe.js';

function artifact(path: NewReleaseTobeDiff['path'], before: unknown, after: unknown): NewReleaseTobeDiff[] {
  return [{ path, entries: tobeDiff(before, after) }];
}

test('IDs and URI encoded segments identify one changed item without marking its sibling', () => {
  const before = { processes: [{ processId: 'flow', tasks: [
    { taskId: 'send/a', description: 'old' }, { taskId: 'send/a-more', description: 'same' },
  ] }] };
  const after = { processes: [{ processId: 'flow', tasks: [
    { taskId: 'send/a', description: 'new' }, { taskId: 'send/a-more', description: 'same' },
  ] }] };
  const diffs = artifact('workflows.defs.ts', before, after);
  const process = idScope('processes', 'processId', 'flow');
  assert.equal(hasItemDiff(diffs, 'workflows.defs.ts', `${process}.tasks[taskId=send%2Fa]`), true);
  assert.equal(hasItemDiff(diffs, 'workflows.defs.ts', `${process}.tasks[taskId=send%2Fa-more]`), false);
  assert.equal(hasItemDiff(diffs, 'access.defs.ts'), false);
});

test('nested ontology field and rule scopes do not mark nearby names', () => {
  const entity = artifact('ontology/Company.defs.ts',
    { record: { fields: { name: { title: 'Old' }, nameExtra: { title: 'Same' } } } },
    { record: { fields: { name: { title: 'New' }, nameExtra: { title: 'Same' } } } });
  assert.equal(hasItemDiff(entity, 'ontology/Company.defs.ts', ontologyFieldScope('name', true)), true);
  assert.equal(hasItemDiff(entity, 'ontology/Company.defs.ts', ontologyFieldScope('nameExtra', true)), false);

  const rules = artifact('rules.defs.ts', { rules: { allow: 'Old', allowExtra: 'Same' } }, { rules: { allow: 'New', allowExtra: 'Same' } });
  assert.equal(hasItemDiff(rules, 'rules.defs.ts', ruleScopes('allow')), true);
  assert.equal(hasItemDiff(rules, 'rules.defs.ts', ruleScopes('allowExtra')), false);
});

test('plugin changes mark only the matching plugin, including an internal description edit', () => {
  const diffs = artifact('integration.defs.ts',
    { plugins: [{pluginId: 'existing', description: 'Same'}] },
    { plugins: [{pluginId: 'existing', description: 'Same'}, {pluginId: 'new', description: 'Added'}] });
  const plugins = [{pluginId: 'existing'}, {pluginId: 'new'}];
  assert.equal(hasPluginDiff(diffs, plugins, 'new'), true);
  assert.equal(hasPluginDiff(diffs, plugins, 'existing'), false);

  const description = artifact('integration.defs.ts',
    { plugins: [{pluginId: 'first', description: 'Old'}, {pluginId: 'second', description: 'Same'}] },
    { plugins: [{pluginId: 'first', description: 'New'}, {pluginId: 'second', description: 'Same'}] });
  const siblings = [{pluginId: 'first'}, {pluginId: 'second'}];
  assert.equal(hasPluginDiff(description, siblings, 'first'), true);
  assert.equal(hasPluginDiff(description, siblings, 'second'), false);
});
