/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/organizationContext.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatNs4E1OrganizationContext,
  formatNs4E4OrganizationContext,
  formatNs4E6OrganizationContext,
  formatNs4Level1CatalogPrompt,
  formatPlatformCatalogPrompt,
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
  const catalog = ns4Level1Catalog();
  const structure = formatNs4Level1CatalogPrompt({ index: catalog.index, entities: catalog.entities });
  assert.match(structure, /<Person>/);
  assert.match(structure, /<Company>/);
  assert.match(structure, /<name>/);
  assert.match(structure, /<Owns>/);
  assert.doesNotMatch(structure, /\b(Cliente|Customer|Patient|Aluno|stock|Inventory)\b/i);
  const text = formatNs4Level1CatalogPrompt(catalog);
  assert.match(text, /## Platform services/);
  assert.match(text, /use for files of a master record/);
  assert.match(text, /not for a module Photo\/File entity/);
  assert.match(text, /## Role rules/);
  assert.doesNotMatch(text, /\b(Cliente|Patient|Aluno)\b/);
});

test('platform catalog prompt is derived from the catalog object', () => {
  const text = formatPlatformCatalogPrompt(ns4Level1Catalog().platform);
  assert.match(text, /^- attachments: /m);
  assert.match(text, /^- comments: /m);
  assert.match(text, /tag: <moduleId>\.<EntityId>/);
  assert.doesNotMatch(text, /\b(Cliente|Patient|Aluno)\b/);
});
