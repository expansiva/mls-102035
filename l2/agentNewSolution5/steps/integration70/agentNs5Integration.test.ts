/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/integration70/agentNs5Integration.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/solution/helpers/ns4WorkerTools.js';
import { ownerStepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import type { Ns5IntegrationExternalSystem, Ns5IntegrationItem, Ns5IntegrationPlugin } from '/_102035_/l2/solution/types.js';
import { repoInsideModuleIntegration } from '/_102035_/l2/agentNewSolution5/steps/integration70/fixtures/repoInsideModule-integration.defs.js';
import { integrationModuleIntegration } from '/_102035_/l2/agentNewSolution5/steps/integration70/fixtures/integrationModule-integration.defs.js';
import { usesSiblingSystemIntegration } from '/_102035_/l2/agentNewSolution5/steps/integration70/fixtures/usesSiblingSystem-integration.defs.js';
import { agendaClinicaIntegration } from '/_102035_/l2/solution/fixtures/integration70/agendaClinica-integration.defs.js';
import { buildNs5IntegrationHumanPrompt, buildNs5IntegrationTool } from '/_102035_/l2/agentNewSolution5/steps/integration70/agentNs5Integration.js';
import { readSiblingSystems } from '/_102035_/l2/solution/ns5Siblings.js';
import {
  NS5_INTEGRATION_DROP_TRANSITION_REF,
  NS5_PLUGIN_CATALOG,
  NS5_PLUGIN_IDS,
  buildNs5IntegrationArtifact,
  collectNs5InboundPending,
  collectNs5IntegrationSignals,
  normalizeNs5IntegrationPayload,
  promptMentionsTerm,
  type Ns5IntegrationActorView,
  type Ns5IntegrationEntityView,
} from '/_102035_/l2/solution/gates/integration70/contracts.js';
import {
  formatNs5IntegrationGate,
  validateNs5Integration,
} from '/_102035_/l2/solution/gates/integration70/gate.js';

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
  }, [], []);
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
  }, [], []);
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
      readFileSync(path.join(HERE, '../../../solution/fixtures/integration70', `${moduleName}-draft.json`), 'utf8'),
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
  }, [], []);
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
  assert.equal(artifact.schemaVersion, '2026-11-17-ns5-integration-v3');
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
    usedByRefs: ['registrarRecebimento.localizarTitulo', 'registrarRecebimento.registrarPagamento'],
    siblings: CE11_REGISTRY.map(name => ({ moduleName: name, roles: [], entities: [], events: [] })),
    inboundWriters: ['ReceivableTitle'],
    platformEventIds: ['mdmCreated'],
  });
  // ns5_46 follow-up: the refs `usedBy` may name are listed, instead of promised and never built.
  assert.match(human, /registrarRecebimento\.registrarPagamento/);
  assert.match(human, /Source request/);
  assert.match(human, /moduloOrigem \(system\)/);
  assert.match(human, /comandaRestaurante/);
  assert.match(human, /stripe/);
  assert.match(human, /writer=inbound/);
  assert.match(human, /"kind": "systemActor"/);
  assert.match(human, /"kind": "pluginTerm"/);
  assert.match(human, /"kind": "siblingPresent"/);
  assert.match(human, /- registrarRecebimento\.localizarTitulo\n/);
  assert.doesNotMatch(human, /registrarRecebimento\.localizarTitulo ·/);
});

void test('human prompt lists the text of each usedBy ref and cuts it at 240 characters', () => {
  const long = `x${'y'.repeat(300)}`;
  const human = buildNs5IntegrationHumanPrompt({
    sourcePrompt: 'a request',
    userLanguage: 'en',
    actors: [],
    entities: [],
    usedByRefs: ['openItem.lookUp', 'refreshList.chooseRows', 'refreshList.untouched'],
    usedByTexts: {
      openItem: 'ignored because the key is not a ref',
      'openItem.lookUp': 'Look up: Find one local row.',
      'refreshList.chooseRows': `llm: ${long}`,
    },
    siblings: [],
    inboundWriters: [],
    platformEventIds: [],
  });
  assert.match(human, /- openItem\.lookUp · Look up: Find one local row\./);
  const cut = human.split('\n').find(line => line.startsWith('- refreshList.chooseRows · '));
  assert.ok(cut);
  const text = cut.slice('- refreshList.chooseRows · '.length);
  assert.equal(text.length, 240);
  assert.equal(text, `llm: ${long}`.replace(/\s+/g, ' ').trim().slice(0, 240));
  assert.match(human, /- refreshList\.untouched\n/);
  assert.doesNotMatch(human, /untouched ·/);
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
  }, [], []);
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

