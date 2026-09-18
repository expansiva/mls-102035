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
import {
  NS5_MODULE_SYSTEM_ACTOR_DROP_CHOICE,
  NS5_MODULE_SYSTEM_ACTOR_KEEP_CHOICE,
  buildNs5ModuleTool,
  normalizeNs5ModuleArtifact,
  ns5DropSystemActorDecisionId,
  ns5ModuleRequestKind,
} from '/_102035_/l2/agentNewSolution5/steps/module10/contracts.js';
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

// ns5_52b: the intent gate. The three prompts of the run are answered by the model; what this file
// proves is that the verdict is read, that it never lands on the artifact, and that the step refuses
// before its first write.
void test('module10 tool asks for requestKind', () => {
  const schema = loadSchema();
  const required = (schema.required as string[]) || [];
  assert.ok(required.includes('requestKind'));
  const properties = schema.properties as Record<string, { enum?: string[] }>;
  assert.deepEqual(properties.requestKind?.enum, ['moduleRequest', 'notAModuleRequest']);
});

void test('ns5ModuleRequestKind reads the verdict and keeps older payloads working', () => {
  assert.equal(ns5ModuleRequestKind(validPayload({ requestKind: 'notAModuleRequest' })), 'notAModuleRequest');
  assert.equal(ns5ModuleRequestKind(validPayload({ requestKind: 'moduleRequest' })), 'moduleRequest');
  // A draft recorded before this gate (every fixture) still runs.
  assert.equal(ns5ModuleRequestKind(validPayload()), 'moduleRequest');
  assert.equal(ns5ModuleRequestKind(undefined), 'moduleRequest');
});

void test('the verdict never reaches the artifact', () => {
  const { artifact } = normalizeNs5ModuleArtifact(validPayload({ requestKind: 'moduleRequest' }), {
    sourcePrompt: SOURCE,
    fixedModuleName: 'comandaRestaurante5',
  });
  assert.equal('requestKind' in artifact, false);
});

void test('module10 refuses a non-module request before it writes anything', () => {
  const source = readFileSync(path.join(HERE, 'agentNs5Module.ts'), 'utf8');
  const after = source.slice(source.indexOf('export async function afterNs5ModulePromptStep'));
  const body = after.slice(0, after.indexOf('\nexport async function', 1));
  const gate = body.indexOf("ns5ModuleRequestKind(payload) === 'notAModuleRequest'");
  assert.notEqual(gate, -1, 'the intent gate is gone');
  for (const write of ['ensurePipeline(', 'writeJson(', 'writeDefs(', 'writePipeline(']) {
    const at = body.indexOf(write);
    if (at === -1) continue;
    assert.ok(gate < at, `${write} runs before the intent gate`);
  }
  assert.ok(body.indexOf('NS5_MODULE_NOT_A_REQUEST') > gate, 'the user is not told why nothing was created');
});

void test('normalize rewrites pt to pt-BR and leaves en alone', () => {
  const portuguese = normalizeNs5ModuleArtifact(validPayload({
    userLanguage: 'pt',
    productLanguages: ['pt'],
    defaultLanguage: 'pt',
  }), { sourcePrompt: SOURCE, fixedModuleName: 'comandaRestaurante5' });
  assert.equal(portuguese.artifact.userLanguage, 'pt-BR');
  assert.deepEqual(portuguese.artifact.productLanguages, ['pt-BR']);
  assert.equal(portuguese.artifact.defaultLanguage, 'pt-BR');
  assert.ok(portuguese.normalizations.some(item => item.kind === 'ptToPtBR'));
  const mixed = normalizeNs5ModuleArtifact(validPayload({
    userLanguage: 'pt',
    productLanguages: ['pt', 'pt-BR'],
    defaultLanguage: 'pt',
  }), { sourcePrompt: SOURCE, fixedModuleName: 'comandaRestaurante5' });
  assert.deepEqual(mixed.artifact.productLanguages, ['pt-BR']);
  const english = normalizeNs5ModuleArtifact(validPayload({
    userLanguage: 'en',
    productLanguages: ['en'],
    defaultLanguage: 'en',
    sourcePrompt: 'module in english. profiles: waiter and cashier.',
  }), { sourcePrompt: 'module in english. profiles: waiter and cashier.', fixedModuleName: 'hiringPipeline' });
  assert.equal(english.artifact.userLanguage, 'en');
  assert.deepEqual(english.artifact.productLanguages, ['en']);
  assert.equal(english.normalizations.some(item => item.kind === 'ptToPtBR'), false);
});

void test('persistArtifact writes language normalizations on pipeline.json module10', () => {
  const source = readFileSync(path.join(HERE, 'agentNs5Module.ts'), 'utf8');
  const persist = source.slice(source.indexOf('async function persistArtifact'));
  assert.match(persist, /normalizations/);
  assert.match(persist, /writeStepState/);
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

/**
 * ns5_53 T1 / P-1. The prompt tells the model not to list an external system. When it does anyway,
 * the actor is removed here rather than three steps later: an actor that no journey performs and no
 * grant covers is two finalize80 I3 errors, and the external system is already modelled by
 * integration70 as a plugin or an inbound.
 */
void test('a kind: system actor is dropped and recorded in systemDecisions (ns5_53)', () => {
  const { actors, systemDecisions } = normalizeNs5ModuleArtifact(validPayload({
    actors: [
      {
        actorId: 'caixa',
        kind: 'internal',
        origin: 'named',
        title: 'Cashier',
        description: 'Receives the payments.',
      },
      {
        actorId: 'stripe',
        kind: 'system',
        origin: 'named',
        title: 'Stripe',
        description: 'Processes the card payment.',
      },
    ],
  }), { sourcePrompt: SOURCE });
  assert.deepEqual(actors.map(actor => actor.actorId), ['caixa']);
  assert.equal(systemDecisions.length, 1);
  assert.equal(systemDecisions[0].decisionId, ns5DropSystemActorDecisionId('stripe'));
  assert.equal(systemDecisions[0].decisionId, 'dropSystemActorStripe');
  assert.equal(systemDecisions[0].chosen, NS5_MODULE_SYSTEM_ACTOR_DROP_CHOICE);
  assert.deepEqual(systemDecisions[0].alternatives, [NS5_MODULE_SYSTEM_ACTOR_KEEP_CHOICE]);
  assert.equal(systemDecisions[0].decidedBy, 'system');
});

void test('a payload with no system actor records no decision (ns5_53)', () => {
  const { actors, systemDecisions } = normalizeNs5ModuleArtifact(validPayload(), { sourcePrompt: SOURCE });
  assert.equal(actors.length, 2);
  assert.equal(systemDecisions.length, 0);
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
