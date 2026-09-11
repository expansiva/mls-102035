/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/access60/agentNs5Access.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/agentNewSolution/helpers/ns4WorkerTools.js';
import { ownerStepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import type {
  Ns5AccessAuthority,
  Ns5AccessGrant,
  Ns5AccessProfile,
  Ns5JourneyArtifact,
  Ns5OntologyEntityArtifact,
} from '/_102035_/l2/solution/types.js';
import { buildNs5AccessHumanPrompt } from '/_102035_/l2/agentNewSolution5/steps/access60/agentNs5Access.js';
import {
  anchorPath,
  buildNs5AccessArtifact,
  buildNs5AccessTool,
  collectNs5AccessRefCatalog,
  normalizeNs5AccessPayload,
  type Ns5AccessEntityView,
  type Ns5AccessRelationshipView,
} from '/_102035_/l2/agentNewSolution5/steps/access60/contracts.js';
import {
  formatNs5AccessGate,
  validateNs5Access,
} from '/_102035_/l2/agentNewSolution5/steps/access60/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

interface DerivedAccessFixture {
  derivedFrom: string;
  profiles: Ns5AccessProfile[];
  authorities: Ns5AccessAuthority[];
  grants: Ns5AccessGrant[];
}

function loadSchema(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(HERE, '../../schemas/access.schema.json'), 'utf8'),
  ) as Record<string, unknown>;
}

function loadDerived(name: string): DerivedAccessFixture {
  return JSON.parse(readFileSync(path.join(HERE, 'fixtures', name), 'utf8')) as DerivedAccessFixture;
}

function entity(
  entityId: string,
  party: Ns5AccessEntityView['party'],
  fields: string[],
  extras: { details?: Record<string, string>; idField?: string } = {},
): Ns5AccessEntityView {
  return {
    entityId,
    party,
    fields: fields.map(fieldId => ({ fieldId })),
    ...(extras.details ? { details: extras.details } : {}),
    ...(extras.idField ? { storage: { idField: extras.idField } } : {}),
  };
}

function rel(relationshipId: string, fromEntity: string, toEntity: string, required = true): Ns5AccessRelationshipView {
  return { relationshipId, fromEntity, toEntity, required };
}

const ORDEN_ACTORS = ['recepcionista', 'tecnico', 'cliente'];

const ORDEN_ENTITIES: Ns5AccessEntityView[] = [
  entity('Customer', 'person', [], { idField: 'customerId' }),
  entity('Device', 'none', [], { idField: 'deviceId' }),
  entity('ServiceOrder', 'none', ['serviceOrderId', 'customerId', 'deviceId', 'orderNumber', 'reportedDefect', 'budgetAmount', 'status'], { idField: 'serviceOrderId' }),
  entity('ServicePart', 'none', ['servicePartId', 'serviceOrderId', 'partDescription', 'internalCost'], { idField: 'servicePartId' }),
  entity('Diagnosis', 'none', ['diagnosisId', 'serviceOrderId', 'customerDiagnosis', 'internalTechnicalNotes'], { idField: 'diagnosisId' }),
  entity('ReceptionPhoto', 'none', ['receptionPhotoId', 'serviceOrderId'], { idField: 'receptionPhotoId' }),
  entity('RepairRecord', 'none', ['repairRecordId', 'serviceOrderId', 'workDone'], { idField: 'repairRecordId' }),
  entity('DeliveryRecord', 'none', ['deliveryRecordId', 'serviceOrderId'], { idField: 'deliveryRecordId' }),
];

const ORDEN_RELATIONSHIPS: Ns5AccessRelationshipView[] = [
  rel('serviceOrderForCustomer', 'ServiceOrder', 'Customer'),
  rel('serviceOrderForDevice', 'ServiceOrder', 'Device'),
  rel('servicePartForOrder', 'ServicePart', 'ServiceOrder'),
  rel('diagnosisForOrder', 'Diagnosis', 'ServiceOrder'),
  rel('photoForOrder', 'ReceptionPhoto', 'ServiceOrder'),
  rel('repairForOrder', 'RepairRecord', 'ServiceOrder'),
  rel('deliveryForOrder', 'DeliveryRecord', 'ServiceOrder'),
];

