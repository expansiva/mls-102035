/// <mls fileReference="_102035_/l2/solution/gates/integration70/externalSystems.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { Ns5IntegrationExternalSystem } from '/_102035_/l2/solution/types.js';
import {
  buildNs5IntegrationArtifact,
  ns5IntegrationSchemaVersion,
  collectNs5IntegrationSignals,
  normalizeNs5IntegrationPayload,
} from '/_102035_/l2/solution/gates/integration70/contracts.js';
import { validateNs5Integration } from '/_102035_/l2/solution/gates/integration70/gate.js';

const OWN: Ns5IntegrationExternalSystem = {
  id: 'repoHost',
  title: 'Repository host',
  description: 'Where the module reads the code of a project.',
  settings: [
    { id: 'repositoryAddress', title: 'Repository address', description: 'The repository the project lives in.', secret: false },
    { id: 'accessKey', title: 'Access key', description: 'Lets the module read the repository.', secret: true },
  ],
  operations: [
    { operationId: 'listChanges', direction: 'call', description: 'The latest changes of the repository.' },
    { operationId: 'changePushed', direction: 'serve', description: 'A change was pushed.' },
  ],
};

const SIBLING: Ns5IntegrationExternalSystem = {
  id: 'zipLookup',
  title: 'Zip code lookup',
  description: 'Finds the address of a zip code.',
  settings: [],
  operations: [{ operationId: 'findAddress', direction: 'call', description: 'The address of one zip code.' }],
};

const JOURNEYS = [{ journeyId: 'readCode', stepIds: ['pickProject'] }];

function run(
  payload: Record<string, unknown>,
  siblingSystems: Ns5IntegrationExternalSystem[] = [],
) {
  const normalized = normalizeNs5IntegrationPayload(payload, siblingSystems);
  const gate = validateNs5Integration(
    normalized.inbound,
    normalized.outbound,
    normalized.plugins,
    {
      actors: [],
      entities: [],
      registryModuleNames: [],
      sourcePrompt: 'read the code of a project',
      journeySteps: JOURNEYS,
      siblingSystems,
    },
    normalized.connections,
    normalized.externalSystems,
  );
  return { normalized, gate };
}

const row = (connectionId: string, operationId: string, usedBy: string[]) => ({
  connectionId, operationId, usedBy, description: 'Used by the module.',
});

const codes = (gate: ReturnType<typeof run>['gate']) => gate.issues.map(issue => issue.code);

void test('a row resolves against the platform catalog', () => {
  const { normalized, gate } = run({ connections: [row('cm', 'readAgent', ['readCode.pickProject'])] });
  assert.equal(normalized.connections[0].direction, 'call');
  assert.equal(gate.ok, true, gate.issues.map(issue => issue.message).join('\n'));
});

void test('a row resolves against a system of this module, call and serve', () => {
  const { normalized, gate } = run({
    externalSystems: [OWN],
    connections: [
      row('repoHost', 'listChanges', ['readCode.pickProject']),
      row('repoHost', 'changePushed', ['What the arrival does.']),
    ],
  });
  assert.deepEqual(normalized.connections.map(item => item.direction), ['call', 'serve']);
  assert.equal(gate.ok, true, gate.issues.map(issue => issue.message).join('\n'));
});

void test('a row resolves against a system of a sibling module', () => {
  const { normalized, gate } = run({
    connections: [row('zipLookup', 'findAddress', ['readCode.pickProject'])],
  }, [SIBLING]);
  assert.equal(normalized.connections[0].direction, 'call');
  assert.equal(gate.ok, true, gate.issues.map(issue => issue.message).join('\n'));
});

void test('a system that nobody declares fails', () => {
  const { gate } = run({ connections: [row('zipLookup', 'findAddress', ['readCode.pickProject'])] });
  assert.ok(codes(gate).includes('NS5_INTEGRATION_CONNECTION_UNKNOWN'));
});

