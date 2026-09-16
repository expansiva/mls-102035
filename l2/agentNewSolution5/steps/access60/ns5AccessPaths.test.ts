/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/access60/ns5AccessPaths.test.ts" enhancement="_blank"/>
/**
 * ns5_40 T1 + T2 — a disclosure addresses the TREE of the record, and the gate says so.
 *
 * RUNTIME HALF. `node scripts/run-tests.mjs 102035 l2` runs this; `tsx` transpiles without type-checking,
 * so this is the half that actually goes red there. The COMPILE half — that the three hand-written
 * `agendaClinica` files really are `Ns5OntologyAnyEntity` when handed to `resolvableFieldPaths` — lives in
 * `mls-102034/l1/mdm/defs/resolveMdmEntity.test.ts`, because `tsconfig.frontend.json` excludes
 * `**\/*.test.ts` while `tsconfig.backend.json` excludes only `*.spec.ts` (measured in ns5_39).
 *
 * The three v3 files are read as they are written; nothing here writes to `mls-102047`.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { loadNs5Access, loadNs5Entities, ns5ReplayModules } from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import type { Ns5AccessGrant, Ns5ModuleActor } from '/_102035_/l2/solution/types.js';
import { resolvableFieldPaths } from '/_102035_/l2/solution/lib.js';
import {
  applyNs5AccessFormNormalizations,
  ns5AccessResolvableFieldRefs,
  type Ns5AccessEntityView,
  type Ns5AccessRelationshipView,
} from '/_102035_/l2/agentNewSolution5/steps/access60/contracts.js';
import { validateNs5Access } from '/_102035_/l2/agentNewSolution5/steps/access60/gate.js';
import { agendaClinicaEntityConsulta } from '/_102035_/l2/agentNewSolution5/steps/ontology30/fixtures/agendaClinica-v3/Consulta.defs.js';
import { agendaClinicaEntityPaciente } from '/_102035_/l2/agentNewSolution5/steps/ontology30/fixtures/agendaClinica-v3/Paciente.defs.js';
import { agendaClinicaEntityProfissional } from '/_102035_/l2/agentNewSolution5/steps/ontology30/fixtures/agendaClinica-v3/Profissional.defs.js';

// ---------------------------------------------------------------------------
// T1 — what `resolvableFieldPaths` enumerates
// ---------------------------------------------------------------------------

void test('T1 v3: a module table resolves its root, its columns and every node of details', () => {
  assert.deepEqual(resolvableFieldPaths(agendaClinicaEntityConsulta), [
    'Consulta',
    'Consulta.id',
    'Consulta.version',
    'Consulta.pacienteId',
    'Consulta.profissionalId',
    'Consulta.scheduledAt',
    'Consulta.status',
    'Consulta.details',
    'Consulta.details.attendanceNote',
  ]);
});

void test('T1 v3: a role resolves the whole tree of the master record, branches included', () => {
  const paciente = resolvableFieldPaths(agendaClinicaEntityPaciente);
  // The branch AND its leaves: a grant may say `Paciente.details.person` or one field of it.
  for (const ref of [
    'Paciente',
    'Paciente.id',
    'Paciente.details',
    'Paciente.details.identification',
    'Paciente.details.identification.name',
    'Paciente.details.person',
    'Paciente.details.person.birthDate',
    'Paciente.details.person.privacyConsent',
    'Paciente.details.person.privacyConsent.revokedAt',
    'Paciente.details.base.addresses',
    'Paciente.details.base.addresses.postalCode',
    'Paciente.details.agendaClinica',
  ]) {
    assert.ok(paciente.includes(ref), `missing ${ref}`);
  }
  // `derived` is a write-side mark and must NOT filter a disclosure: both of these are `derived: true`
  // (Paciente.defs.ts:19-25 and :176-183) and both are required — by the IDS_ONLY case and by ns5_40 T4.
  assert.ok(paciente.includes('Paciente.id'));
  assert.ok(paciente.includes('Paciente.details.base.contacts'));
  assert.equal(new Set(paciente).size, paciente.length, 'paths repeat');
  assert.equal(resolvableFieldPaths(agendaClinicaEntityProfissional).length, 16);
  // What the platform never promised is absent.
  assert.equal(paciente.includes('Paciente.details.person.bloodType'), false);
});

void test('T1 v2: an entity of the eleven resolves fields, the identity and details, unchanged', () => {
  const entities = loadNs5Entities('ordenServicio5');
  for (const entity of entities) {
    const paths = resolvableFieldPaths(entity);
    assert.equal(paths[0], entity.entityId, 'the root comes first');
    const expected = new Set<string>([
      entity.entityId,
      `${entity.entityId}.${entity.storage.idField}`,
      ...entity.fields.map(field => `${entity.entityId}.${field.fieldId}`),
      ...Object.keys(entity.details ?? {}).map(name => `${entity.entityId}.details.${name}`),
    ]);
    assert.deepEqual(new Set(paths), expected, entity.entityId);
  }
  const order = entities.find(entity => entity.entityId === 'OrdenServicio');
  assert.ok(order, 'OrdenServicio is in the fixture');
  assert.ok(resolvableFieldPaths(order).includes('OrdenServicio.numeroOrden'));
});

// ---------------------------------------------------------------------------
// T2 — the gate over a v3 module
// ---------------------------------------------------------------------------

const AGENDA_ENTITIES: Ns5AccessEntityView[] = [
  { entityId: 'Paciente', party: 'person', kind: 'role', fields: [], storage: { idField: 'id' }, paths: resolvableFieldPaths(agendaClinicaEntityPaciente) },
  { entityId: 'Profissional', party: 'person', kind: 'role', fields: [], storage: { idField: 'id' }, writer: 'crud', paths: resolvableFieldPaths(agendaClinicaEntityProfissional) },
  { entityId: 'Consulta', party: 'none', kind: 'entity', fields: [], storage: { idField: 'id' }, paths: resolvableFieldPaths(agendaClinicaEntityConsulta) },
];

const AGENDA_RELATIONSHIPS: Ns5AccessRelationshipView[] = [
  { relationshipId: 'consultaPaciente', fromEntity: 'Consulta', toEntity: 'Paciente', required: true, type: 'manyToOne' },
  { relationshipId: 'consultaProfissional', fromEntity: 'Consulta', toEntity: 'Profissional', required: true, type: 'manyToOne' },
];

const AGENDA_ACTORS: Ns5ModuleActor[] = [
  { actorId: 'recepcionista', kind: 'internal', origin: 'named', title: 'Recepcionista', description: 'Cadastra e agenda.' },
  { actorId: 'profissional', kind: 'internal', origin: 'named', title: 'Profissional', description: 'Atende.' },
];

const AGENDA_JOURNEYS = [
  { journeyId: 'cadastrarPaciente', business: { actorRef: 'recepcionista' } },
  { journeyId: 'registrarAtendimento', business: { actorRef: 'profissional' } },
];

function agendaGate(grants: Ns5AccessGrant[]) {
  return validateNs5Access(grants, {
    moduleName: 'agendaClinica',
    actors: AGENDA_ACTORS,
    entities: AGENDA_ENTITIES,
    relationships: AGENDA_RELATIONSHIPS,
    journeys: AGENDA_JOURNEYS,
  });
}

/** The grant as `mls-102047/l4/agendaClinica/access.defs.ts:39-54` writes it today — the measured symptom. */
function idsOnlyGrant(): Ns5AccessGrant {
  return {
    grantId: 'gestaoAgendaRecepcionista',
    actorRef: 'recepcionista',
    title: 'Gestão de pacientes, profissionais e agenda',
    description: 'Cadastra pacientes, mantém profissionais e agenda consultas.',
    entityRefs: ['Paciente', 'Profissional', 'Consulta'],
    dataScope: { mode: 'organization', description: 'Toda a clínica.' },
    disclosure: {
      mode: 'fieldsOnly',
      description: 'Cadastro e agenda, sem a anotação clínica.',
      allowedFields: [
        'Paciente.id',
        'Profissional.id',
        'Consulta.id',
        'Consulta.pacienteId',
        'Consulta.profissionalId',
        'Consulta.scheduledAt',
        'Consulta.status',
      ],
    },
  };
}