const ORDEN_JOURNEYS = [
  { journeyId: 'abrirOrdenServicio', business: { actorRef: 'recepcionista' } },
  { journeyId: 'prepararPresupuestoServicio', business: { actorRef: 'tecnico' } },
  { journeyId: 'consultarYDecidirPresupuesto', business: { actorRef: 'cliente' } },
  { journeyId: 'repararAparato', business: { actorRef: 'tecnico' } },
  { journeyId: 'entregarAparato', business: { actorRef: 'recepcionista' } },
];

const COMANDA_ACTORS = ['garcom', 'caixa'];
const COMANDA_ENTITIES: Ns5AccessEntityView[] = [
  entity('Comanda', 'none', ['comandaId', 'status'], { details: { total: 'Sum of active items.' }, idField: 'comandaId' }),
  entity('ItemComanda', 'none', ['itemComandaId'], { idField: 'itemComandaId' }),
  entity('Mesa', 'none', [], { idField: 'mesaId' }),
];
const COMANDA_RELATIONSHIPS: Ns5AccessRelationshipView[] = [
  rel('comandaAtMesa', 'Comanda', 'Mesa'),
  rel('itemOnComanda', 'ItemComanda', 'Comanda'),
];
const COMANDA_JOURNEYS = [
  { journeyId: 'abrirComanda', business: { actorRef: 'garcom' } },
  { journeyId: 'fecharComanda', business: { actorRef: 'caixa' } },
];

function drafts(payload: unknown) {
  return normalizeNs5AccessPayload(payload);
}

function gateOf(
  payload: unknown,
  extras: Partial<{
    actorIds: string[];
    entities: Ns5AccessEntityView[];
    relationships: Ns5AccessRelationshipView[];
    journeys: typeof ORDEN_JOURNEYS;
  }> = {},
) {
  const { profiles, authorities, grants } = typeof payload === 'object' && payload && 'profiles' in (payload as object)
    ? drafts(payload)
    : drafts(payload);
  return validateNs5Access(profiles, authorities, grants, {
    actorIds: extras.actorIds || ORDEN_ACTORS,
    entities: extras.entities || ORDEN_ENTITIES,
    relationships: extras.relationships || ORDEN_RELATIONSHIPS,
    journeys: extras.journeys || ORDEN_JOURNEYS,
  });
}

void test('access60 tool schema is provider-clean', () => {
  const tool = buildNs5AccessTool(loadSchema(), createNs4FlexibleWorkerTool);
  assert.equal(tool.function.name, 'submitNs5Access');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
});