void test('an operation that the system does not declare fails', () => {
  const { gate } = run({
    externalSystems: [OWN],
    connections: [row('repoHost', 'deleteRepository', ['readCode.pickProject'])],
  });
  assert.ok(codes(gate).includes('NS5_INTEGRATION_CONNECTION_UNKNOWN'));
});

void test('the call rules hold for a declared system: usedBy must be real, entityRefs and effect go together', () => {
  const missingUsedBy = run({ externalSystems: [OWN], connections: [row('repoHost', 'listChanges', ['readCode.noStep'])] });
  assert.ok(codes(missingUsedBy.gate).includes('NS5_INTEGRATION_CONNECTION_USED_BY'));
  const effectAlone = run({
    externalSystems: [OWN],
    connections: [{ ...row('repoHost', 'listChanges', ['readCode.pickProject']), effect: 'read' }],
  });
  assert.ok(codes(effectAlone.gate).includes('NS5_INTEGRATION_CONNECTION_EFFECT'));
});

void test('the same row twice fails', () => {
  const { gate } = run({
    externalSystems: [OWN],
    connections: [row('repoHost', 'listChanges', ['readCode.pickProject']), row('repoHost', 'listChanges', ['readCode.pickProject'])],
  });
  assert.ok(codes(gate).includes('NS5_INTEGRATION_CONNECTION_DUPLICATE'));
});

void test('a system id repeats a platform catalog, a sibling or itself', () => {
  assert.ok(codes(run({ externalSystems: [{ ...OWN, id: 'cm' }] }).gate).includes('NS5_INTEGRATION_SYSTEM_ID'));
  assert.ok(codes(run({ externalSystems: [{ ...OWN, id: 'zipLookup' }] }, [SIBLING]).gate).includes('NS5_INTEGRATION_SYSTEM_ID'));
  assert.ok(codes(run({ externalSystems: [OWN, OWN] }).gate).includes('NS5_INTEGRATION_SYSTEM_ID'));
});

void test('ids are lowerCamel and unique at their level', () => {
  assert.ok(codes(run({ externalSystems: [{ ...OWN, id: 'Repo_Host' }] }).gate).includes('NS5_INTEGRATION_SYSTEM_ID'));
  const settings = [OWN.settings[0], { ...OWN.settings[1], id: OWN.settings[0].id }];
  assert.ok(codes(run({ externalSystems: [{ ...OWN, settings }] }).gate).includes('NS5_INTEGRATION_SYSTEM_SETTING'));
  assert.ok(codes(run({ externalSystems: [{ ...OWN, settings: [{ ...OWN.settings[0], id: 'Bad-Id' }] }] }).gate).includes('NS5_INTEGRATION_SYSTEM_SETTING'));
  const operations = [OWN.operations[0], { ...OWN.operations[1], operationId: OWN.operations[0].operationId }];
  assert.ok(codes(run({ externalSystems: [{ ...OWN, operations }] }).gate).includes('NS5_INTEGRATION_SYSTEM_OPERATION'));
});

void test('direction, texts and the secret flag are required', () => {
  const badDirection = { ...OWN, operations: [{ ...OWN.operations[0], direction: 'both' }] };
  assert.ok(codes(run({ externalSystems: [badDirection] }).gate).includes('NS5_INTEGRATION_SYSTEM_OPERATION'));
  assert.ok(codes(run({ externalSystems: [{ ...OWN, title: '' }] }).gate).includes('NS5_INTEGRATION_SYSTEM_TEXT'));
  assert.ok(codes(run({ externalSystems: [{ ...OWN, description: '' }] }).gate).includes('NS5_INTEGRATION_SYSTEM_TEXT'));
  const noSecretFlag = { ...OWN, settings: [{ id: 'accessKey', title: 'Access key', description: 'Lets the module read.' }] };
  assert.ok(codes(run({ externalSystems: [noSecretFlag] }).gate).includes('NS5_INTEGRATION_SYSTEM_SETTING'));
  assert.ok(codes(run({ externalSystems: [{ ...OWN, operations: [{ ...OWN.operations[0], description: '' }] }] }).gate).includes('NS5_INTEGRATION_SYSTEM_TEXT'));
});