function connectionGate(
  raw: Record<string, unknown>,
  extras: Partial<{
    entities: Ns5IntegrationEntityView[];
    sourcePrompt: string;
    actors: Ns5IntegrationActorView[];
  }> = {},
) {
  const { inbound, outbound, plugins, connections } = drafts({ connections: [raw] });
  return {
    connections,
    gate: validateNs5Integration(inbound, outbound, plugins, {
      actors: extras.actors || COMANDA_ACTORS,
      entities: extras.entities || CE11_ENTITIES,
      registryModuleNames: [],
      sourcePrompt: extras.sourcePrompt || 'the module talks to cm',
      journeySteps: [{ journeyId: 'pagarComPlugin', stepIds: ['pagarTitulo'] }],
    }, connections, []),
  };
}

void test('a catalog connection is kept and direction comes from the catalog', () => {
  const { connections, gate } = connectionGate({
    connectionId: 'cm',
    operationId: 'readAgent',
    direction: 'serve',
    usedBy: ['pagarComPlugin.pagarTitulo'],
    description: 'Read one agent.',
  });
  assert.equal(connections[0].direction, 'call');
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('an invented connection fails the catalog gate', () => {
  const { gate } = connectionGate({
    connectionId: 'slack',
    operationId: 'readAgent',
    usedBy: ['pagarComPlugin.pagarTitulo'],
    description: 'Not a catalog connection.',
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_CONNECTION_UNKNOWN'));
});

void test('an invented operation fails the catalog gate', () => {
  const { gate } = connectionGate({
    connectionId: 'cm',
    operationId: 'explodeAgent',
    usedBy: ['pagarComPlugin.pagarTitulo'],
    description: 'Not a catalog operation.',
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_CONNECTION_UNKNOWN'));
});

void test('call usedBy that does not exist fails', () => {
  const { gate } = connectionGate({
    connectionId: 'cm',
    operationId: 'readAgent',
    usedBy: ['pagarComPlugin.naoExiste'],
    description: 'Read one agent.',
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_CONNECTION_USED_BY'));
});

void test('entityRefs without effect fails', () => {
  const { gate } = connectionGate({
    connectionId: 'cm',
    operationId: 'readAgent',
    usedBy: ['pagarComPlugin.pagarTitulo'],
    entityRefs: ['ReceivableTitle'],
    description: 'Read one agent into a title.',
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_CONNECTION_EFFECT'));
});

void test('serve create covers writer inbound', () => {
  const { connections, gate } = connectionGate({
    connectionId: 'cm',
    operationId: 'record',
    direction: 'call',
    usedBy: ['not a ref'],
    entityRefs: ['ReceivableTitle'],
    effect: 'create',
    description: 'An arrival records the title.',
  }, {
    entities: [{ entityId: 'ReceivableTitle', writer: 'inbound' }],
  });
  assert.equal(connections[0].direction, 'serve');
  assert.equal(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_INBOUND_WRITER'), false);
  assert.equal(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_CONNECTION_USED_BY'), false);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('prompt that names cm raises a connectionTerm signal', () => {
  const signals = collectNs5IntegrationSignals(COMANDA_ACTORS, 'the module talks to cm');
  assert.ok(signals.some(signal => signal.kind === 'connectionTerm' && signal.term === 'cm'));
});

void test('buildNs5IntegrationArtifact omits connections when there is none', () => {
  const artifact = buildNs5IntegrationArtifact('comandaRestaurante5', [], [], []);
  assert.equal('connections' in artifact, false);
});

void test('a connection term alone never forces an item (cm may be centimeters)', () => {
  const gate = validateNs5Integration([], [], [], {
    actors: [],
    entities: CE11_ENTITIES,
    registryModuleNames: [],
    sourcePrompt: 'the shelf is 40 cm wide',
  }, [], []);
  assert.equal(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_SIGNAL_WITHOUT_ITEM'), false);
});

void test('serve keeps its usedBy prose; call still drops what is not a ref', () => {
  const serve = connectionGate({
    connectionId: 'cm',
    operationId: 'describe',
    usedBy: ['the cm asks which tools the agent has'],
    description: 'Describe the agent tools.',
  });
  assert.deepEqual(serve.connections[0].usedBy, ['the cm asks which tools the agent has']);
  const call = connectionGate({
    connectionId: 'cm',
    operationId: 'readAgent',
    usedBy: ['not a ref'],
    description: 'Read one agent.',
  });
  assert.deepEqual(call.connections[0].usedBy, []);
});

const AGENTS_SOURCE_PROMPT = [
  'Agents module: the home of the company AI agents inside the app. The agents live in the cm (collab messages).',
  'This module owns only the tools: the catalog of actions of the app modules and the cm tools.',
  'Tool catalog: rebuilt when a module is created or a new release arrives.',
].join('\n');

void test('l4_p4_108 s0: the word platform alone raises no connection signal', () => {
  const signals = collectNs5IntegrationSignals(COMANDA_ACTORS, 'The platform shows a list of tables. The platform keeps the orders.');
  assert.equal(signals.some(signal => signal.kind === 'connectionTerm'), false);
});

void test('l4_p4_108 s0: release and catalog together, or the operation name, raise the platform signal', () => {
  const agents = collectNs5IntegrationSignals(COMANDA_ACTORS, AGENTS_SOURCE_PROMPT);
  const terms = agents.filter(signal => signal.kind === 'connectionTerm').map(signal => signal.term);
  assert.deepEqual(terms, ['cm', 'release + catalog']);
  const byName = collectNs5IntegrationSignals(COMANDA_ACTORS, 'It answers releaseCatalogChanged.');
  assert.deepEqual(byName.filter(signal => signal.kind === 'connectionTerm').map(signal => signal.term), ['releaseCatalogChanged']);
  const onlyRelease = collectNs5IntegrationSignals(COMANDA_ACTORS, 'A new release of the product arrives each month.');
  assert.equal(onlyRelease.some(signal => signal.kind === 'connectionTerm'), false);
});

// --- l4_p4_109 s2: an arrival from a connection is one serve row, never an inbound too ----------

function agentsR3Integration(): Record<string, unknown> {
  const source = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../solution/fixtures/integration70/agents/integration.defs.ts'),
    'utf8',
  );
  const start = source.indexOf('= {') + 2;
  const end = source.lastIndexOf('} as const') + 1;
  return JSON.parse(source.slice(start, end)) as Record<string, unknown>;
}

void test('l4_p4_109: the integration of agents (71659f7a) loses the 3 inbound that repeat a serve row; toolLeftRelease stays and the gate charges it', () => {
  const normalized = normalizeNs5IntegrationPayload(agentsR3Integration());
  assert.deepEqual(normalized.inbound.map(item => item.id), ['toolLeftRelease']);
  assert.deepEqual(
    normalized.normalizations.filter(item => item.kind === 'inboundMergedIntoServe').map(item => item.inboundId),
    ['draftNoticeReceived', 'executionRecorded', 'releaseCatalogDelivered'],
  );
  assert.equal(normalized.connections.filter(row => row.direction === 'serve').length, 4);
  const gate = validateNs5Integration(normalized.inbound, normalized.outbound, normalized.plugins, {
    actors: [],
    entities: [{ entityId: 'Tool', writer: 'inbound', transitions: [{ transitionId: 'markRemoved' }] }, { entityId: 'DraftNotice', writer: 'inbound' }, { entityId: 'AgentExecution', writer: 'inbound' }],
    registryModuleNames: [],
    sourcePrompt: 'the cm and the release catalog',
  }, normalized.connections, []);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_INBOUND_NO_SERVE' && issue.path === 'inbound[0].from'));
});

void test('l4_p4_109: an inbound from a connection that no serve row matches is a phantom arrival; one from a sibling or a system outside the catalog is not touched', () => {
  const serve = {
    connectionId: 'cm', operationId: 'record', direction: 'serve', usedBy: ['the cm tells what an agent did'],
    entityRefs: ['AgentExecution'], effect: 'create', description: '',
  };
  const merged = normalizeNs5IntegrationPayload({
    inbound: [
      { id: 'executionRecorded', kind: 'external', from: 'cm', writes: ['AgentExecution'], effect: 'create', description: 'The cm sends a summary of each execution.' },
      { id: 'otherArrival', kind: 'external', from: 'cm', writes: ['Other'], effect: 'create', description: 'x' },
      { id: 'billingPing', kind: 'external', from: 'billingSystem', writes: ['AgentExecution'], effect: 'create', description: 'x' },
    ],
    outbound: [], plugins: [], connections: [serve],
  });
  assert.deepEqual(merged.inbound.map(item => item.id), ['otherArrival', 'billingPing']);
  assert.equal(merged.connections[0].description, 'The cm sends a summary of each execution.');
  const context = {
    actors: [], entities: [{ entityId: 'AgentExecution', writer: 'inbound' as const }, { entityId: 'Other' }], registryModuleNames: [], sourcePrompt: 'cm',
  };
  const gate = validateNs5Integration(merged.inbound, merged.outbound, merged.plugins, context, merged.connections, []);
  assert.deepEqual(
    gate.issues.filter(issue => issue.code === 'NS5_INTEGRATION_INBOUND_NO_SERVE').map(issue => issue.path),
    ['inbound[0].from'],
  );
});

void test('the tool asks for externalSystems, always present, with no field about how to reach the system', () => {
  const schema = loadSchema() as { required: string[]; $defs: Record<string, { properties: Record<string, unknown>; required: string[] }> };
  assert.ok(schema.required.includes('externalSystems'));
  const system = schema.$defs.externalSystem;
  assert.deepEqual(Object.keys(system.properties).sort(), ['description', 'id', 'operations', 'settings', 'title']);
  assert.deepEqual([...system.required].sort(), ['description', 'id', 'operations', 'settings', 'title']);
  assert.doesNotMatch(JSON.stringify(system), /url|address|endpoint|method|header|auth|format|inputType|outputType/i);
});

void test('the prompt explains the declared system as intent only', () => {
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /externalSystems/);
  assert.match(prompt, /Say nothing about how/);
  assert.match(prompt, /already declares the system/);
  assert.match(prompt, /do not declare it again/);
  assert.match(prompt, /any `serve` operation has at least one setting with `secret: true`/);
  assert.match(prompt, /A step or stage that goes over the records of an entity that lives outside the module \(for each \.\.\., every \.\.\.\) is in `usedBy` of the `call` that lists or reads that entity/);
  assert.doesNotMatch(prompt, /github|zip ?code|\bcep\b/i);
});

void test('human prompt lists the systems the siblings declare', () => {
  const human = buildNs5IntegrationHumanPrompt({
    sourcePrompt: 'the module reads the address of a zip code',
    userLanguage: 'en',
    actors: [],
    entities: [],
    usedByRefs: [],
    siblings: [{ moduleName: 'lookups', roles: [], entities: [], events: [] }],
    siblingSystems: [{
      moduleName: 'lookups',
      systems: [{
        id: 'zipLookup',
        title: 'Zip code lookup',
        description: 'Finds the address of a zip code.',
        settings: [],
        operations: [{ operationId: 'findAddress', direction: 'call', description: 'The address of one zip code.' }],
      }],
    }],
    inboundWriters: [],
    platformEventIds: [],
  });
  assert.match(human, /External systems the sibling modules already declare/);
  assert.match(human, /zipLookup · declared by lookups/);
  assert.match(human, /findAddress \(call: The address of one zip code\.\)/);
  const none = buildNs5IntegrationHumanPrompt({
    sourcePrompt: 'x', userLanguage: 'en', actors: [], entities: [], usedByRefs: [], siblings: [], inboundWriters: [], platformEventIds: [],
  });
  assert.match(none, /External systems the sibling modules already declare[^\n]*\n\(none\)/);
  assert.doesNotMatch(none, /## Systems the ontology cites/);
});

void test('l4_p4_127 s2: the prompt lists the systems the ontology cites and marks the one this module declares', () => {
  const human = buildNs5IntegrationHumanPrompt({
    sourcePrompt: 'a request',
    userLanguage: 'en',
    actors: [],
    entities: [
      { entityId: 'CatalogNote', externalConnectionId: 'cm' },
      { entityId: 'SiblingNote', externalConnectionId: 'siblingSystem' },
      { entityId: 'OwnNote', externalConnectionId: 'citedSystem' },
    ],
    usedByRefs: [],
    siblings: [],
    siblingSystems: [{
      moduleName: 'sibling',
      systems: [{ id: 'siblingSystem', title: 'Sibling', description: 'A system a sibling declares.', settings: [], operations: [] }],
    }],
    inboundWriters: [],
    platformEventIds: [],
  });
  assert.match(human, /## Systems the ontology cites/);
  assert.match(human, /- CatalogNote → cm/);
  assert.match(human, /- SiblingNote → siblingSystem/);
  assert.match(human, /- OwnNote → citedSystem · this module declares it/);
});

// l4_p4_117 s5: three artifacts of the three cases and one recorded v2, with no model call. The `.defs.ts`
// fixtures are compiled by the project typecheck (`satisfies Ns5Readonly<Ns5IntegrationArtifact>`).
const REHEARSAL_JOURNEYS = [
  { journeyId: 'reviewChanges', stepIds: ['pickProject'] },
  { journeyId: 'registerCustomer', stepIds: ['typeZipCode'] },
];

function rehearse(
  artifact: unknown,
  siblingSystems: Ns5IntegrationExternalSystem[] = [],
  siblingNames: string[] = [],
) {
  const normalized = normalizeNs5IntegrationPayload(structuredClone(artifact), siblingSystems);
  const gate = validateNs5Integration(normalized.inbound, normalized.outbound, normalized.plugins, {
    actors: [],
    entities: [],
    registryModuleNames: siblingNames,
    siblings: siblingNames.map(name => ({ moduleName: name, roles: [], entities: [], events: [] })),
    sourcePrompt: 'rehearsal',
    journeySteps: REHEARSAL_JOURNEYS,
    siblingSystems,
  }, normalized.connections, normalized.externalSystems);
  const rebuilt = buildNs5IntegrationArtifact(
    (artifact as { moduleName: string }).moduleName,
    normalized.inbound, normalized.outbound, normalized.plugins, normalized.connections, normalized.externalSystems,
  );
  return { normalized, gate, rebuilt };
}

void test('rehearsal 1: the module declares its system and uses it', () => {
  const { gate, rebuilt } = rehearse(repoInsideModuleIntegration);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.deepEqual(rebuilt, JSON.parse(JSON.stringify(repoInsideModuleIntegration)));
});

void test('rehearsal 2: the integration module declares the system and serves; it has no call of its own', () => {
  const { gate, normalized, rebuilt } = rehearse(integrationModuleIntegration);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.deepEqual(normalized.connections.map(row => row.direction), ['serve']);
  assert.deepEqual(rebuilt, JSON.parse(JSON.stringify(integrationModuleIntegration)));
});

void test('rehearsal 3: a module uses the system its sibling declares', () => {
  const siblingSystems = JSON.parse(JSON.stringify(integrationModuleIntegration.externalSystems)) as Ns5IntegrationExternalSystem[];
  const { gate, rebuilt } = rehearse(usesSiblingSystemIntegration, siblingSystems, ['integrations']);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.deepEqual(rebuilt, JSON.parse(JSON.stringify(usesSiblingSystemIntegration)));
  // Without the sibling's declaration the same row has nowhere to resolve.
  const alone = rehearse(usesSiblingSystemIntegration);
  assert.ok(alone.gate.issues.some(issue => issue.code === 'NS5_INTEGRATION_CONNECTION_UNKNOWN'));
});

void test('rehearsal 4: a recorded v2 artifact is still read and rebuilt without a system', () => {
  const { normalized, rebuilt } = rehearse(agendaClinicaIntegration);
  assert.deepEqual(normalized.externalSystems, []);
  assert.equal('externalSystems' in rebuilt, false);
  assert.equal(rebuilt.schemaVersion, '2026-11-17-ns5-integration-v3');
});

// l4_p4_118 s0: the sibling is read from the L4 it wrote (`integration.defs.ts`), through the Studio fs (faked here).
void test('readSiblingSystems reads the systems from the L4 of each sibling: one declares, one uses, one has no file', async () => {
  const files: Record<string, { project: number; level: number; folder: string; shortName: string; extension: string; status: string; getValueInfo: () => Promise<{ content: string }>; getContent: () => Promise<string> }> = {};
  const keyOf = (info: { project?: number; level?: number; folder?: string; shortName?: string; extension?: string }) =>
    [info.project, info.level, info.folder, info.shortName, info.extension].join('|');
  const before = { files: mls.stor.files, getKey: mls.stor.getKeyToFile, project: mls.actualProject };
  mls.actualProject = 102047;
  mls.stor.getKeyToFile = keyOf as typeof mls.stor.getKeyToFile;
  mls.stor.files = files as unknown as typeof mls.stor.files;
  const put = (moduleName: string, artifact: unknown) => {
    const content = `export const ${moduleName}Integration = ${JSON.stringify(artifact, null, 2)};\n`;
    const info = { project: 102047, level: 4, folder: moduleName, shortName: 'integration', extension: '.defs.ts' };
    files[keyOf(info)] = { ...info, status: 'changed', getValueInfo: async () => ({ content }), getContent: async () => content };
  };
  try {
    put('integrations', integrationModuleIntegration);
    put('customers', usesSiblingSystemIntegration);
    const names = ['integrations', 'customers', 'noL4Yet'];
    const found = await readSiblingSystems(names.map(moduleName => ({ moduleName, roles: [], entities: [], events: [] })));
    assert.deepEqual(found.map(item => item.moduleName), ['integrations']);
    assert.deepEqual(found[0].systems.map(system => system.id), ['zipLookup']);
    assert.deepEqual(found[0].systems[0].operations.map(operation => operation.operationId), ['findAddress', 'addressFound']);
  } finally {
    mls.stor.files = before.files;
    mls.stor.getKeyToFile = before.getKey;
    mls.actualProject = before.project;
  }
});
