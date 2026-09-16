/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/access60/agentNs5Access.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/agentNewSolution/helpers/ns4WorkerTools.js';
import { ownerStepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import { ns5OntologyEntityViews } from '/_102035_/l2/solution/ontologyView.js';
import {
  loadNs5Actors,
  loadNs5Defs,
  loadNs5Entities,
  loadNs5FixtureJson,
  loadNs5Journeys,
  loadNs5OntologyIndex,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import type {
  Ns5AccessArtifact,
  Ns5AccessGrant,
  Ns5ModuleActor,
} from '/_102035_/l2/solution/types.js';
import { buildNs5AccessHumanPrompt } from '/_102035_/l2/agentNewSolution5/steps/access60/agentNs5Access.js';
import {
  anchorPath,
  applyNs5AccessFormNormalizations,
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

function loadSchema(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(HERE, '../../schemas/access.schema.json'), 'utf8'),
  ) as Record<string, unknown>;
}

function realOrdenDraft() {
  return loadNs5FixtureJson<{
    grants: Ns5AccessGrant[];
  }>('steps/access60/fixtures', 'ordenServicio5-draft.json');
}

function actor(actorId: string, kind: Ns5ModuleActor['kind'] = 'internal'): Ns5ModuleActor {
  return { actorId, kind, origin: 'named', title: actorId, description: actorId };
}

function realOrdenContext() {
  const entities = loadNs5Entities('ordenServicio5');
  const index = loadNs5OntologyIndex('ordenServicio5');
  const journeys = loadNs5Journeys('ordenServicio5');
  return {
    actors: loadNs5Actors('ordenServicio5'),
    entities: entities.map(entity => ({
      entityId: entity.entityId,
      party: entity.party,
      fields: entity.fields.map(field => ({ fieldId: field.fieldId })),
      ...(entity.details ? { details: entity.details } : {}),
      storage: { idField: entity.storage.idField },
      ...(entity.writer && entity.writer !== 'journey' ? { writer: entity.writer } : {}),
    })),
    relationships: index.relationships.map(rel => ({
      relationshipId: rel.relationshipId,
      fromEntity: rel.fromEntity,
      toEntity: rel.toEntity,
      required: rel.required,
    })),
    journeys: journeys.map(journey => ({
      journeyId: journey.journeyId,
      business: { actorRef: journey.business.actorRef },
    })),
  };
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

function actorsOf(ids: readonly string[], kinds: Record<string, Ns5ModuleActor['kind']> = {}): Ns5ModuleActor[] {
  return ids.map(id => actor(id, kinds[id] || (id === 'cliente' ? 'external' : 'internal')));
}

function gateOf(
  payload: unknown,
  extras: Partial<{
    actors: Ns5ModuleActor[];
    entities: Ns5AccessEntityView[];
    relationships: Ns5AccessRelationshipView[];
    journeys: typeof ORDEN_JOURNEYS;
  }> = {},
) {
  const { grants } = drafts(payload);
  return validateNs5Access(grants, {
    actors: extras.actors || actorsOf(ORDEN_ACTORS),
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

void test('real ordenServicio5 access draft keeps cliente own with structured disclosure', () => {
  const fixture = realOrdenDraft();
  assert.equal(fixture.grants.length, 4);
  assert.ok(fixture.grants.every(grant => grant.title && grant.description));
  const cliente = loadNs5Actors('ordenServicio5').find(item => item.actorId === 'cliente');
  assert.equal(cliente?.kind, 'external');
  const ownGrants = fixture.grants.filter(grant => grant.actorRef === 'cliente');
  assert.equal(ownGrants.length, 1);
  assert.equal(ownGrants[0].dataScope.mode, 'own');
  assert.equal(ownGrants[0].dataScope.anchorEntity, 'Cliente');
  assert.ok(ownGrants[0].disclosure.deniedFields?.includes('Presupuesto.piezasNecesarias'));
  assert.equal('hops' in ownGrants[0].dataScope, false);
  const source = JSON.stringify(fixture);
  assert.doesNotMatch(source, /landingIntent|allowedInformation|deniedInformation|journeyStepRefs|sourceRefs/);
  const gate = validateNs5Access(fixture.grants, realOrdenContext());
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('crud entity without an internal grant is NS5_ACCESS_CRUD_WITHOUT_INTERNAL_GRANT', () => {
  const plano = entity('Plano', 'none', ['id', 'valor'], { idField: 'id' });
  plano.writer = 'crud';
  const aluno = entity('Aluno', 'person', [], { idField: 'id' });
  const payload = {
    grants: [
      {
        grantId: 'recepcaoMatriculas',
        actorRef: 'recepcao',
        title: 'Enroll',
        description: 'Enroll students.',
        entityRefs: ['Aluno'],
        dataScope: { mode: 'organization', description: 'All students.' },
        disclosure: { mode: 'fullRecord', description: 'Enrollment record.' },
      },
      {
        grantId: 'alunoProprio',
        actorRef: 'aluno',
        title: 'Own',
        description: 'Own record.',
        entityRefs: ['Aluno', 'Plano'],
        dataScope: { mode: 'own', anchorEntity: 'Aluno', description: 'Own student record.' },
        disclosure: { mode: 'fullRecord', description: 'Own record.' },
      },
    ],
  };
  const missing = gateOf(payload, {
    actors: [actor('recepcao'), actor('aluno', 'external')],
    entities: [plano, aluno],
    relationships: [rel('alunoPlano', 'Aluno', 'Plano')],
    journeys: [
      { journeyId: 'matricular', business: { actorRef: 'recepcao' } },
      { journeyId: 'verProprio', business: { actorRef: 'aluno' } },
    ],
  });
  assert.equal(missing.ok, false);
  assert.ok(missing.issues.some(issue => issue.code === 'NS5_ACCESS_CRUD_WITHOUT_INTERNAL_GRANT' && /Plano/.test(issue.message)));

  const withInternal = gateOf({
    ...payload,
    grants: [
      { ...payload.grants[0], entityRefs: ['Aluno', 'Plano'] },
      { ...payload.grants[1], entityRefs: ['Aluno'] },
    ],
  }, {
    actors: [actor('recepcao'), actor('aluno', 'external')],
    entities: [plano, aluno],
    relationships: [rel('alunoPlano', 'Aluno', 'Plano')],
    journeys: [
      { journeyId: 'matricular', business: { actorRef: 'recepcao' } },
      { journeyId: 'verProprio', business: { actorRef: 'aluno' } },
    ],
  });
  assert.equal(withInternal.ok, true, withInternal.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('two internal organization actors pass without an anchor', () => {
  const payload = {
    grants: [
      {
        grantId: 'garcomOpen',
        actorRef: 'garcom',
        title: 'Open',
        description: 'Open a tab.',
        entityRefs: ['Comanda', 'Mesa'],
        dataScope: { mode: 'organization', description: 'Restaurant tabs.' },
        disclosure: { mode: 'fullRecord', description: 'Operational record.' },
      },
      {
        grantId: 'caixaClose',
        actorRef: 'caixa',
        title: 'Close',
        description: 'Close a tab.',
        entityRefs: ['Comanda'],
        dataScope: { mode: 'organization', description: 'Restaurant tabs.' },
        disclosure: { mode: 'fullRecord', description: 'Operational record.' },
      },
    ],
  };
  const gate = gateOf(payload, {
    actors: actorsOf(COMANDA_ACTORS),
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
  const fixture = realOrdenDraft();
  const { grants } = drafts(fixture);
  const broken = grants.map(grant => grant.grantId === 'clienteConsultaYrespondePresupuesto'
    ? { ...grant, dataScope: { ...grant.dataScope, anchorEntity: undefined } }
    : grant);
  const missing = validateNs5Access(broken, realOrdenContext());
  assert.equal(missing.ok, false);
  assert.ok(missing.issues.some(issue => issue.code === 'NS5_ACCESS_ANCHOR_REQUIRED'));

  const notPerson = grants.map(grant => grant.grantId === 'clienteConsultaYrespondePresupuesto'
    ? { ...grant, dataScope: { ...grant.dataScope, anchorEntity: 'OrdenServicio' } }
    : grant);
  const party = validateNs5Access(notPerson, realOrdenContext());
  assert.equal(party.ok, false);
  assert.ok(party.issues.some(issue => issue.code === 'NS5_ACCESS_ANCHOR_NOT_PERSON'));

  const ctx = realOrdenContext();
  const unreachable = grants.map(grant => grant.grantId === 'clienteConsultaYrespondePresupuesto'
    ? { ...grant, entityRefs: ['OrdenServicio', 'Comanda'] }
    : grant);
  const walk = validateNs5Access(unreachable, {
    ...ctx,
    entities: [...ctx.entities, entity('Comanda', 'none', ['comandaId'])],
  });
  assert.equal(walk.ok, false);
  assert.ok(walk.issues.some(issue => issue.code === 'NS5_ACCESS_ANCHOR_UNREACHABLE'));
});

void test('fieldsOnly without field lists fails; unknown and details refs are checked', () => {
  const fixture = realOrdenDraft();
  const { grants } = drafts(fixture);
  const emptyFields = grants.map(grant => grant.grantId === 'clienteConsultaYrespondePresupuesto'
    ? { ...grant, disclosure: { mode: 'fieldsOnly' as const, description: grant.disclosure.description } }
    : grant);
  const empty = validateNs5Access(emptyFields, realOrdenContext());
  assert.equal(empty.ok, false);
  assert.ok(empty.issues.some(issue => issue.code === 'NS5_ACCESS_DISCLOSURE_FIELDS'));

  const unknown = grants.map(grant => grant.grantId === 'clienteConsultaYrespondePresupuesto'
    ? { ...grant, disclosure: { ...grant.disclosure, deniedFields: ['PiezaNecesaria.ghostCost'] } }
    : grant);
  const missing = validateNs5Access(unknown, realOrdenContext());
  assert.equal(missing.ok, false);
  assert.ok(missing.issues.some(issue => issue.code === 'NS5_ACCESS_FIELD_UNKNOWN'));

  const detailsGrant: Ns5AccessGrant = {
    grantId: 'caixaClose',
    actorRef: 'caixa',
    title: 'Close',
    description: 'Close a tab.',
    entityRefs: ['Comanda'],
    dataScope: { mode: 'organization', description: 'Close.' },
    disclosure: {
      mode: 'fieldsOnly',
      allowedFields: ['Comanda.details.total', 'Mesa.mesaId'],
      description: 'Total and table identity.',
    },
  };
  const details = validateNs5Access(
    [detailsGrant],
    {
      actors: actorsOf(['caixa']),
      entities: COMANDA_ENTITIES,
      relationships: COMANDA_RELATIONSHIPS,
      journeys: [{ journeyId: 'fecharComanda', business: { actorRef: 'caixa' } }],
    },
  );
  assert.equal(details.ok, true, details.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('external organization grants fail', () => {
  const fixture = realOrdenDraft();
  const { grants } = drafts(fixture);
  const leaked = grants.map(grant => grant.grantId === 'clienteConsultaYrespondePresupuesto'
    ? { ...grant, dataScope: { mode: 'organization' as const, description: grant.dataScope.description } }
    : grant);
  const external = validateNs5Access(leaked, realOrdenContext());
  assert.equal(external.ok, false);
  assert.ok(external.issues.some(issue => issue.code === 'NS5_ACCESS_EXTERNAL_OWN'));
});

void test('actor without grant fails', () => {
  const fixture = realOrdenDraft();
  const { grants } = drafts(fixture);
  const dropped = grants.filter(grant => grant.actorRef !== 'cliente');
  const noGrant = validateNs5Access(dropped, realOrdenContext());
  assert.equal(noGrant.ok, false);
  assert.ok(noGrant.issues.some(issue => issue.code === 'NS5_ACCESS_ACTOR_NO_GRANT'));
  const feedback = formatNs5AccessGate(noGrant.issues);
  assert.match(feedback, /NS5_ACCESS_ACTOR_NO_GRANT/);
});

void test('journey actor without a grant fails', () => {
  const fixture = realOrdenDraft();
  const { grants } = drafts(fixture);
  const ctx = realOrdenContext();
  const noCliente = validateNs5Access(
    grants.filter(grant => grant.actorRef !== 'cliente'),
    { ...ctx, actors: ctx.actors.filter(item => item.actorId !== 'cliente') },
  );
  assert.equal(noCliente.ok, false);
  assert.ok(noCliente.issues.some(issue => issue.code === 'NS5_ACCESS_JOURNEY_ACTOR'));
  assert.match(formatNs5AccessGate(noCliente.issues), /NS5_ACCESS_JOURNEY_ACTOR/);
});

void test('unknown refs, duplicate grantIds and missing title fail', () => {
  const fixture = realOrdenDraft();
  const { grants } = drafts(fixture);
  const dupId = [...grants, { ...grants[0] }];
  const dup = validateNs5Access(dupId, realOrdenContext());
  assert.equal(dup.ok, false);
  assert.ok(dup.issues.some(issue => issue.code === 'NS5_ACCESS_GRANT_ID_DUPLICATE'));

  const ghost = grants.map(grant => grant.grantId === 'recepcionGestionaRecepcionYentrega'
    ? { ...grant, entityRefs: ['Ghost'], actorRef: 'ghost' }
    : grant);
  const unknown = validateNs5Access(ghost, realOrdenContext());
  assert.equal(unknown.ok, false);
  assert.ok(unknown.issues.some(issue => issue.code === 'NS5_ACCESS_GRANT_ACTOR'));
  assert.ok(unknown.issues.some(issue => issue.code === 'NS5_ACCESS_GRANT_ENTITY_UNKNOWN'));

  const noTitle = grants.map(grant => grant.grantId === 'recepcionGestionaRecepcionYentrega'
    ? { ...grant, title: '' }
    : grant);
  const title = validateNs5Access(noTitle, realOrdenContext());
  assert.equal(title.ok, false);
  assert.ok(title.issues.some(issue => issue.code === 'NS5_ACCESS_GRANT_TITLE'));
});

void test('normalize maps title onto the grant and drops empty field lists', () => {
  const { grants } = drafts({
    grants: [{
      id: 'clienteConsultaYrespondePresupuesto',
      actorRef: 'cliente',
      title: 'Consult',
      description: 'Own orders.',
      entityRefs: ['ServiceOrder', 'ServiceOrder', ''],
      dataScope: { mode: 'own', anchorEntity: 'Customer', description: 'Own.' },
      disclosure: { mode: 'fieldsOnly', allowedFields: [], deniedFields: ['ServicePart.internalCost'], description: 'Limited.' },
    }],
  });
  assert.equal(grants[0].grantId, 'clienteConsultaYrespondePresupuesto');
  assert.equal(grants[0].title, 'Consult');
  assert.equal(grants[0].description, 'Own orders.');
  assert.deepEqual(grants[0].entityRefs, ['ServiceOrder']);
  assert.equal(grants[0].disclosure.allowedFields, undefined);
  assert.deepEqual(grants[0].disclosure.deniedFields, ['ServicePart.internalCost']);
  assert.equal('authorityRef' in grants[0], false);
});

void test('buildNs5AccessArtifact keeps schemaVersion and does not store hops', () => {
  const fixture = realOrdenDraft();
  const { grants } = drafts(fixture);
  const artifact = buildNs5AccessArtifact('ordenServicio5', loadNs5Actors('ordenServicio5'), grants);
  assert.equal(artifact.schemaVersion, '2026-09-12-ns5-access-v3');
  assert.equal('authorities' in artifact, false);
  assert.equal(artifact.moduleName, 'ordenServicio5');
  const cliente = artifact.grants.find(grant => grant.grantId === 'clienteConsultaYrespondePresupuesto');
  assert.equal(cliente?.dataScope.anchorEntity, 'Cliente');
  assert.equal(JSON.stringify(artifact).includes('"hops"'), false);
});

void test('ownerStepId maps access60 repair planIds', () => {
  assert.equal(ownerStepId('access60'), 'access60');
  assert.equal(ownerStepId('access60-repair-1'), 'access60');
  assert.equal(ownerStepId('access60-done'), '');
});

void test('afterPrompt applies form normalizations before the gate and records them on the draft', () => {
  const source = readFileSync(path.join(HERE, 'agentNs5Access.ts'), 'utf8');
  assert.match(source, /applyNs5AccessFormNormalizations/);
  assert.match(source, /normalizations/);
  const persist = source.slice(source.indexOf('async function persistArtifacts'));
  assert.match(persist, /normalizations/);
  assert.match(persist, /writeStepState/);
});

void test('human prompt carries source request, actors, journeys, fields, party and required relationships', () => {
  const customer = {
    schemaVersion: '2026-09-11-ns5-ontology-v2',
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
    schemaVersion: '2026-09-11-ns5-ontology-v2',
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
    details: { ageDays: { type: 'integer', description: 'Days since opening.' } },
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
    entities: ns5OntologyEntityViews([customer, serviceOrder]),
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
  assert.match(prompt, /writer: 'crud'/);
  assert.match(prompt, /internal/);
  assert.match(prompt, /placeholders — use only ids that exist in the module/);
  assert.match(prompt, /proper/);
  assert.doesNotMatch(prompt, /## Authorities/);
  assert.doesNotMatch(prompt, /authorityRef|authorityId/);
  assert.match(prompt, /2026-09-12-ns5-access-v3/);
  assert.doesNotMatch(prompt, /comanda|garcom|waiter|stock|quantity|descuento|presupuesto|recepcionista/i);
  const schema = JSON.stringify(loadSchema());
  assert.doesNotMatch(schema, /landingIntent|allowedInformation|deniedInformation|journeyStepRefs/);
});

const LIVE_ACCESS_MODULES = ['comandaRestaurante5', 'ordenServicio5', 'mensalidadesAcademia'] as const;

function liveAccess(moduleName: typeof LIVE_ACCESS_MODULES[number]): Ns5AccessArtifact {
  return loadNs5Defs<Ns5AccessArtifact>('steps/access60/fixtures/live', `${moduleName}-access.defs.ts`);
}

function liveEntityViews(moduleName: typeof LIVE_ACCESS_MODULES[number]): Ns5AccessEntityView[] {
  const all = loadNs5FixtureJson<Record<string, Ns5AccessEntityView[]>>(
    'steps/access60/fixtures/live',
    'entity-views.json',
  );
  return all[moduleName];
}

void test('live access of the three modules: fieldsOnly without restriction becomes fullRecord and stray anchors drop', () => {
  const views = loadNs5FixtureJson<Record<string, Ns5AccessEntityView[]>>(
    'steps/access60/fixtures/live',
    'entity-views.json',
  );
  for (const moduleName of LIVE_ACCESS_MODULES) {
    const artifact = liveAccess(moduleName);
    const { grants, normalizations } = applyNs5AccessFormNormalizations(artifact.grants, views[moduleName]);
    const droppedAnchors = normalizations.filter(item => item.kind === 'dropAnchorEntity');
    const promoted = normalizations.filter(item => item.kind === 'disclosureFullRecord');
    assert.ok(
      droppedAnchors.length + promoted.length > 0,
      `${moduleName} expected at least one form normalization`,
    );
    for (const grant of grants) {
      if (grant.disclosure.mode === 'fieldsOnly' || grant.disclosure.mode === 'summaryOnly') {
        assert.ok(
          (grant.disclosure.allowedFields && grant.disclosure.allowedFields.length)
          || (grant.disclosure.deniedFields && grant.disclosure.deniedFields.length),
          `${moduleName} ${grant.grantId} limited disclosure kept empty lists`,
        );
      } else {
        assert.equal(grant.disclosure.allowedFields, undefined, `${moduleName} ${grant.grantId}`);
        assert.equal(grant.disclosure.deniedFields, undefined, `${moduleName} ${grant.grantId}`);
      }
      if (grant.dataScope.mode === 'own' || grant.dataScope.mode === 'assigned' || grant.dataScope.mode === 'related') {
        assert.ok(grant.dataScope.anchorEntity, `${moduleName} ${grant.grantId} lost person anchor`);
      } else {
        assert.equal(grant.dataScope.anchorEntity, undefined, `${moduleName} ${grant.grantId} kept stray anchor`);
      }
    }
    const relationships = loadNs5FixtureJson<Record<string, Ns5AccessRelationshipView[]>>(
      'steps/access60/fixtures/live',
      'relationships.json',
    )[moduleName];
    const actors = artifact.actors;
    const gate = validateNs5Access(grants, {
      actors,
      entities: views[moduleName],
      relationships,
      journeys: actors.map(item => ({
        journeyId: item.actorId,
        business: { actorRef: item.actorId },
      })),
    });
    assert.equal(
      gate.ok,
      true,
      `${moduleName}: ${gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n')}`,
    );
  }
  const academia = liveAccess('mensalidadesAcademia');
  const { grants: academiaGrants } = applyNs5AccessFormNormalizations(
    academia.grants,
    liveEntityViews('mensalidadesAcademia'),
  );
  const own = academiaGrants.find(grant => grant.grantId === 'alunoCancelarPropriaMatricula');
  assert.equal(own?.disclosure.mode, 'fieldsOnly');
  assert.equal(own?.dataScope.anchorEntity, 'Aluno');
  assert.ok(academiaGrants.filter(grant => grant.disclosure.mode === 'fullRecord').length >= 4);
});

void test('fieldsOnly covering every resolvable field fails the gate unless normalized to fullRecord', () => {
  const entities = [entity('Pagamento', 'none', ['id', 'valor', 'comanda', 'recebidoEm'], { idField: 'id' })];
  const grant: Ns5AccessGrant = {
    grantId: 'caixaRegistraPagamento',
    actorRef: 'caixa',
    title: 'Close',
    description: 'Close.',
    entityRefs: ['Pagamento'],
    dataScope: { mode: 'organization', description: 'Payments.' },
    disclosure: {
      mode: 'fieldsOnly',
      description: 'All payment fields.',
      allowedFields: ['Pagamento.id', 'Pagamento.valor', 'Pagamento.comanda', 'Pagamento.recebidoEm'],
    },
  };
  const ctx = {
    actors: actorsOf(['caixa']),
    entities,
    relationships: [] as Ns5AccessRelationshipView[],
    journeys: [{ journeyId: 'fecharComanda', business: { actorRef: 'caixa' } }],
  };
  const raw = validateNs5Access([grant], ctx);
  assert.equal(raw.ok, false);
  assert.ok(raw.issues.some(issue => issue.code === 'NS5_ACCESS_DISCLOSURE_FIELDS'));
  const { grants, normalizations } = applyNs5AccessFormNormalizations([grant], entities);
  assert.equal(grants[0].disclosure.mode, 'fullRecord');
  assert.equal(grants[0].disclosure.allowedFields, undefined);
  assert.ok(normalizations.some(item => item.kind === 'disclosureFullRecord'));
  const after = validateNs5Access(grants, ctx);
  assert.equal(after.ok, true, after.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('custom with a reachable person that cites the actor is NS5_ACCESS_CUSTOM_HAS_ANCHOR', () => {
  const colaborador = entity('Colaborador', 'person', [], { idField: 'colaboradorId' });
  const despesa = entity('Despesa', 'none', ['despesaId', 'colaboradorId'], { idField: 'despesaId' });
  const payload = {
    grants: [{
      grantId: 'colaboradorProprias',
      actorRef: 'colaborador',
      title: 'Own expenses',
      description: 'Colaborador sees own expenses.',
      entityRefs: ['Despesa'],
      dataScope: { mode: 'custom', description: 'próprias despesas do colaborador' },
      disclosure: { mode: 'fullRecord', description: 'Expense record.' },
    }],
  };
  const gate = gateOf(payload, {
    actors: actorsOf(['colaborador']),
    entities: [colaborador, despesa],
    relationships: [rel('despesaOfColaborador', 'Despesa', 'Colaborador')],
    journeys: [{ journeyId: 'lancarDespesa', business: { actorRef: 'colaborador' } }],
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ACCESS_CUSTOM_HAS_ANCHOR' && /Colaborador/.test(issue.message)));
  assert.match(formatNs5AccessGate(gate.issues), /own\/assigned\/related with anchorEntity Colaborador/);
});

void test('custom without any person is NS5_ACCESS_CUSTOM_WITHOUT_PERSON warning', () => {
  const payload = {
    grants: [{
      grantId: 'caixaClose',
      actorRef: 'caixa',
      title: 'Close',
      description: 'Close a tab.',
      entityRefs: ['Comanda'],
      dataScope: { mode: 'custom', description: 'Tabs of the shift.' },
      disclosure: { mode: 'fullRecord', description: 'Operational record.' },
    }],
  };
  const gate = gateOf(payload, {
    actors: actorsOf(['caixa']),
    entities: COMANDA_ENTITIES,
    relationships: COMANDA_RELATIONSHIPS,
    journeys: [{ journeyId: 'fecharComanda', business: { actorRef: 'caixa' } }],
  });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.ok(gate.issues.some(issue => issue.code === 'NS5_ACCESS_CUSTOM_WITHOUT_PERSON' && issue.severity === 'warning'));
  assert.doesNotMatch(formatNs5AccessGate(gate.issues), /NS5_ACCESS_CUSTOM_WITHOUT_PERSON/);
});

void test('reembolso own and frota assigned and MemberOf related pass', () => {
  const colaborador = entity('Colaborador', 'person', [], { idField: 'colaboradorId' });
  const gestor = entity('Gestor', 'person', [], { idField: 'gestorId' });
  const despesa = entity('Despesa', 'none', ['despesaId', 'colaboradorId'], { idField: 'despesaId' });
  const motorista = entity('Motorista', 'person', [], { idField: 'motoristaId' });
  const veiculo = entity('Veiculo', 'none', ['veiculoId', 'motoristaId'], { idField: 'veiculoId' });
  const ownRelated = gateOf({
    grants: [
      {
        grantId: 'colaboradorOwn',
        actorRef: 'colaborador',
        title: 'Own',
        description: 'Own expenses.',
        entityRefs: ['Despesa'],
        dataScope: { mode: 'own', anchorEntity: 'Colaborador', description: 'Own expenses.' },
        disclosure: { mode: 'fullRecord', description: 'Expense record.' },
      },
      {
        grantId: 'gestorRelated',
        actorRef: 'gestor',
        title: 'Team',
        description: 'Team expenses.',
        entityRefs: ['Despesa'],
        dataScope: { mode: 'related', anchorEntity: 'Gestor', description: 'MemberOf team.' },
        disclosure: { mode: 'fullRecord', description: 'Expense record.' },
      },
    ],
  }, {
    actors: actorsOf(['colaborador', 'gestor']),
    entities: [colaborador, gestor, despesa],
    relationships: [
      rel('despesaOfColaborador', 'Despesa', 'Colaborador'),
      rel('colaboradorMemberOf', 'Colaborador', 'Gestor'),
    ],
    journeys: [
      { journeyId: 'lancarDespesa', business: { actorRef: 'colaborador' } },
      { journeyId: 'aprovarDespesa', business: { actorRef: 'gestor' } },
    ],
  });
  assert.equal(ownRelated.ok, true, ownRelated.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));

  const assigned = gateOf({
    grants: [{
      grantId: 'motoristaAssigned',
      actorRef: 'motorista',
      title: 'Assigned',
      description: 'Vehicles assigned to the driver.',
      entityRefs: ['Veiculo'],
      dataScope: { mode: 'assigned', anchorEntity: 'Motorista', description: 'Direct FK motoristaId.' },
      disclosure: { mode: 'fullRecord', description: 'Vehicle record.' },
    }],
  }, {
    actors: actorsOf(['motorista']),
    entities: [motorista, veiculo],
    relationships: [rel('veiculoAssignedToMotorista', 'Veiculo', 'Motorista')],
    journeys: [{ journeyId: 'registrarUso', business: { actorRef: 'motorista' } }],
  });
  assert.equal(assigned.ok, true, assigned.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('custom that does not cite the actor stays custom when a person is reachable', () => {
  const colaborador = entity('Colaborador', 'person', [], { idField: 'colaboradorId' });
  const despesa = entity('Despesa', 'none', ['despesaId', 'colaboradorId'], { idField: 'despesaId' });
  const gate = gateOf({
    grants: [{
      grantId: 'financeiroStatus',
      actorRef: 'financeiro',
      title: 'By status',
      description: 'Filter by approval status.',
      entityRefs: ['Despesa'],
      dataScope: { mode: 'custom', description: 'Approved expenses of the period.' },
      disclosure: { mode: 'fullRecord', description: 'Expense record.' },
    }],
  }, {
    actors: actorsOf(['financeiro']),
    entities: [colaborador, despesa],
    relationships: [rel('despesaOfColaborador', 'Despesa', 'Colaborador')],
    journeys: [{ journeyId: 'pagarDespesa', business: { actorRef: 'financeiro' } }],
  });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(gate.issues.some(issue => issue.code === 'NS5_ACCESS_CUSTOM_HAS_ANCHOR'), false);
});