void test('a system with no setting is valid', () => {
  assert.equal(run({ externalSystems: [SIBLING] }).gate.ok, true);
});

void test('the artifact is v4 only when it declares a system; the rest stays v3 and byte for byte', () => {
  const plain = buildNs5IntegrationArtifact('orders', [], [], []);
  assert.equal(plain.schemaVersion, '2026-11-17-ns5-integration-v3');
  assert.equal('externalSystems' in plain, false);
  const withSystem = buildNs5IntegrationArtifact('orders', [], [], [], [], [OWN]);
  assert.equal(withSystem.schemaVersion, '2026-11-19-ns5-integration-v4');
  assert.deepEqual(withSystem.externalSystems, [OWN]);
});

void test('the version is one function of the content', () => {
  assert.equal(ns5IntegrationSchemaVersion([]), '2026-11-17-ns5-integration-v3');
  assert.equal(ns5IntegrationSchemaVersion(undefined), '2026-11-17-ns5-integration-v3');
  assert.equal(ns5IntegrationSchemaVersion([OWN]), '2026-11-19-ns5-integration-v4');
});

void test('l4_p4_123: a system with a serve operation needs a secret setting', () => {
  const serveOnly = { ...OWN, settings: [OWN.settings[0]] };
  const refused = run({ externalSystems: [serveOnly] }).gate;
  assert.equal(refused.ok, false);
  const issue = refused.issues.find(item => item.code === 'NS5_INTEGRATION_SYSTEM_SERVE_SECRET');
  assert.ok(issue);
  assert.match(issue.message, /repoHost/);
  assert.equal(issue.path, 'externalSystems[0].settings');
  assert.equal(run({ externalSystems: [{ ...serveOnly, settings: [] }] }).gate.ok, false);
  assert.equal(run({ externalSystems: [OWN] }).gate.ok, true);
  // A system that only calls needs no secret (a public lookup).
  assert.equal(run({ externalSystems: [SIBLING] }).gate.ok, true);
});

void test('l4_p4_127 s2: an ontology connectionId is declared, refused, or already known', () => {
  const citedSystem = {
    id: 'citedSystem', title: 'Cited', description: 'A system this module declares.', settings: [], operations: [],
  };
  const cited = [{ entityId: 'OwnNote', externalConnectionId: 'citedSystem' }];
  const declared = validateNs5Integration([], [], [], {
    actors: [], entities: cited, registryModuleNames: [], sourcePrompt: 'a note',
  }, [], [citedSystem]);
  assert.equal(declared.ok, true, declared.issues.map(issue => issue.message).join('\n'));

  const missing = validateNs5Integration([], [], [], {
    actors: [], entities: cited, registryModuleNames: [], sourcePrompt: 'a note',
  });
  assert.equal(missing.ok, false);
  const issue = missing.issues.find(item => item.code === 'NS5_INTEGRATION_ENTITY_SYSTEM_MISSING');
  assert.equal(issue?.path, 'externalSystems');
  assert.match(issue?.message || '', /platform catalog/);
  assert.match(issue?.message || '', /sibling/);
  assert.match(issue?.message || '', /Declare a system with this id in externalSystems/);

  const known = validateNs5Integration([], [], [], {
    actors: [],
    entities: [
      { entityId: 'CatalogNote', externalConnectionId: 'cm' },
      { entityId: 'SiblingNote', externalConnectionId: 'siblingSystem' },
    ],
    registryModuleNames: [],
    sourcePrompt: 'a note',
    siblingSystems: [{ id: 'siblingSystem', title: 'Sibling', description: 'A system a sibling declares.', settings: [], operations: [] }],
  });
  assert.equal(known.issues.some(item => item.code === 'NS5_INTEGRATION_ENTITY_SYSTEM_MISSING'), false);
  assert.equal(known.ok, true, known.issues.map(item => item.message).join('\n'));

  const signals = collectNs5IntegrationSignals([], 'a note', [], { entities: cited });
  assert.ok(signals.some(signal => signal.kind === 'externalEntitySystem' && signal.entityId === 'OwnNote' && signal.term === 'citedSystem'));
  const catalogOnly = collectNs5IntegrationSignals([], 'a note', [], {
    entities: [{ entityId: 'CatalogNote', externalConnectionId: 'cm' }, { entityId: 'SiblingNote', externalConnectionId: 'siblingSystem' }],
    siblingSystems: [{ id: 'siblingSystem' }],
  });
  assert.equal(catalogOnly.some(signal => signal.kind === 'externalEntitySystem'), false);
  assert.ok(missing.issues.some(item => item.code === 'NS5_INTEGRATION_SIGNAL_WITHOUT_ITEM'));
});