void test('derived ordenServicio2 fixture keeps six grants with structured deniedFields and cliente own', () => {
  const fixture = loadDerived('ordenServicio2-access.json');
  assert.match(fixture.derivedFrom, /ordenServicio2\/access\/access-matrix\.defs\.ts$/);
  assert.equal(fixture.profiles.length, 3);
  assert.equal(fixture.authorities.length, 6);
  assert.equal(fixture.grants.length, 6);
  const cliente = fixture.profiles.find(profile => profile.profileId === 'cliente');
  assert.equal(cliente?.kind, 'external');
  const ownGrants = fixture.grants.filter(grant => grant.profileRef === 'cliente');
  assert.equal(ownGrants.length, 2);
  for (const grant of ownGrants) {
    assert.equal(grant.dataScope.mode, 'own');
    assert.equal(grant.dataScope.anchorEntity, 'Customer');
    assert.ok(grant.disclosure.deniedFields?.includes('ServicePart.internalCost'));
    assert.ok(grant.disclosure.deniedFields?.includes('Diagnosis.internalTechnicalNotes'));
    assert.equal('hops' in grant.dataScope, false);
  }
  const source = JSON.stringify(fixture);
  assert.doesNotMatch(source, /landingIntent|allowedInformation|deniedInformation|journeyStepRefs|realization/);
  const gate = gateOf(fixture);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('two internal organization profiles pass without an anchor', () => {
  const payload = {
    profiles: [
      { profileId: 'garcom', actorRefs: ['garcom'], kind: 'internal' },
      { profileId: 'caixa', actorRefs: ['caixa'], kind: 'internal' },
    ],
    authorities: [
      { authorityId: 'openTab', title: 'Open', description: 'Open a tab.' },
      { authorityId: 'closeTab', title: 'Close', description: 'Close a tab.' },
    ],
    grants: [
      {
        grantId: 'garcomOpen',
        profileRef: 'garcom',
        authorityRef: 'openTab',
        entityRefs: ['Comanda', 'Mesa'],
        dataScope: { mode: 'organization', description: 'Restaurant tabs.' },
        disclosure: { mode: 'fullRecord', description: 'Operational record.' },
      },
      {
        grantId: 'caixaClose',
        profileRef: 'caixa',
        authorityRef: 'closeTab',
        entityRefs: ['Comanda'],
        dataScope: { mode: 'organization', description: 'Restaurant tabs.' },
        disclosure: { mode: 'fullRecord', description: 'Operational record.' },
      },
    ],
  };
  const gate = gateOf(payload, {
    actorIds: COMANDA_ACTORS,
    entities: COMANDA_ENTITIES,
    relationships: COMANDA_RELATIONSHIPS,
    journeys: COMANDA_JOURNEYS,
  });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const { grants } = drafts(payload);
  assert.equal(grants[0].dataScope.anchorEntity, undefined);
});

void test('anchorPath walks required relationships and does not persist hops', () => {
  assert.deepEqual(anchorPath('Customer', 'Customer', ORDEN_RELATIONSHIPS), []);
  const orderPath = anchorPath('ServiceOrder', 'Customer', ORDEN_RELATIONSHIPS);
  assert.deepEqual(orderPath, [{
    fromEntity: 'ServiceOrder',
    toEntity: 'Customer',
    relationshipId: 'serviceOrderForCustomer',
  }]);
  const partPath = anchorPath('ServicePart', 'Customer', ORDEN_RELATIONSHIPS);
  assert.ok(partPath);
  assert.equal(partPath.length, 2);
  assert.equal(partPath[0].fromEntity, 'ServicePart');
  assert.equal(partPath[partPath.length - 1].toEntity, 'Customer');
  assert.equal(anchorPath('Comanda', 'Customer', ORDEN_RELATIONSHIPS), null);
  const optionalOnly = [rel('weak', 'ServicePart', 'Customer', false)];
  assert.equal(anchorPath('ServicePart', 'Customer', optionalOnly), null);
});

void test('own without reachable person anchor fails', () => {
  const fixture = loadDerived('ordenServicio2-access.json');
  const { profiles, authorities, grants } = drafts(fixture);
  const broken = grants.map(grant => grant.grantId === 'ownConsultationGrant'
    ? { ...grant, dataScope: { ...grant.dataScope, anchorEntity: undefined } }
    : grant);
  const missing = validateNs5Access(profiles, authorities, broken, {
    actorIds: ORDEN_ACTORS,
    entities: ORDEN_ENTITIES,
    relationships: ORDEN_RELATIONSHIPS,
    journeys: ORDEN_JOURNEYS,
  });
  assert.equal(missing.ok, false);
  assert.ok(missing.issues.some(issue => issue.code === 'NS5_ACCESS_ANCHOR_REQUIRED'));

  const notPerson = grants.map(grant => grant.grantId === 'ownConsultationGrant'
    ? { ...grant, dataScope: { ...grant.dataScope, anchorEntity: 'ServiceOrder' } }
    : grant);
  const party = validateNs5Access(profiles, authorities, notPerson, {
    actorIds: ORDEN_ACTORS,
    entities: ORDEN_ENTITIES,
    relationships: ORDEN_RELATIONSHIPS,
    journeys: ORDEN_JOURNEYS,
  });
  assert.equal(party.ok, false);
  assert.ok(party.issues.some(issue => issue.code === 'NS5_ACCESS_ANCHOR_NOT_PERSON'));

  const unreachable = grants.map(grant => grant.grantId === 'ownConsultationGrant'
    ? { ...grant, entityRefs: ['ServiceOrder', 'Comanda'] }
    : grant);
  const walk = validateNs5Access(profiles, authorities, unreachable, {
    actorIds: ORDEN_ACTORS,
    entities: [...ORDEN_ENTITIES, entity('Comanda', 'none', ['comandaId'])],
    relationships: ORDEN_RELATIONSHIPS,
    journeys: ORDEN_JOURNEYS,
  });
  assert.equal(walk.ok, false);
  assert.ok(walk.issues.some(issue => issue.code === 'NS5_ACCESS_ANCHOR_UNREACHABLE'));
});

void test('fieldsOnly without field lists fails; unknown and details refs are checked', () => {
  const fixture = loadDerived('ordenServicio2-access.json');
  const { profiles, authorities, grants } = drafts(fixture);
  const emptyFields = grants.map(grant => grant.grantId === 'budgetDecisionGrant'
    ? { ...grant, disclosure: { mode: 'fieldsOnly' as const, description: grant.disclosure.description } }
    : grant);
  const empty = validateNs5Access(profiles, authorities, emptyFields, {
    actorIds: ORDEN_ACTORS,
    entities: ORDEN_ENTITIES,
    relationships: ORDEN_RELATIONSHIPS,
    journeys: ORDEN_JOURNEYS,
  });
  assert.equal(empty.ok, false);
  assert.ok(empty.issues.some(issue => issue.code === 'NS5_ACCESS_DISCLOSURE_FIELDS'));

  const unknown = grants.map(grant => grant.grantId === 'budgetDecisionGrant'
    ? { ...grant, disclosure: { ...grant.disclosure, deniedFields: ['ServicePart.ghostCost'] } }
    : grant);
  const missing = validateNs5Access(profiles, authorities, unknown, {
    actorIds: ORDEN_ACTORS,
    entities: ORDEN_ENTITIES,
    relationships: ORDEN_RELATIONSHIPS,
    journeys: ORDEN_JOURNEYS,
  });
  assert.equal(missing.ok, false);
  assert.ok(missing.issues.some(issue => issue.code === 'NS5_ACCESS_FIELD_UNKNOWN'));

  const detailsGrant: Ns5AccessGrant = {
    grantId: 'caixaClose',
    profileRef: 'caixa',
    authorityRef: 'closeTab',
    entityRefs: ['Comanda'],
    dataScope: { mode: 'organization', description: 'Close.' },
    disclosure: {
      mode: 'fieldsOnly',
      allowedFields: ['Comanda.details.total', 'Mesa.mesaId'],
      description: 'Total and table identity.',
    },
  };
  const details = validateNs5Access(
    [{ profileId: 'caixa', actorRefs: ['caixa'], kind: 'internal' }],
    [{ authorityId: 'closeTab', title: 'Close', description: 'Close a tab.' }],
    [detailsGrant],
    {
      actorIds: ['caixa'],
      entities: COMANDA_ENTITIES,
      relationships: COMANDA_RELATIONSHIPS,
      journeys: [{ journeyId: 'fecharComanda', business: { actorRef: 'caixa' } }],
    },
  );
  assert.equal(details.ok, true, details.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('external organization and public on internal fail; anonymous is public-only', () => {
  const fixture = loadDerived('ordenServicio2-access.json');
  const { profiles, authorities, grants } = drafts(fixture);
  const leaked = grants.map(grant => grant.grantId === 'ownConsultationGrant'
    ? { ...grant, dataScope: { mode: 'organization' as const, description: grant.dataScope.description } }
    : grant);
  const external = validateNs5Access(profiles, authorities, leaked, {
    actorIds: ORDEN_ACTORS,
    entities: ORDEN_ENTITIES,
    relationships: ORDEN_RELATIONSHIPS,
    journeys: ORDEN_JOURNEYS,
  });
  assert.equal(external.ok, false);
  assert.ok(external.issues.some(issue => issue.code === 'NS5_ACCESS_EXTERNAL_OWN'));

  const publicInternal = grants.map(grant => grant.grantId === 'receptionGrant'
    ? { ...grant, dataScope: { mode: 'public' as const, description: grant.dataScope.description } }
    : grant);
  const pub = validateNs5Access(profiles, authorities, publicInternal, {
    actorIds: ORDEN_ACTORS,
    entities: ORDEN_ENTITIES,
    relationships: ORDEN_RELATIONSHIPS,
    journeys: ORDEN_JOURNEYS,
  });
  assert.equal(pub.ok, false);
  assert.ok(pub.issues.some(issue => issue.code === 'NS5_ACCESS_PUBLIC_ANONYMOUS'));
});

void test('profile without grant fails', () => {
  const fixture = loadDerived('ordenServicio2-access.json');
  const { profiles, authorities, grants } = drafts(fixture);
  const dropped = grants.filter(grant => grant.profileRef !== 'cliente');
  const noGrant = validateNs5Access(profiles, authorities, dropped, {
    actorIds: ORDEN_ACTORS,
    entities: ORDEN_ENTITIES,
    relationships: ORDEN_RELATIONSHIPS,
    journeys: ORDEN_JOURNEYS,
  });
  assert.equal(noGrant.ok, false);
  assert.ok(noGrant.issues.some(issue => issue.code === 'NS5_ACCESS_PROFILE_NO_GRANT'));
  const feedback = formatNs5AccessGate(noGrant.issues);
  assert.match(feedback, /NS5_ACCESS_PROFILE_NO_GRANT/);
});

void test('journey actor without a profile fails', () => {
  const fixture = loadDerived('ordenServicio2-access.json');
  const { profiles, authorities, grants } = drafts(fixture);
  const noCliente = validateNs5Access(
    profiles.filter(profile => profile.profileId !== 'cliente'),
    authorities.filter(item => item.authorityId !== 'ownConsultation' && item.authorityId !== 'budgetDecision'),
    grants.filter(grant => grant.profileRef !== 'cliente'),
    {
      actorIds: ORDEN_ACTORS,
      entities: ORDEN_ENTITIES,
      relationships: ORDEN_RELATIONSHIPS,
      journeys: ORDEN_JOURNEYS,
    },
  );
  assert.equal(noCliente.ok, false);
  assert.ok(noCliente.issues.some(issue => issue.code === 'NS5_ACCESS_JOURNEY_ACTOR'));
  assert.match(formatNs5AccessGate(noCliente.issues), /NS5_ACCESS_JOURNEY_ACTOR/);
});

void test('unknown refs, duplicate ids and duplicate profile-authority pairs fail', () => {
  const fixture = loadDerived('ordenServicio2-access.json');
  const { profiles, authorities, grants } = drafts(fixture);
  const dupPair = [...grants, { ...grants[0], grantId: 'receptionGrantCopy' }];
  const pair = validateNs5Access(profiles, authorities, dupPair, {
    actorIds: ORDEN_ACTORS,
    entities: ORDEN_ENTITIES,
    relationships: ORDEN_RELATIONSHIPS,
    journeys: ORDEN_JOURNEYS,
  });
  assert.equal(pair.ok, false);
  assert.ok(pair.issues.some(issue => issue.code === 'NS5_ACCESS_GRANT_DUPLICATE_PAIR'));

  const ghost = grants.map(grant => grant.grantId === 'receptionGrant'
    ? { ...grant, entityRefs: ['Ghost'], profileRef: 'ghost', authorityRef: 'ghost' }
    : grant);
  const unknown = validateNs5Access(profiles, authorities, ghost, {
    actorIds: ORDEN_ACTORS,
    entities: ORDEN_ENTITIES,
    relationships: ORDEN_RELATIONSHIPS,
    journeys: ORDEN_JOURNEYS,
  });
  assert.equal(unknown.ok, false);
  assert.ok(unknown.issues.some(issue => issue.code === 'NS5_ACCESS_GRANT_PROFILE'));
  assert.ok(unknown.issues.some(issue => issue.code === 'NS5_ACCESS_GRANT_AUTHORITY'));
  assert.ok(unknown.issues.some(issue => issue.code === 'NS5_ACCESS_GRANT_ENTITY_UNKNOWN'));
});

void test('normalize maps authorityRef to authorityId and drops empty field lists', () => {
  const { authorities, grants } = drafts({
    profiles: [{ id: 'cliente', actorRefs: ['cliente', 'cliente', ''], kind: 'external' }],
    authorities: [{ authorityRef: 'ownConsultation', title: 'Consult', description: 'Own orders.' }],
    grants: [{
      id: 'ownConsultationGrant',
      profileRef: 'cliente',
      authorityRef: 'ownConsultation',
      entityRefs: ['ServiceOrder', 'ServiceOrder', ''],
      dataScope: { mode: 'own', anchorEntity: 'Customer', description: 'Own.' },
      disclosure: { mode: 'fieldsOnly', allowedFields: [], deniedFields: ['ServicePart.internalCost'], description: 'Limited.' },
    }],
  });
  assert.equal(authorities[0].authorityId, 'ownConsultation');
  assert.equal(grants[0].grantId, 'ownConsultationGrant');
  assert.deepEqual(grants[0].entityRefs, ['ServiceOrder']);
  assert.equal(grants[0].disclosure.allowedFields, undefined);
  assert.deepEqual(grants[0].disclosure.deniedFields, ['ServicePart.internalCost']);
});

void test('buildNs5AccessArtifact keeps schemaVersion and does not store hops', () => {
  const fixture = loadDerived('ordenServicio2-access.json');
  const { profiles, authorities, grants } = drafts(fixture);
  const artifact = buildNs5AccessArtifact('ordenServicio5', profiles, authorities, grants);
  assert.equal(artifact.schemaVersion, '2026-09-10-ns5-access-v1');
  assert.equal(artifact.moduleName, 'ordenServicio5');
  const cliente = artifact.grants.find(grant => grant.grantId === 'ownConsultationGrant');
  assert.equal(cliente?.dataScope.anchorEntity, 'Customer');
  assert.equal(JSON.stringify(artifact).includes('"hops"'), false);
});

void test('ownerStepId maps access60 repair planIds', () => {
  assert.equal(ownerStepId('access60'), 'access60');
  assert.equal(ownerStepId('access60-repair-1'), 'access60');
  assert.equal(ownerStepId('access60-done'), '');
});

void test('human prompt carries source request, actors, journeys, fields, party and required relationships', () => {
  const customer = {
    schemaVersion: '2026-09-10-ns5-ontology-v1',
    moduleName: 'ordenServicio5',
    entityId: 'Customer',
    title: 'Customer',
    description: 'Person who owns orders.',
    kind: 'mdm',
    party: 'person',
    displayField: 'name',
    fields: [],
    lifecycleStates: [],
    transitions: [],
    storage: { target: 'mdm', scope: 'organization', idField: 'customerId' },
  } as Ns5OntologyEntityArtifact;
  const serviceOrder = {
    schemaVersion: '2026-09-10-ns5-ontology-v1',
    moduleName: 'ordenServicio5',
    entityId: 'ServiceOrder',
    title: 'Service order',
    description: 'Repair order.',
    kind: 'core',
    party: 'none',
    displayField: 'orderNumber',
    fields: [
      { fieldId: 'status', title: 'Status', type: 'string', required: true, description: 'Current state.' },
      { fieldId: 'budgetAmount', title: 'Budget', type: 'money', required: false, description: 'Customer budget.' },
    ],
    details: { ageDays: 'Days since opening.' },
    lifecycleStates: [{ state: 'opened', reachedBy: 'actor' }],
    transitions: [],
    storage: { target: 'moduleDatabase', scope: 'module', idField: 'serviceOrderId' },
  } as Ns5OntologyEntityArtifact;
  const journey = {
    schemaVersion: '2026-09-10-ns5-journey-v1',
    journeyId: 'consultarYDecidirPresupuesto',
    business: {
      actorRef: 'cliente',
      title: 'Decide',
      goal: 'Approve or reject.',
      entry: { mode: 'fromNotification' },
      steps: [
        { stepId: 'decideBudget', kind: 'decide', entity: 'ServiceOrder', title: 'Decide', description: 'The customer decides.' },
      ],
      outcome: { statement: 'Decided.', evidence: ['Decided.'] },
    },
    businessHash: 'sha256:0',
  } as Ns5JourneyArtifact;
  const human = buildNs5AccessHumanPrompt({
    sourcePrompt: 'modulo de ordenes. perfiles internos y un cliente externo.',
    userLanguage: 'es',
    actors: [
      { actorId: 'cliente', kind: 'external', title: 'Cliente', description: 'External customer.' },
      { actorId: 'tecnico', kind: 'internal', title: 'Tecnico', description: 'Technician.' },
    ],
    journeys: [journey],
    entities: [customer, serviceOrder],
    relationships: [{
      relationshipId: 'serviceOrderForCustomer',
      fromEntity: 'ServiceOrder',
      toEntity: 'Customer',
      type: 'manyToOne',
      required: true,
      persistence: { mode: 'crossStoreReference' },
      realization: {
        kind: 'fieldReference',
        ownerEntity: 'ServiceOrder',
        from: { entityId: 'ServiceOrder', fieldIds: ['customerId'] },
        to: { entityId: 'Customer', fieldIds: ['customerId'] },
      },
    }],
  });
  assert.match(human, /Source request/);
  assert.match(human, /cliente \(external\)/);
  assert.match(human, /consultarYDecidirPresupuesto \(cliente\)/);
  assert.match(human, /party=person/);
  assert.match(human, /ServiceOrder\.status/);
  assert.match(human, /ServiceOrder\.details\.ageDays/);
  assert.match(human, /serviceOrderForCustomer: ServiceOrder -> Customer/);
  const catalog = collectNs5AccessRefCatalog(
    [{ actorId: 'cliente' }],
    [customer, serviceOrder],
    [journey],
  );
  assert.ok(catalog.personEntityIds.includes('Customer'));
  assert.ok(catalog.fieldRefs.includes('Customer.customerId'));
  assert.ok(catalog.fieldRefs.includes('ServiceOrder.details.ageDays'));
});

void test('access60 prompt has no domain examples and keeps structured disclosure', () => {
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /submitNs5Access/);
  assert.match(prompt, /deniedFields/);
  assert.match(prompt, /anchorEntity/);
  assert.match(prompt, /placeholders — use only ids that exist in the module/);
  assert.doesNotMatch(prompt, /comanda|garcom|waiter|stock|quantity|descuento|presupuesto|recepcionista/i);
  const schema = JSON.stringify(loadSchema());
  assert.doesNotMatch(schema, /landingIntent|allowedInformation|deniedInformation|journeyStepRefs/);
});