/** The shape ns5_40 T4 gives the two grants; T4 itself is the supervisora's, by hand. */
function repairedGrants(): Ns5AccessGrant[] {
  return [
    {
      ...idsOnlyGrant(),
      disclosure: {
        mode: 'fieldsOnly',
        description: 'Cadastro e agenda, sem a anotação clínica.',
        deniedFields: ['Consulta.details.attendanceNote'],
      },
    },
    {
      grantId: 'agendaPropriaProfissional',
      actorRef: 'profissional',
      title: 'Agenda e atendimentos próprios',
      description: 'Consulta a própria agenda e registra o atendimento.',
      entityRefs: ['Consulta', 'Paciente'],
      dataScope: { mode: 'own', description: 'Somente as consultas do profissional autenticado.', anchorEntity: 'Profissional' },
      disclosure: {
        mode: 'fieldsOnly',
        description: 'A consulta inteira, e do paciente só nome e contato.',
        allowedFields: ['Consulta', 'Paciente.details.identification.name', 'Paciente.details.base.contacts'],
      },
    },
  ];
}

void test('T2 the measured symptom: ids only on the MDM roles warns, and the v2 field ref no longer resolves', () => {
  const gate = agendaGate([idsOnlyGrant(), repairedGrants()[1]]);
  const idsOnly = gate.issues.filter(issue => issue.code === 'NS5_ACCESS_DISCLOSURE_IDS_ONLY');
  assert.deepEqual(idsOnly.map(issue => issue.path), [
    'grants[0].entityRefs[0]',
    'grants[0].entityRefs[1]',
  ]);
  for (const issue of idsOnly) assert.equal(issue.severity, 'warning');
  assert.match(idsOnly[0].message, /Paciente only as Paciente\.id/);
  // Consulta is disclosed by five real columns, so it is NOT reported.
  assert.equal(idsOnly.some(issue => issue.message.includes('Consulta')), false);

  // `Consulta.attendanceNote` was the v2 spelling; on the tree the note sits under `details`.
  const stale = agendaGate([
    { ...idsOnlyGrant(), disclosure: { ...idsOnlyGrant().disclosure, deniedFields: ['Consulta.attendanceNote'] } },
    repairedGrants()[1],
  ]);
  const unknown = stale.issues.filter(issue => issue.code === 'NS5_ACCESS_DISCLOSURE_PATH_UNKNOWN');
  assert.equal(unknown.length, 1);
  assert.equal(unknown[0].severity, 'error');
  assert.equal(unknown[0].path, 'grants[0].disclosure.deniedFields[0]');
  assert.match(unknown[0].message, /Consulta\.attendanceNote is no path of the Consulta record/);
});

