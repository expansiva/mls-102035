/// <mls fileReference="_102035_/l2/solution/gates/integration70/externalSystems.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { isNs5IntegrationSchemaVersion, type Ns5IntegrationExternalSystem } from '/_102035_/l2/solution/types.js';
import {
  buildNs5IntegrationArtifact,
  ns5IntegrationSchemaVersion,
  ns5UpgradeArrivalForm,
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
  assert.equal(ns5IntegrationSchemaVersion([OWN], {
    connections: [{ direction: 'call', entityEffects: [] }],
  }), '2026-11-19-ns5-integration-v4');
  assert.equal(ns5IntegrationSchemaVersion([], {
    inbound: [{ entityEffects: [] }],
  }), '2026-11-20-ns5-integration-v5');
  assert.equal(ns5IntegrationSchemaVersion([], {
    connections: [{ direction: 'serve', entityEffects: [{ entityId: 'Item', effects: ['list'] }] }],
  }), '2026-11-20-ns5-integration-v5');
  assert.equal(isNs5IntegrationSchemaVersion('2026-11-20-ns5-integration-v5'), true);
  assert.equal(isNs5IntegrationSchemaVersion('2026-11-17-ns5-integration-v3'), true);
  assert.equal(isNs5IntegrationSchemaVersion('nope'), false);
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

void test('l4_p4_130 s3b: an arrival with no writes has no effect', () => {
  const dropped = normalizeNs5IntegrationPayload({
    inbound: [{
      id: 'noteArrived',
      kind: 'event',
      from: 'organization',
      writes: [],
      effect: 'update',
      transitionRef: 'LocalTable.publish',
      description: 'A notice arrived.',
    }],
  });
  assert.equal(dropped.inbound[0].effect, undefined);
  assert.equal(dropped.inbound[0].transitionRef, undefined);
  assert.deepEqual(dropped.normalizations.map(item => ({ kind: item.kind, detail: item.detail })), [
    { kind: 'dropEffectWithoutWrites', detail: 'update' },
  ]);

  const kept = normalizeNs5IntegrationPayload({
    inbound: [{
      id: 'noteArrived',
      kind: 'event',
      from: 'organization',
      writes: ['LocalTable'],
      effect: 'update',
      description: 'A notice arrived.',
    }],
  });
  assert.equal(kept.inbound[0].effect, 'update');
  assert.equal(kept.normalizations.length, 0);

  const context = {
    actors: [],
    entities: [{ entityId: 'LocalTable' }],
    registryModuleNames: [],
    sourcePrompt: 'a notice',
  };
  const bare = {
    id: 'noteArrived',
    kind: 'event' as const,
    from: 'organization',
    description: 'A notice arrived.',
    entityRefs: [] as string[],
  };
  const accepted = validateNs5Integration([{ ...bare, writes: [] }], [], [], context);
  assert.equal(accepted.issues.some(item => item.code === 'NS5_INTEGRATION_EFFECT'), false);
  assert.equal(accepted.ok, true, accepted.issues.map(item => item.message).join('\n'));

  const refused = validateNs5Integration([{ ...bare, writes: ['LocalTable'] }], [], [], context);
  assert.equal(refused.issues.some(item => item.code === 'NS5_INTEGRATION_EFFECT' && item.path === 'inbound[0].effect'), true);
});

void test('entityEffects names each entity, and a list of an outside entity is not a write', () => {
  const host: Ns5IntegrationExternalSystem = {
    id: 'remote',
    title: 'Remote host',
    description: 'A system outside the module.',
    settings: [{ id: 'accessKey', title: 'Access key', description: 'Checks what arrives.', secret: true }],
    operations: [
      { operationId: 'changed', direction: 'serve', description: 'Something changed.' },
      { operationId: 'ask', direction: 'call', description: 'Asks the host.' },
    ],
  };
  const entities = [
    { entityId: 'Item', transitions: [{ transitionId: 'close' }] },
    { entityId: 'Local' },
    { entityId: 'Remote', externalConnectionId: 'remote' },
    { entityId: 'Left' },
    { entityId: 'Right' },
  ];
  const context = {
    actors: [],
    entities,
    registryModuleNames: [],
    sourcePrompt: 'a local note',
    journeySteps: [{ journeyId: 'keep', stepIds: ['saveRow'] }],
  };
  const notice = {
    id: 'arrived',
    kind: 'event',
    from: 'organization',
    description: 'An item arrived.',
  };

  const mixed = normalizeNs5IntegrationPayload({
    externalSystems: [host],
    inbound: [{
      ...notice,
      writes: ['Item'],
      effect: 'create',
      entityEffects: [{ entityId: 'Item', effects: ['update', 'create', 'update', 'list'] }],
    }],
    connections: [{
      connectionId: 'remote',
      operationId: 'changed',
      usedBy: ['What the arrival does.'],
      description: 'A notice arrived.',
      entityRefs: ['Local'],
      effect: 'create',
      entityEffects: [
        { entityId: 'Item', effects: ['list'] },
        { entityId: 'Local', effects: ['list'] },
      ],
    }, {
      connectionId: 'remote',
      operationId: 'ask',
      usedBy: ['keep.saveRow'],
      description: 'Asks the host.',
      entityEffects: [],
      entityRefs: ['Item'],
      effect: 'read',
    }],
  });
  assert.equal(mixed.inbound[0].writes, undefined);
  assert.equal(mixed.inbound[0].effect, undefined);
  assert.deepEqual(mixed.inbound[0].entityEffects, [{ entityId: 'Item', effects: ['update', 'create'] }]);
  assert.equal(mixed.connections[0].entityRefs, undefined);
  assert.equal(mixed.connections[0].effect, undefined);
  assert.deepEqual(mixed.connections[0].entityEffects, [
    { entityId: 'Item', effects: ['list'] },
    { entityId: 'Local', effects: ['list'] },
  ]);
  assert.equal(mixed.connections[1].entityEffects, undefined);
  assert.deepEqual(mixed.connections[1].entityRefs, ['Item']);
  assert.equal(mixed.connections[1].effect, 'read');
  assert.equal(mixed.normalizations.filter(item => item.kind === 'dropArrivalLegacyFields').length, 2);

  const listed = validateNs5Integration(mixed.inbound, [], [], context, mixed.connections, mixed.externalSystems);
  assert.equal(listed.issues.some(item => item.code === 'NS5_INTEGRATION_ARRIVAL_WRITES_EXTERNAL'), false);
  assert.equal(listed.ok, true, listed.issues.map(item => item.message).join('\n'));

  const twoCreates = validateNs5Integration([{
    ...notice,
    entityRefs: [],
    entityEffects: [
      { entityId: 'Left', effects: ['create'] },
      { entityId: 'Right', effects: ['create'] },
    ],
  }], [], [], context, [], [host]);
  assert.equal(twoCreates.ok, true, twoCreates.issues.map(item => item.message).join('\n'));

  const readOutside = validateNs5Integration([], [], [], context, [{
    connectionId: 'remote',
    operationId: 'changed',
    direction: 'serve',
    usedBy: ['What the arrival does.'],
    description: 'A notice arrived.',
    entityEffects: [{ entityId: 'Remote', effects: ['list'] }],
  }], [host]);
  assert.equal(readOutside.issues.some(item => item.code === 'NS5_INTEGRATION_ARRIVAL_WRITES_EXTERNAL'), false);
  assert.equal(readOutside.ok, true, readOutside.issues.map(item => item.message).join('\n'));

  const writeOutside = validateNs5Integration([], [], [], context, [{
    connectionId: 'remote',
    operationId: 'changed',
    direction: 'serve',
    usedBy: ['What the arrival does.'],
    description: 'A notice arrived.',
    entityEffects: [{ entityId: 'Remote', effects: ['update'] }],
  }], [host]);
  assert.equal(writeOutside.issues.some(item => item.code === 'NS5_INTEGRATION_ARRIVAL_WRITES_EXTERNAL'), true);

  const twoTransitions = validateNs5Integration([{
    ...notice,
    id: 'moved',
    description: 'Both moved.',
    entityRefs: [],
    transitionRef: 'close',
    entityEffects: [
      { entityId: 'Item', effects: ['transition'] },
      { entityId: 'Local', effects: ['transition'] },
    ],
  }], [], [], context);
  const transitionIssue = twoTransitions.issues.find(item => item.code === 'NS5_INTEGRATION_TRANSITION_REF');
  assert.match(transitionIssue?.message || '', /at most one/i);

  const empty = normalizeNs5IntegrationPayload({ inbound: [{ ...notice, entityEffects: [] }] });
  const v5 = buildNs5IntegrationArtifact('orders', empty.inbound, [], []);
  assert.equal(v5.schemaVersion, '2026-11-20-ns5-integration-v5');
  assert.deepEqual(v5.inbound[0].entityEffects, []);
  assert.equal(v5.inbound[0].writes, undefined);
  const v3 = buildNs5IntegrationArtifact('orders', [{
    ...notice,
    entityRefs: [],
    writes: ['Item'],
    effect: 'create',
  }], [], []);
  assert.equal(v3.schemaVersion, '2026-11-17-ns5-integration-v3');
  assert.equal('entityEffects' in v3.inbound[0], false);
});

void test('a v5 artifact rewrites every other arrival, and an old artifact is the same arrays', () => {
  const inboundOld = {
    id: 'arrived',
    kind: 'event' as const,
    description: 'An item arrived.',
    writes: ['Item'],
    effect: 'create' as const,
    entityRefs: [] as string[],
  };
  const inboundMissing = {
    id: 'noted',
    kind: 'event' as const,
    description: 'Noted.',
    writes: ['Item'],
    entityRefs: [] as string[],
  };
  const serveOld = {
    connectionId: 'remote',
    operationId: 'changed',
    direction: 'serve' as const,
    usedBy: ['A notice arrived.'],
    description: 'A notice arrived.',
    entityRefs: ['Local'],
    effect: 'list' as const,
  };
  const callRow = {
    connectionId: 'remote',
    operationId: 'ask',
    direction: 'call' as const,
    usedBy: ['keep.saveRow'],
    description: 'Asks the host.',
    entityRefs: ['Item'],
    effect: 'read' as const,
  };
  const inboundNew = {
    id: 'opened',
    kind: 'event' as const,
    description: 'Opened.',
    entityRefs: [] as string[],
    entityEffects: [{ entityId: 'Item', effects: ['create' as const] }],
  };
  const mixed = ns5UpgradeArrivalForm(
    [inboundNew, inboundOld, inboundMissing],
    [serveOld, callRow],
  );
  assert.equal(mixed.inbound[0], inboundNew);
  assert.equal(mixed.inbound[1].writes, undefined);
  assert.equal(mixed.inbound[1].effect, undefined);
  assert.deepEqual(mixed.inbound[1].entityRefs, []);
  assert.deepEqual(mixed.inbound[1].entityEffects, [{ entityId: 'Item', effects: ['create'] }]);
  assert.deepEqual(mixed.inbound[2].entityEffects, [{ entityId: 'Item', effects: [] }]);
  assert.equal(mixed.connections[1], callRow);
  assert.equal(mixed.connections[0].entityRefs, undefined);
  assert.equal(mixed.connections[0].effect, undefined);
  assert.deepEqual(mixed.connections[0].entityEffects, [{ entityId: 'Local', effects: ['list'] }]);

  const oldInbound = [inboundOld];
  const oldConnections = [serveOld, callRow];
  const oldOnly = ns5UpgradeArrivalForm(oldInbound, oldConnections);
  assert.equal(oldOnly.inbound, oldInbound);
  assert.equal(oldOnly.connections, oldConnections);
  assert.equal(oldOnly.converted.length, 0);

  const host = {
    id: 'remote',
    title: 'Remote',
    description: 'Outside.',
    settings: [],
    operations: [
      { operationId: 'changed', direction: 'serve' as const, description: 'A notice arrived.' },
      { operationId: 'ask', direction: 'call' as const, description: 'Asks the host.' },
    ],
  };
  const normalized = normalizeNs5IntegrationPayload({
    externalSystems: [host],
    inbound: [inboundNew, inboundOld],
    connections: [serveOld, callRow],
  });
  assert.equal(normalized.inbound.every(item => Array.isArray(item.entityEffects) && item.writes === undefined && item.effect === undefined), true);
  assert.equal(normalized.connections[0].entityRefs, undefined);
  assert.deepEqual(normalized.connections[0].entityEffects, [{ entityId: 'Local', effects: ['list'] }]);
  assert.equal(normalized.connections[1].entityEffects, undefined);
  assert.deepEqual(normalized.connections[1].entityRefs, ['Item']);
  assert.deepEqual(
    normalized.normalizations.filter(item => item.kind === 'upgradeArrivalForm').map(item => item.inboundId).sort(),
    ['arrived', 'remote.changed'],
  );

  const v2 = normalizeNs5IntegrationPayload({ inbound: [inboundOld], connections: [callRow] });
  assert.equal(v2.normalizations.some(item => item.kind === 'upgradeArrivalForm'), false);
  assert.deepEqual(v2.inbound[0].writes, ['Item']);
  assert.equal(v2.inbound[0].effect, 'create');
  const v4 = normalizeNs5IntegrationPayload({
    externalSystems: [{ id: 'remote', title: 'Remote', description: 'Outside.', settings: [], operations: [] }],
    inbound: [inboundOld],
  });
  assert.equal('entityEffects' in v4.inbound[0], false);
  assert.equal(v4.normalizations.some(item => item.kind === 'upgradeArrivalForm'), false);
});