void test('l4_p4_130 s2: an arrival does not write an entity that lives outside', () => {
  const remoteHost: Ns5IntegrationExternalSystem = {
    id: 'remoteHost',
    title: 'Remote host',
    description: 'A system outside the module.',
    settings: [{ id: 'accessKey', title: 'Access key', description: 'Checks what arrives.', secret: true }],
    operations: [
      { operationId: 'noteChanged', direction: 'serve', description: 'A note changed.' },
      { operationId: 'writeNote', direction: 'call', description: 'Asks the host to write a note.' },
    ],
  };
  const entities = [
    { entityId: 'RemoteNote', externalConnectionId: 'remoteHost' },
    { entityId: 'LocalTable' },
    { entityId: 'LocalRole' },
  ];
  const context = {
    actors: [],
    entities,
    registryModuleNames: [],
    sourcePrompt: 'a local note',
    journeySteps: [{ journeyId: 'keepLocal', stepIds: ['saveRow'] }],
  };
  const inbound = (writes: string[]) => ({
    id: 'noteArrived',
    kind: 'event' as const,
    from: 'organization',
    effect: 'update' as const,
    writes,
    description: 'A notice arrived.',
    entityRefs: [] as string[],
  });
  const serve = (entityRefs: string[], effect: 'update' | 'create') => ({
    connectionId: 'remoteHost',
    operationId: 'noteChanged',
    direction: 'serve' as const,
    usedBy: ['What the arrival does.'],
    entityRefs,
    effect,
    description: 'A notice arrived.',
  });

  const refusedInbound = validateNs5Integration([inbound(['RemoteNote'])], [], [], context, [], [remoteHost]);
  const inboundIssue = refusedInbound.issues.find(item => item.code === 'NS5_INTEGRATION_ARRIVAL_WRITES_EXTERNAL');
  assert.equal(inboundIssue?.path, 'inbound[0].writes');
  assert.match(inboundIssue?.message || '', /RemoteNote/);
  assert.match(inboundIssue?.message || '', /remoteHost/);

  const refusedServe = validateNs5Integration([], [], [], context, [serve(['RemoteNote'], 'update')], [remoteHost]);
  const serveIssue = refusedServe.issues.find(item => item.code === 'NS5_INTEGRATION_ARRIVAL_WRITES_EXTERNAL');
  assert.equal(serveIssue?.path, 'connections[0].entityRefs');

  const accepted = validateNs5Integration(
    [inbound(['LocalTable'])],
    [],
    [],
    context,
    [serve(['LocalRole'], 'create')],
    [remoteHost],
  );
  assert.equal(accepted.issues.some(item => item.code === 'NS5_INTEGRATION_ARRIVAL_WRITES_EXTERNAL'), false);
  assert.equal(accepted.ok, true, accepted.issues.map(item => item.message).join('\n'));

  const call = validateNs5Integration([], [], [], context, [{
    connectionId: 'remoteHost',
    operationId: 'writeNote',
    direction: 'call',
    usedBy: ['keepLocal.saveRow'],
    entityRefs: ['RemoteNote'],
    effect: 'update',
    description: 'Asks the host to write a note.',
  }], [remoteHost]);
  assert.equal(call.issues.some(item => item.code === 'NS5_INTEGRATION_ARRIVAL_WRITES_EXTERNAL'), false);
  assert.equal(call.ok, true, call.issues.map(item => item.message).join('\n'));
});