void test('T2 an invented path is an error, whatever depth it is written at', () => {
  const invented = (ref: string) => agendaGate([
    { ...idsOnlyGrant(), disclosure: { ...idsOnlyGrant().disclosure, deniedFields: [ref] } },
    repairedGrants()[1],
  ]).issues.filter(issue => issue.code === 'NS5_ACCESS_DISCLOSURE_PATH_UNKNOWN');
  for (const ref of [
    'Paciente.details.person.bloodType',
    'Paciente.details.prontuario',
    'Consulta.details.attendanceNote.author',
    'Profissional.crm',
  ]) {
    const issues = invented(ref);
    assert.equal(issues.length, 1, `${ref} should not resolve`);
    assert.match(issues[0].message, new RegExp(`^${ref.replace(/\./g, '\\.')} is no path`));
  }
  // …and a real one is accepted at every depth, root and branch included.
  for (const ref of [
    'Consulta',
    'Consulta.details',
    'Paciente.details.person',
    'Paciente.details.person.privacyConsent.revokedAt',
    'Paciente.details.base.contacts',
  ]) {
    assert.equal(invented(ref).length, 0, `${ref} should resolve`);
  }
});

void test('T2 the repaired grants of T4 pass the gate with no ids-only warning', () => {
  const gate = agendaGate(repairedGrants());
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  assert.equal(gate.issues.some(issue => issue.code === 'NS5_ACCESS_DISCLOSURE_IDS_ONLY'), false);
  // `allowedFields: ['Consulta', …]` is a proper subset of the tree, so the form cleanup leaves it alone.
  const { grants, normalizations } = applyNs5AccessFormNormalizations(repairedGrants(), AGENDA_ENTITIES);
  assert.equal(normalizations.length, 0);
  assert.equal(grants[1].disclosure.mode, 'fieldsOnly');
});

void test('T2 a v3 view answers with its paths and nothing else', () => {
  const paciente = AGENDA_ENTITIES[0];
  assert.deepEqual(ns5AccessResolvableFieldRefs(paciente), resolvableFieldPaths(agendaClinicaEntityPaciente));
});

// ---------------------------------------------------------------------------
// Non-regression: the new warning over every v2 fixture there is
// ---------------------------------------------------------------------------

void test('the ids-only warning fires on no grant of the thirteen v2 access fixtures', () => {
  const modules = ns5ReplayModules();
  assert.equal(modules.length, 13, modules.join(','));
  const offenders: string[] = [];
  let grantsSeen = 0;
  for (const moduleName of modules) {
    const access = loadNs5Access(moduleName);
    const entities: Ns5AccessEntityView[] = loadNs5Entities(moduleName).map(entity => ({
      entityId: entity.entityId,
      party: entity.party,
      kind: entity.kind,
      fields: entity.fields.map(field => ({ fieldId: field.fieldId })),
      ...(entity.details ? { details: entity.details } : {}),
      storage: { idField: entity.storage.idField },
    }));
    grantsSeen += access.grants.length;
    const gate = validateNs5Access([...access.grants], {
      moduleName,
      actors: access.actors,
      entities,
      relationships: [],
      journeys: access.actors.map(item => ({ journeyId: item.actorId, business: { actorRef: item.actorId } })),
    });
    for (const issue of gate.issues) {
      if (issue.code !== 'NS5_ACCESS_DISCLOSURE_IDS_ONLY') continue;
      offenders.push(`${moduleName}: ${issue.message}`);
    }
  }
  // A floor, not an equality: `agendaClinica` is one of these fixtures and a later leva regenerates it.
  // The zero is proved by the loop; this only says the loop really read the fixtures. Measured 40 on
  // 15/09/2026, of which 8 limited-disclosure grants.
  assert.ok(grantsSeen >= 40, `only ${grantsSeen} grants read; the fixtures shrank`);
  assert.deepEqual(offenders, [], offenders.join('\n'));
});

