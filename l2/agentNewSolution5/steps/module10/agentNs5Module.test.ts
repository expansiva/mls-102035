/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/module10/agentNs5Module.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/agentNewSolution/helpers/ns4WorkerTools.js';
import { ownerStepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import { loadNs5FixtureJson, NS5_REAL_MODULES } from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import { NS5_MODULE_SCHEMA_VERSION, type Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';
import { buildNs5ModuleHumanPrompt } from '/_102035_/l2/agentNewSolution5/steps/module10/agentNs5Module.js';
import { buildNs5ModuleTool, normalizeNs5ModuleArtifact } from '/_102035_/l2/agentNewSolution5/steps/module10/contracts.js';
import { validateNs5ModuleArtifact } from '/_102035_/l2/agentNewSolution5/steps/module10/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function loadSchema(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(HERE, '../../schemas/module.schema.json'), 'utf8'),
  ) as Record<string, unknown>;
}

const SOURCE = 'modulo comandaRestaurante, portugues. perfis: garcom e caixa.';

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: NS5_MODULE_SCHEMA_VERSION,
    moduleName: 'comandaRestaurante5',
    title: 'Floor orders',
    userLanguage: 'pt-BR',
    productLanguages: ['pt-BR'],
    defaultLanguage: 'pt-BR',
    sourcePrompt: SOURCE,
    actors: [
      {
        actorId: 'garcom',
        kind: 'internal',
        origin: 'named',
        title: 'Waiter',
        description: 'Opens the table order and launches items.',
      },
      {
        actorId: 'caixa',
        kind: 'internal',
        origin: 'named',
        title: 'Cashier',
        description: 'Closes the order and frees the table.',
      },
    ],
    scope: { inScope: ['Table orders'], outOfScope: ['Payroll'] },
    ...overrides,
  };
}

void test('module10 tool schema is provider-clean', () => {
  const tool = buildNs5ModuleTool(loadSchema(), createNs4FlexibleWorkerTool);
  assert.equal(tool.function.name, 'submitNs5Module');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
});

void test('real module10 drafts of both runs pass the gate', () => {
  for (const moduleName of NS5_REAL_MODULES) {
    const draft = loadNs5FixtureJson<Ns5ModuleArtifact>('steps/module10/fixtures', `${moduleName}-draft.json`);
    const { artifact, actors } = normalizeNs5ModuleArtifact(draft, {
      sourcePrompt: draft.sourcePrompt,
      fixedModuleName: moduleName,
    });
    const gate = validateNs5ModuleArtifact(artifact, { fixedModuleName: moduleName, actors });
    assert.equal(gate.ok, true, `${moduleName}: ${gate.issues.map(issue => issue.code).join(', ')}`);
    assert.equal(actors.every(actor => actor.origin === 'named'), true, moduleName);
    assert.ok(actors.some(actor => actor.kind === 'internal'), moduleName);
    assert.equal('actors' in artifact, false, moduleName);
    assert.equal('scope' in artifact, false, moduleName);
  }
});

void test('normalize + gate accept a valid payload', () => {
  const { artifact, actors, i18nWarnings } = normalizeNs5ModuleArtifact(validPayload(), {
    sourcePrompt: SOURCE,
    fixedModuleName: 'comandaRestaurante5',
  });
  assert.equal(i18nWarnings.length, 0);
  const gate = validateNs5ModuleArtifact(artifact, { fixedModuleName: 'comandaRestaurante5', actors });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(artifact.schemaVersion, NS5_MODULE_SCHEMA_VERSION);
  assert.equal(artifact.sourcePrompt, SOURCE);
});

void test('gate rejects a module with no internal actor', () => {
  const { artifact, actors } = normalizeNs5ModuleArtifact(validPayload({
    actors: [{
      actorId: 'cliente',
      kind: 'external',
      origin: 'inferred',
      title: 'Customer',
      description: 'Pays at the table.',
    }],
  }), { sourcePrompt: SOURCE });
  const gate = validateNs5ModuleArtifact(artifact, { actors });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_MODULE_INTERNAL_ACTOR'));
});

