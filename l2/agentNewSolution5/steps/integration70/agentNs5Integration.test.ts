/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/integration70/agentNs5Integration.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/agentNewSolution/helpers/ns4WorkerTools.js';
import { ownerStepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import type { Ns5IntegrationItem, Ns5IntegrationPlugin } from '/_102035_/l2/solution/types.js';
import { buildNs5IntegrationHumanPrompt } from '/_102035_/l2/agentNewSolution5/steps/integration70/agentNs5Integration.js';
import {
  NS5_INTEGRATION_DROP_TRANSITION_REF,
  NS5_PLUGIN_CATALOG,
  NS5_PLUGIN_IDS,
  buildNs5IntegrationArtifact,
  buildNs5IntegrationTool,
  collectNs5InboundPending,
  collectNs5IntegrationSignals,
  normalizeNs5IntegrationPayload,
  promptMentionsTerm,
  type Ns5IntegrationActorView,
  type Ns5IntegrationEntityView,
} from '/_102035_/l2/agentNewSolution5/steps/integration70/contracts.js';
import {
  formatNs5IntegrationGate,
  validateNs5Integration,
} from '/_102035_/l2/agentNewSolution5/steps/integration70/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

interface DerivedIntegrationFixture {
  derivedFrom: string;
  inbound: Ns5IntegrationItem[];
  outbound: Ns5IntegrationItem[];
  plugins: Ns5IntegrationPlugin[];
}

function loadSchema(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(HERE, '../../schemas/integration.schema.json'), 'utf8'),
  ) as Record<string, unknown>;
}

function loadDerived(name: string): DerivedIntegrationFixture {
  return JSON.parse(readFileSync(path.join(HERE, 'fixtures', name), 'utf8')) as DerivedIntegrationFixture;
}

const CE11_PROMPT = 'criar o modulo financeiro em portugues. toda cobranca nasce em outro modulo. o caixa recebe titulos (dinheiro, pix ou cartao via Stripe). perfis: caixa, gerente financeiro e pagador.';
const COMANDA_PROMPT = 'criar o modulo comanda restaurante em portugues. garcom abre comanda, lanca itens, caixa fecha.';
const ORDEN_PROMPT = 'crear el modulo orden de servicio. perfiles: recepcionista, tecnico, cliente.';

const CE11_ACTORS: Ns5IntegrationActorView[] = [
  { actorId: 'caixa', kind: 'internal' },
  { actorId: 'gerenteFinanceiro', kind: 'internal' },
  { actorId: 'pagador', kind: 'external' },
  { actorId: 'moduloOrigem', kind: 'system' },
];

const COMANDA_ACTORS: Ns5IntegrationActorView[] = [
  { actorId: 'garcom', kind: 'internal' },
  { actorId: 'caixa', kind: 'internal' },
];

const CE11_ENTITIES: Ns5IntegrationEntityView[] = [
  { entityId: 'ReceivableTitle' },
  { entityId: 'Payment' },
];

const CE11_REGISTRY = ['comandaRestaurante', 'mensalidadesAcademia', 'ordenServicio'];

function drafts(payload: unknown) {
  return normalizeNs5IntegrationPayload(payload);
}

function gateOf(
  payload: { inbound?: unknown; outbound?: unknown; plugins?: unknown } | DerivedIntegrationFixture,
  extras: Partial<{
    actors: Ns5IntegrationActorView[];
    entities: Ns5IntegrationEntityView[];
    registryModuleNames: string[];
    sourcePrompt: string;
    journeySteps: Array<{ journeyId: string; stepIds: string[] }>;
  }> = {},
) {
  const { inbound, outbound, plugins } = drafts(payload);
  const registryModuleNames = extras.registryModuleNames || CE11_REGISTRY;
  return validateNs5Integration(inbound, outbound, plugins, {
    actors: extras.actors || CE11_ACTORS,
    entities: extras.entities || CE11_ENTITIES,
    registryModuleNames,
    siblings: registryModuleNames.map(name => ({ moduleName: name, roles: [], entities: [], events: [] })),
    sourcePrompt: extras.sourcePrompt || CE11_PROMPT,
    journeySteps: extras.journeySteps || [{ journeyId: 'pagarComPlugin', stepIds: ['pagarTitulo'] }],
  });
}

