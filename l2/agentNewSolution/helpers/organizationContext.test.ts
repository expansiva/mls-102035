/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/organizationContext.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatNs4E1OrganizationContext,
  formatNs4E4OrganizationContext,
  formatNs4E6OrganizationContext,
  formatNs4Level1CatalogPrompt,
} from '/_102035_/l2/agentNewSolution/helpers/organizationContext.js';
import { ns4Level1Catalog } from '/_102035_/l2/agentNewSolution/helpers/level1Catalog.js';
import {
  buildNs4SolutionRegistryModuleBlock,
  emptyNs4SolutionRegistry,
  upsertNs4SolutionRegistryModule,
} from '/_102035_/l2/agentNewSolution/helpers/organizationRegistry.js';

const emptyRegistry = emptyNs4SolutionRegistry();

const twoModules = upsertNs4SolutionRegistryModule(
  upsertNs4SolutionRegistryModule(
    emptyNs4SolutionRegistry(),
    buildNs4SolutionRegistryModuleBlock({
      moduleName: 'moduleOne',
      actors: [{ actorId: 'customer', kind: 'external' }],
      entities: [{ entityId: 'Party', kind: 'mdm', party: 'person', storage: { target: 'mdm', mdmType: 'moduleOne.Party' } }],
      updatedAt: '2026-09-08T10:00:00.000Z',
    }),
  ),
  buildNs4SolutionRegistryModuleBlock({
    moduleName: 'moduleTwo',
    actors: [{ actorId: 'customer', kind: 'external' }, { actorId: 'admin', kind: 'internal' }],
    entities: [{ entityId: 'Party', kind: 'mdm', party: 'person', storage: { target: 'mdm', mdmType: 'moduleTwo.Party' } }],
    generalFields: [{ fieldId: 'segment', type: 'string', promotedBy: 'moduleTwo', since: '2026-09-08T11:00:00.000Z' }],
    updatedAt: '2026-09-08T11:00:00.000Z',
  }),
);

test('E1 context is omitted for an empty registry and lists sibling actors otherwise', () => {
  assert.equal(formatNs4E1OrganizationContext(null), '');
  assert.equal(formatNs4E1OrganizationContext(emptyRegistry), '');
  const text = formatNs4E1OrganizationContext(twoModules);
  assert.match(text, /^## Modules already in this organization/m);
  assert.match(text, /moduleOne: actors customer \(external\)/);
  assert.match(text, /moduleTwo: actors customer \(external\), admin \(internal\)/);
});

test('E6 context exposes sibling roles and generalFields for reuse', () => {
  assert.equal(formatNs4E6OrganizationContext(emptyRegistry), '');
  const text = formatNs4E6OrganizationContext(twoModules);
  assert.match(text, /moduleOne\.Party/);
  assert.match(text, /moduleTwo\.Party/);
  assert.match(text, /"fieldId": "segment"/);
});

test('E4 context lists general fields as placeholders', () => {
  assert.equal(formatNs4E4OrganizationContext(emptyRegistry), '');
  const text = formatNs4E4OrganizationContext(twoModules);
  assert.match(text, /<segment>/);
  assert.doesNotMatch(text, /\b(Cliente|Customer|Patient|Aluno)\b/);
});

test('level-1 catalog prompt uses placeholders and no domain nouns', () => {
  const text = formatNs4Level1CatalogPrompt(ns4Level1Catalog());
  assert.match(text, /<Person>/);
  assert.match(text, /<Company>/);
  assert.match(text, /<name>/);
  assert.match(text, /<Owns>/);
  assert.doesNotMatch(text, /\b(Cliente|Customer|Patient|Aluno|stock|Inventory)\b/i);
});