void test('gate rejects a default language outside productLanguages', () => {
  const { artifact, actors } = normalizeNs5ModuleArtifact(validPayload({
    productLanguages: ['pt-BR'],
    defaultLanguage: 'pt-BR',
  }), { sourcePrompt: SOURCE });
  const broken: Ns5ModuleArtifact = { ...artifact, defaultLanguage: 'en' };
  const gate = validateNs5ModuleArtifact(broken, { actors });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_MODULE_DEFAULT_LANGUAGE'));
});

void test('gate rejects a duplicate actor id', () => {
  const { artifact, actors } = normalizeNs5ModuleArtifact(validPayload({
    actors: [
      {
        actorId: 'garcom',
        kind: 'internal',
        origin: 'named',
        title: 'Waiter',
        description: 'Opens orders.',
      },
      {
        actorId: 'garcom',
        kind: 'internal',
        origin: 'named',
        title: 'Waiter two',
        description: 'Also opens orders.',
      },
    ],
  }), { sourcePrompt: SOURCE });
  const gate = validateNs5ModuleArtifact(artifact, { actors });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_MODULE_ACTOR_DUPLICATE'));
});

void test('gate rejects a moduleName that does not match /module', () => {
  const { artifact } = normalizeNs5ModuleArtifact(validPayload({ moduleName: 'otherModule' }), {
    sourcePrompt: SOURCE,
    fixedModuleName: 'comandaRestaurante5',
  });
  assert.equal(artifact.moduleName, 'comandaRestaurante5');
  const unfixed = normalizeNs5ModuleArtifact(validPayload({ moduleName: 'otherModule' }), { sourcePrompt: SOURCE });
  const gate = validateNs5ModuleArtifact(unfixed.artifact, {
    fixedModuleName: 'comandaRestaurante5',
    actors: unfixed.actors,
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_MODULE_NAME_MISMATCH'));
});

void test('inferred external actor stays on the pipeline list, not the artifact', () => {
  const { artifact, actors } = normalizeNs5ModuleArtifact(validPayload({
    actors: [
      {
        actorId: 'caixa',
        kind: 'internal',
        origin: 'named',
        title: 'Cashier',
        description: 'Closes the order.',
      },
      {
        actorId: 'cliente',
        kind: 'external',
        origin: 'inferred',
        title: 'Customer',
        description: 'Brings the ticket.',
      },
    ],
  }), { sourcePrompt: SOURCE });
  const gate = validateNs5ModuleArtifact(artifact, { actors });
  assert.equal(gate.ok, true, gate.issues.map(issue => issue.code).join(', '));
  assert.equal('actors' in artifact, false);
  assert.equal(actors[1].origin, 'inferred');
  assert.equal(actors[1].kind, 'external');
});

void test('languages not cited in the request are discarded', () => {
  const { artifact, actors, i18nWarnings } = normalizeNs5ModuleArtifact(validPayload({
    productLanguages: ['pt-BR', 'en', 'es'],
    defaultLanguage: 'en',
  }), { sourcePrompt: SOURCE });
  assert.deepEqual(artifact.productLanguages, ['pt-BR']);
  assert.equal(artifact.defaultLanguage, 'pt-BR');
  assert.ok(i18nWarnings.length > 0);
  const gate = validateNs5ModuleArtifact(artifact, { actors });
  assert.equal(gate.ok, true);
});

void test('ownerStepId maps repair and transport planIds', () => {
  assert.equal(ownerStepId('module10'), 'module10');
  assert.equal(ownerStepId('module10-repair-1'), 'module10');
  assert.equal(ownerStepId('module10-transport-2'), 'module10');
  assert.equal(ownerStepId('module10-done'), '');
  assert.equal(ownerStepId('module10-clarification'), '');
  assert.equal(ownerStepId('journeys20'), 'journeys20');
});

void test('human prompt carries the source request and a fixed module name', () => {
  const human = buildNs5ModuleHumanPrompt({
    sourcePrompt: SOURCE,
    fixedModuleName: 'comandaRestaurante5',
    organizationContext: '## Modules already in this organization\n- sibling: actors a (internal)',
  });
  assert.match(human, /Source request/);
  assert.match(human, /comandaRestaurante5/);
  assert.match(human, /Modules already in this organization/);
});