void test('inbound transitionRef with effect other than transition is dropped', () => {
  const { inbound, normalizations } = drafts({
    inbound: [{
      id: 'produtoMdmCreated',
      kind: 'event',
      from: 'organization',
      event: 'mdmCreated',
      writes: ['Produto'],
      effect: 'create',
      transitionRef: 'produtoMdmCreated',
      description: 'Creates the product reference.',
    }],
    outbound: [],
    plugins: [],
  });
  assert.equal(inbound[0].transitionRef, undefined);
  assert.equal(inbound[0].effect, 'create');
  assert.ok(normalizations.some(item => (
    item.kind === NS5_INTEGRATION_DROP_TRANSITION_REF
    && item.inboundId === 'produtoMdmCreated'
  )));
  const gate = validateNs5Integration(inbound, [], [], {
    actors: CE11_ACTORS,
    entities: [{ entityId: 'Produto' }],
    registryModuleNames: CE11_REGISTRY,
    sourcePrompt: CE11_PROMPT,
    platformEventIds: ['mdmCreated'],
  });
  assert.equal(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_TRANSITION_UNKNOWN'), false);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('integration70 tool schema is provider-clean', () => {
  const tool = buildNs5IntegrationTool(loadSchema(), createNs4FlexibleWorkerTool);
  assert.equal(tool.function.name, 'submitNs5Integration');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
});

void test('plugin catalog is the closed E6 platform set', () => {
  assert.deepEqual([...NS5_PLUGIN_IDS].sort(), ['cardPayment', 'stripe']);
  assert.ok(NS5_PLUGIN_CATALOG.every(item => item.terms.length > 0));
});

void test('real integration70 drafts of both runs are empty and pass the gate', () => {
  for (const moduleName of ['comandaRestaurante5', 'ordenServicio5'] as const) {
    const draft = JSON.parse(
      readFileSync(path.join(HERE, 'fixtures', `${moduleName}-draft.json`), 'utf8'),
    ) as { inbound: unknown[]; outbound: unknown[]; plugins: unknown[] };
    assert.deepEqual(draft.inbound, []);
    assert.deepEqual(draft.outbound, []);
    assert.deepEqual(draft.plugins, []);
    const gate = gateOf(draft, {
      actors: moduleName === 'comandaRestaurante5' ? COMANDA_ACTORS : [
        { actorId: 'recepcionista', kind: 'internal' },
        { actorId: 'tecnico', kind: 'internal' },
        { actorId: 'cliente', kind: 'external' },
      ],
      entities: [{ entityId: 'Comanda' }, { entityId: 'OrdenServicio' }],
      registryModuleNames: [],
      sourcePrompt: moduleName === 'comandaRestaurante5' ? COMANDA_PROMPT : ORDEN_PROMPT,
    });
    assert.equal(gate.ok, true, `${moduleName}: ${gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n')}`);
  }
});

void test('derived ce11 fixture keeps inbound events and stripe plugin, no card entity', () => {
  const fixture = loadDerived('ce11-financeiro-integration.json');
  assert.match(fixture.derivedFrom, /ce11/);
  assert.equal(fixture.inbound.length, 3);
  assert.equal(fixture.outbound.length, 0);
  assert.equal(fixture.plugins.length, 1);
  assert.equal(fixture.plugins[0].pluginId, 'stripe');
  assert.ok(fixture.inbound.every(item => item.kind === 'event'));
  assert.ok(fixture.inbound.every(item => (item.writes || []).includes('ReceivableTitle')));
  assert.ok(fixture.inbound.every(item => item.effect === 'create'));
  assert.deepEqual(fixture.plugins[0].usedBy, ['pagarComPlugin.pagarTitulo']);
  const source = JSON.stringify(fixture);
  assert.doesNotMatch(source, /CardToken|Cartao|sourceRefs|workspace|landing/);
  const gate = gateOf(fixture);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('comanda-like module has no integration signal (skip LLM)', () => {
  const signals = collectNs5IntegrationSignals(COMANDA_ACTORS, COMANDA_PROMPT);
  assert.deepEqual(signals, []);
  const gate = validateNs5Integration([], [], [], {
    actors: COMANDA_ACTORS,
    entities: [{ entityId: 'Comanda' }],
    registryModuleNames: [],
    sourcePrompt: COMANDA_PROMPT,
  });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('orden-like module has no integration signal (skip LLM)', () => {
  const signals = collectNs5IntegrationSignals(
    [{ actorId: 'recepcionista', kind: 'internal' }, { actorId: 'cliente', kind: 'external' }],
    ORDEN_PROMPT,
  );
  assert.deepEqual(signals, []);
});

void test('kind system actor is an integration signal', () => {
  const signals = collectNs5IntegrationSignals(CE11_ACTORS, 'criar o modulo financeiro.');
  assert.ok(signals.some(signal => signal.kind === 'systemActor' && signal.actorId === 'moduloOrigem'));
});

void test('sourcePrompt Stripe matches the plugin catalog term', () => {
  assert.equal(promptMentionsTerm(CE11_PROMPT, 'stripe'), true);
  const signals = collectNs5IntegrationSignals(COMANDA_ACTORS, CE11_PROMPT);
  assert.ok(signals.some(signal => signal.kind === 'pluginTerm' && signal.pluginId === 'stripe'));
});

void test('plugin term is not a substring false positive', () => {
  assert.equal(promptMentionsTerm('the wall is striped paint', 'stripe'), false);
  assert.equal(promptMentionsTerm('card payment at the desk', 'card payment'), true);
});

void test('empty catalog is invalid when a system actor exists', () => {
  const gate = gateOf({ inbound: [], outbound: [], plugins: [] });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_SIGNAL_WITHOUT_ITEM'));
});

void test('unknown pluginId fails the catalog gate', () => {
  const gate = gateOf({
    inbound: [],
    outbound: [],
    plugins: [{ pluginId: 'paypal', description: 'Pay elsewhere.', usedBy: ['pagarComPlugin.pagarTitulo'] }],
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_PLUGIN_UNKNOWN'));
});

void test('unknown entityRef fails', () => {
  const gate = gateOf({
    inbound: [{
      id: 'closedTab',
      kind: 'event',
      from: 'comandaRestaurante',
      writes: ['Ghost'],
      effect: 'create',
      description: 'Closed tab.',
    }],
    outbound: [],
    plugins: [],
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_ENTITY_UNKNOWN'));
});

void test('inbound without from and outbound without to fail', () => {
  const inbound = gateOf({
    inbound: [{ id: 'in', kind: 'event', writes: ['ReceivableTitle'], effect: 'create', description: 'Missing from.' }],
    outbound: [],
    plugins: [],
  });
  assert.ok(inbound.issues.some(issue => issue.code === 'NS5_INTEGRATION_FROM'));
  const outbound = gateOf({
    inbound: [],
    outbound: [{ id: 'out', kind: 'event', event: 'out', on: 'ReceivableTitle.create', description: 'Missing to.', entityRefs: ['ReceivableTitle'] }],
    plugins: [],
  });
  assert.ok(outbound.issues.some(issue => issue.code === 'NS5_INTEGRATION_TO'));
});

void test('moduleEndpoint from a registry sibling is clean; unknown module is a warning', () => {
  const known = gateOf({
    inbound: [{
      id: 'chargeFromRestaurant',
      kind: 'moduleEndpoint',
      from: 'comandaRestaurante',
      description: 'Restaurant posts a charge.',
      entityRefs: ['ReceivableTitle'],
    }],
    outbound: [],
    plugins: [],
  });
  assert.equal(known.ok, true, known.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(known.issues.some(issue => issue.code === 'NS5_INTEGRATION_UNKNOWN_MODULE'), false);

  const unknown = gateOf({
    inbound: [{
      id: 'chargeFromGhost',
      kind: 'moduleEndpoint',
      from: 'moduloInexistente',
      description: 'Unknown sibling.',
      entityRefs: ['ReceivableTitle'],
    }],
    outbound: [],
    plugins: [],
  });
  assert.equal(unknown.ok, true, unknown.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const warning = unknown.issues.find(issue => issue.code === 'NS5_INTEGRATION_UNKNOWN_MODULE');
  assert.ok(warning);
  assert.equal(warning.severity, 'warning');
  assert.match(warning.message, /unknownModule/);
});

void test('event from a name not in the registry is unknownModule warning', () => {
  const gate = gateOf({
    inbound: [{
      id: 'comandaFechada',
      kind: 'event',
      from: 'moduloInexistente',
      writes: ['ReceivableTitle'],
      effect: 'create',
      description: 'Event from a future sibling.',
    }],
    outbound: [],
    plugins: [],
  });
  assert.equal(gate.ok, true);
  const warning = gate.issues.find(issue => issue.code === 'NS5_INTEGRATION_UNKNOWN_MODULE');
  assert.ok(warning);
  assert.equal(warning.severity, 'warning');
});

void test('normalize maps id to item id and drops empty peers', () => {
  const { inbound, plugins } = drafts({
    inbound: [{
      id: 'comandaFechada',
      kind: 'event',
      from: 'comandaRestaurante',
      to: '',
      description: 'Closed tab.',
      entityRefs: ['ReceivableTitle', 'ReceivableTitle', ''],
    }],
    plugins: [{
      id: 'stripe',
      description: 'Cards.',
      entityRefs: ['ReceivableTitle'],
    }],
  });
  assert.equal(inbound[0].id, 'comandaFechada');
  assert.equal('to' in inbound[0], false);
  assert.deepEqual(inbound[0].writes, ['ReceivableTitle']);
  assert.equal(inbound[0].effect, 'create');
  assert.equal(plugins[0].pluginId, 'stripe');
  assert.deepEqual(plugins[0].usedBy, []);
});

void test('buildNs5IntegrationArtifact keeps schemaVersion and empty lists', () => {
  const artifact = buildNs5IntegrationArtifact('comandaRestaurante5', [], [], []);
  assert.equal(artifact.schemaVersion, '2026-09-12-ns5-integration-v2');
  assert.equal(artifact.moduleName, 'comandaRestaurante5');
  assert.deepEqual(artifact.inbound, []);
  assert.deepEqual(artifact.outbound, []);
  assert.deepEqual(artifact.plugins, []);
});

void test('duplicate ids fail', () => {
  const gate = gateOf({
    inbound: [{
      id: 'same',
      kind: 'event',
      from: 'comandaRestaurante',
      description: 'A.',
      entityRefs: ['ReceivableTitle'],
    }],
    outbound: [{
      id: 'same',
      kind: 'event',
      to: 'comandaRestaurante',
      description: 'B.',
      entityRefs: ['ReceivableTitle'],
    }],
    plugins: [],
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_ID_DUPLICATE'));
});

void test('formatNs5IntegrationGate lists only errors', () => {
  const unknown = gateOf({
    inbound: [{
      id: 'chargeFromGhost',
      kind: 'moduleEndpoint',
      from: 'moduloInexistente',
      description: 'Unknown sibling.',
      entityRefs: ['Ghost'],
    }],
    outbound: [],
    plugins: [],
  });
  const feedback = formatNs5IntegrationGate(unknown.issues);
  assert.match(feedback, /NS5_INTEGRATION_ENTITY_UNKNOWN/);
  assert.doesNotMatch(feedback, /NS5_INTEGRATION_UNKNOWN_MODULE/);
});

void test('ownerStepId maps integration70 repair planIds', () => {
  assert.equal(ownerStepId('integration70'), 'integration70');
  assert.equal(ownerStepId('integration70-repair-1'), 'integration70');
  assert.equal(ownerStepId('integration70-done'), '');
});

void test('human prompt carries source request, catalog, registry and signals', () => {
  const human = buildNs5IntegrationHumanPrompt({
    sourcePrompt: CE11_PROMPT,
    userLanguage: 'pt-BR',
    actors: [
      { actorId: 'caixa', kind: 'internal', title: 'Cashier', description: 'Receives titles.' },
      { actorId: 'moduloOrigem', kind: 'system', title: 'Origin', description: 'Other modules post charges.' },
    ],
    entities: [{ entityId: 'ReceivableTitle', writer: 'inbound' }, { entityId: 'Payment' }],
    siblings: CE11_REGISTRY.map(name => ({ moduleName: name, roles: [], entities: [], events: [] })),
    inboundWriters: ['ReceivableTitle'],
    platformEventIds: ['mdmCreated'],
  });
  assert.match(human, /Source request/);
  assert.match(human, /moduloOrigem \(system\)/);
  assert.match(human, /comandaRestaurante/);
  assert.match(human, /stripe/);
  assert.match(human, /writer=inbound/);
  assert.match(human, /"kind": "systemActor"/);
  assert.match(human, /"kind": "pluginTerm"/);
  assert.match(human, /"kind": "siblingPresent"/);
});

void test('integration70 prompt has no domain examples and keeps MDM out of integration', () => {
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /submitNs5Integration/);
  assert.match(prompt, /unknownModule/);
  assert.match(prompt, /writer=inbound/);
  assert.match(prompt, /Shared master data/);
  assert.doesNotMatch(prompt, /comanda|garcom|waiter|stock|stripe|financeiro|pagador/i);
});

void test('siblings in the registry are an integration signal', () => {
  const signals = collectNs5IntegrationSignals(COMANDA_ACTORS, COMANDA_PROMPT, [{ moduleName: 'controleEstoque' }]);
  assert.ok(signals.some(signal => signal.kind === 'siblingPresent'));
  const empty = validateNs5Integration([], [], [], {
    actors: COMANDA_ACTORS,
    entities: [{ entityId: 'Comanda' }],
    registryModuleNames: ['controleEstoque'],
    siblings: [{ moduleName: 'controleEstoque', roles: [], entities: [], events: [] }],
    sourcePrompt: COMANDA_PROMPT,
  });
  assert.equal(empty.ok, false);
  assert.ok(empty.issues.some(issue => issue.code === 'NS5_INTEGRATION_SIGNAL_WITHOUT_ITEM'));
});

void test('writer inbound without inbound.writes fails', () => {
  const gate = gateOf({ inbound: [], outbound: [], plugins: [] }, {
    entities: [{ entityId: 'ReceivableTitle', writer: 'inbound' }, { entityId: 'Payment' }],
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_INBOUND_WRITER'));
});

void test('outbound.on Entity.create passes; unknown transition fails', () => {
  const ok = gateOf({
    inbound: [],
    outbound: [{
      id: 'titleCreated',
      kind: 'event',
      to: 'any',
      event: 'titleCreated',
      on: 'ReceivableTitle.create',
      entityRefs: ['ReceivableTitle'],
      description: 'A new title is published.',
    }],
    plugins: [],
  });
  assert.equal(ok.ok, true, ok.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const bad = gateOf({
    inbound: [],
    outbound: [{
      id: 'titleCreated',
      kind: 'event',
      to: 'any',
      event: 'titleCreated',
      on: 'ReceivableTitle.ghost',
      entityRefs: ['ReceivableTitle'],
      description: 'Unknown transition.',
    }],
    plugins: [],
  }, {
    entities: [{ entityId: 'ReceivableTitle', transitions: [{ transitionId: 'open' }] }],
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.issues.some(issue => issue.code === 'NS5_INTEGRATION_ON'));
});

void test('plugins.usedBy must name a journey step', () => {
  const gate = gateOf({
    inbound: [],
    outbound: [],
    plugins: [{ pluginId: 'stripe', description: 'Cards.', usedBy: ['ghost.step'] }],
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_USED_BY'));
});

void test('collectNs5InboundPending queues sibling and organization inboxes', () => {
  const pending = collectNs5InboundPending(
    [
      { id: 'comandaFechada', kind: 'event', from: 'comandaRestaurante', writes: ['ReceivableTitle'], effect: 'create', description: 'Closed tab.', entityRefs: [] },
      { id: 'futureClosed', kind: 'event', from: 'agendaClinica', writes: ['ReceivableTitle'], effect: 'create', description: 'Future.', entityRefs: [] },
    ],
    'financeiro',
    [{ moduleName: 'comandaRestaurante', roles: [], entities: [], events: [] }],
  );
  assert.equal(pending.length, 2);
  assert.equal(pending[0].targetModule, 'comandaRestaurante');
  assert.equal(pending[0].requestedBy, 'financeiro');
  assert.equal(pending[1].targetModule, 'organization');
  assert.equal(pending[1].to, 'agendaClinica');
});