void test('on a v2 view the entity root and a deep path still do not resolve', () => {
  const comanda: Ns5AccessEntityView = {
    entityId: 'Comanda',
    party: 'none',
    fields: [{ fieldId: 'status' }],
    details: { total: { type: 'money', description: 'Soma.' } },
    storage: { idField: 'comandaId' },
  };
  const grant = (ref: string): Ns5AccessGrant => ({
    grantId: 'caixa',
    actorRef: 'caixa',
    title: 'Caixa',
    description: 'Fecha a comanda.',
    entityRefs: ['Comanda'],
    dataScope: { mode: 'organization', description: 'Tudo.' },
    disclosure: { mode: 'fieldsOnly', description: 'Parcial.', deniedFields: [ref] },
  });
  const check = (ref: string) => validateNs5Access([grant(ref)], {
    actors: [{ actorId: 'caixa', kind: 'internal', origin: 'named', title: 'Caixa', description: 'Caixa.' }],
    entities: [comanda],
    relationships: [],
    journeys: [{ journeyId: 'fecharComanda', business: { actorRef: 'caixa' } }],
  }).issues.filter(issue => issue.severity === 'error' && issue.path === 'grants[0].disclosure.deniedFields[0]');

  // Widening the reference grammar for v3 must not make either of these RESOLVE on a v2 entity.
  for (const ref of ['Comanda', 'Comanda.details.total.moeda', 'Comanda.fantasma']) {
    assert.equal(check(ref).length, 1, `${ref} must not resolve on a v2 entity`);
    assert.equal(check(ref)[0].code, 'NS5_ACCESS_FIELD_UNKNOWN', ref);
  }
  // …while the two v2 forms keep resolving.
  for (const ref of ['Comanda.status', 'Comanda.comandaId', 'Comanda.details.total']) {
    assert.deepEqual(check(ref), [], ref);
  }
});

void test('a v2 mdm entity that resolves only its identity is exempt, and one that resolves more is not', () => {
  const namespaceOnly: Ns5AccessEntityView = { entityId: 'Cliente', party: 'person', kind: 'mdm', fields: [], storage: { idField: 'clienteId' } };
  const richer: Ns5AccessEntityView = { entityId: 'Cliente', party: 'person', kind: 'mdm', fields: [{ fieldId: 'nome' }], storage: { idField: 'clienteId' } };
  const grant: Ns5AccessGrant = {
    grantId: 'recepcao',
    actorRef: 'recepcionista',
    title: 'Recepção',
    description: 'Atende.',
    entityRefs: ['Cliente', 'Pedido'],
    dataScope: { mode: 'organization', description: 'Tudo.' },
    disclosure: { mode: 'fieldsOnly', description: 'Só o necessário.', allowedFields: ['Cliente.clienteId', 'Pedido.numero'] },
  };
  const pedido: Ns5AccessEntityView = { entityId: 'Pedido', party: 'none', fields: [{ fieldId: 'numero' }, { fieldId: 'total' }], storage: { idField: 'pedidoId' } };
  const context = {
    actors: [{ actorId: 'recepcionista', kind: 'internal' as const, origin: 'named' as const, title: 'R', description: 'R' }],
    relationships: [] as Ns5AccessRelationshipView[],
    journeys: [{ journeyId: 'atender', business: { actorRef: 'recepcionista' } }],
  };
  const exempt = validateNs5Access([grant], { ...context, entities: [namespaceOnly, pedido] });
  assert.equal(exempt.issues.some(issue => issue.code === 'NS5_ACCESS_DISCLOSURE_IDS_ONLY'), false);
  const warned = validateNs5Access([grant], { ...context, entities: [richer, pedido] });
  const hit = warned.issues.filter(issue => issue.code === 'NS5_ACCESS_DISCLOSURE_IDS_ONLY');
  assert.equal(hit.length, 1);
  assert.equal(hit[0].path, 'grants[0].entityRefs[0]');
});
