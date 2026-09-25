/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/ontology30/agentNs5OntologyV3.test.ts" enhancement="_blank"/>

/**
 * The v3 side of ontology30 (ns5_42). Three things are proved here:
 *  - the four hand-written `agendaClinica` files are the FIXTURE OF FORM: what the generator has to
 *    produce is read back through the same readers the screen and the gate use, and passes;
 *  - every new gate check fires on a perturbed input and only there;
 *  - a v3 check never fires on a v2 artifact: the eleven recorded modules stay untouched until ns5_44.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { ddm } from '/_102034_/l4/ontology/ddm.defs.js';
import { mdm } from '/_102034_/l4/ontology/mdm.defs.js';
import { tdm } from '/_102034_/l4/ontology/tdm.defs.js';
import { resolveModuleEntity, resolvePlatformEntity } from '/_102034_/l2/mdm/resolveMdmEntity.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/agentNewSolution/helpers/ns4WorkerTools.js';
import { extractNs4ClassicJsonObject } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import { ns5FixturePath, ns5ReplayModules } from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import {
  buildNs5OntologyEntityHumanPrompt,
  buildNs5OntologyPlanHumanPrompt,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/agentNs5Ontology.js';
import {
  NS5_NAMESPACE_EMPTY_DESCRIPTION,
  assembleNs5OntologyIndexV3,
  buildNs5OntologyEntityV3Tool,
  buildNs5OntologyPlanV3Tool,
  collectNs5CitedCapabilitiesV3,
  collectNs5CitedRulesV3,
  collectNs5ModuleRuleIdsV3,
  formatNs5FamilyStartingPoint,
  formatNs5PlatformCatalog,
  formatNs5PlatformStartingPoint,
  liftNs5AggregateOnlyEntitiesV3,
  normalizeNs5OntologyEntityV3,
  normalizeNs5OntologyPlanV3,
  ns5ColumnIdsV3,
  ns5ResolvableFieldIdsV3,
  type Ns5OntologyV3Normalization,
  type Ns5OntologyV3PlanDraft,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/contractsV3.js';
import {
  nearestCapabilityId,
  validateNs5OntologyAssemblyV3,
  validateNs5OntologyEntityV3,
  validateNs5OntologyPlanV3,
  type Ns5OntologyV3Issue,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/gateV3.js';
import { resolvableFieldPaths } from '/_102035_/l2/solution/ontologyPaths.js';
import {
  NS5_ONTOLOGY_SCHEMA_VERSION_V3,
  type Ns5OntologyEntityV3,
  type Ns5OntologyIndexV3,
  type Ns5OntologyRoleV3,
  type Ns5OntologyTableV3,
  type Ns5RulesArtifact,
} from '/_102035_/l2/solution/types.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FORM = path.join(HERE, 'fixtures', 'agendaClinica-v3');

function loadSchema(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(HERE, '../../schemas', name), 'utf8')) as Record<string, unknown>;
}

function loadForm<T>(shortName: string): T {
  const source = readFileSync(path.join(FORM, `${shortName}.defs.ts`), 'utf8');
  return JSON.parse(extractNs4ClassicJsonObject(source)) as T;
}

const PACIENTE = loadForm<Ns5OntologyRoleV3>('Paciente');
const PROFISSIONAL = loadForm<Ns5OntologyRoleV3>('Profissional');
const CONSULTA = loadForm<Ns5OntologyTableV3>('Consulta');
const INDEX = loadForm<Ns5OntologyIndexV3>('index');
const RULES = loadForm<Ns5RulesArtifact>('rules');
const FORM_ENTITIES: Ns5OntologyEntityV3[] = [PACIENTE, PROFISSIONAL, CONSULTA];

/** The plan the generator has to reach for the fixture of form: derived from the index it wrote. */
function formPlan(): Ns5OntologyV3PlanDraft {
  return normalizeNs5OntologyPlanV3({
    businessDomain: INDEX.businessDomain,
    entities: FORM_ENTITIES.map(entity => ({
      entityId: entity.entityId,
      kind: entity.kind,
      ...(entity.kind === 'role' ? { subtype: entity.subtype } : { class: entity.class }),
      title: entity.title,
      description: entity.description,
      displayField: entity.displayField,
      writer: entity.writer ?? 'journey',
    })),
    relationships: INDEX.relationships.map(row => ({ ...row })),
  }, 'agendaClinica');
}

const gateContext = { moduleName: 'agendaClinica', mdm, tdm, ddm };

function codes(issues: readonly Ns5OntologyV3Issue[]): string[] {
  return issues.map(issue => issue.code);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// --- the fixture of form ---------------------------------------------------

void test('the four hand-written agendaClinica files are the v3 form and pass the v3 gate', () => {
  for (const entity of [...FORM_ENTITIES, INDEX as unknown as Ns5OntologyEntityV3]) {
    assert.equal(entity.schemaVersion, NS5_ONTOLOGY_SCHEMA_VERSION_V3);
  }
  const plan = formPlan();
  const planGate = validateNs5OntologyPlanV3(plan, gateContext);
  assert.deepEqual(planGate.issues.filter(issue => issue.severity === 'error'), []);
  for (const entity of FORM_ENTITIES) {
    const gate = validateNs5OntologyEntityV3(entity, plan, gateContext);
    assert.deepEqual(
      gate.issues.filter(issue => issue.severity === 'error'),
      [],
      `${entity.entityId}: ${codes(gate.issues).join(', ')}`,
    );
  }
  const assembly = validateNs5OntologyAssemblyV3(INDEX, FORM_ENTITIES, gateContext);
  assert.deepEqual(assembly.issues.filter(issue => issue.severity === 'error'), []);
});

void test('the form measured: branches, capabilities, rules, columns, resolvable paths', () => {
  // Paciente: a role with the five branches and an EMPTY module namespace.
  const branches = Object.keys(PACIENTE.record.fields.details?.fields ?? {});
  assert.deepEqual(branches, ['identification', 'base', 'person', 'general', 'agendaClinica']);
  assert.deepEqual(Object.keys(PACIENTE.record.fields.details?.fields?.agendaClinica?.fields ?? {}), []);
  assert.equal(Object.keys(PACIENTE.capabilities).length, 15);
  assert.equal(PACIENTE.rules.length, 6);
  assert.equal(resolvableFieldPaths(PACIENTE).length, 35);
  assert.equal(resolvableFieldPaths(PROFISSIONAL).length, 16);
  assert.equal(resolvableFieldPaths(CONSULTA).length, 9);

  // Profissional: the namespace is NOT empty, because the prompt asked for medico|terapeuta.
  const tipo = PROFISSIONAL.record.fields.details?.fields?.agendaClinica?.fields?.tipo;
  assert.equal(tipo?.type, 'enum');
  assert.deepEqual((tipo?.values ?? []).map(item => (typeof item === 'string' ? item : item.value)), ['medico', 'terapeuta']);

  // Consulta: six indexed columns and one details branch; uniqueKeys over columns only.
  assert.deepEqual(ns5ColumnIdsV3(CONSULTA), ['id', 'version', 'pacienteId', 'profissionalId', 'scheduledAt', 'status']);
  for (const id of ns5ColumnIdsV3(CONSULTA)) {
    if (id === 'version') continue;
    assert.equal(CONSULTA.record.fields[id].indexed, true, id);
  }
  assert.deepEqual(CONSULTA.uniqueKeys, [['profissionalId', 'scheduledAt']]);
  assert.deepEqual(Object.keys(CONSULTA.record.fields.details?.fields ?? {}), ['attendanceNote']);

  // The index carries the seven links and every relationshipId the entities cite.
  assert.equal(INDEX.relationships.length, 7);
  const known = new Set(INDEX.relationships.map(row => row.relationshipId));
  for (const entity of FORM_ENTITIES) {
    for (const link of Object.values(entity.relationships)) assert.ok(known.has(link.relationshipId), link.relationshipId);
  }
});

void test('the form is readable by resolveModuleEntity without a conflict or an unresolved id', () => {
  for (const entity of FORM_ENTITIES) {
    const view = resolveModuleEntity(entity, INDEX, mdm, RULES);
    assert.equal(view.entityId, entity.entityId);
    assert.deepEqual(view.relationships.filter(link => link.conflict).map(link => link.conflict), []);
    assert.deepEqual(view.capabilities.filter(item => item.unresolved).map(item => item.id), []);
    assert.deepEqual(view.rules.filter(item => item.unresolved).map(item => item.id), []);
  }
});

// --- T7: what the pipeline records -----------------------------------------

void test('citedRules, citedCapabilities and the module rules rules40 has to produce', () => {
  assert.deepEqual(collectNs5ModuleRuleIdsV3(FORM_ENTITIES, mdm).sort(), [
    'anotacaoObrigatoriaNoAtendimento',
    'contatoParaConfirmarConsulta',
    'horarioProfissionalExclusivo',
    'inativoNaoAgenda',
    'menorExigeResponsavel',
  ]);
  const cited = collectNs5CitedRulesV3(FORM_ENTITIES);
  assert.ok(cited.includes('rule-person-privacy-consent-required-br-eu'));
  assert.equal(new Set(cited).size, cited.length);
  const capabilities = collectNs5CitedCapabilitiesV3(FORM_ENTITIES);
  assert.ok(capabilities.includes('locate.byName'));
  assert.ok(capabilities.includes('agendaClinica.agendar'));
});

// --- T2: the plan ----------------------------------------------------------

void test('normalize derives roleTag, source and storage, and never asks for them', () => {
  const plan = normalizeNs5OntologyPlanV3({
    businessDomain: 'Clinic',
    entities: [
      { entityId: 'Paciente', kind: 'role', subtype: 'Person', title: 'Paciente', description: 'x', displayField: 'details.identification.name', writer: 'journey' },
      { entityId: 'Consulta', kind: 'entity', class: 'core', title: 'Consulta', description: 'x', displayField: 'scheduledAt', writer: 'journey' },
    ],
    relationships: [
      { relationshipId: 'consultaPaciente', from: 'Consulta', to: 'Paciente', type: 'manyToOne', required: true, mode: 'fk', description: 'x' },
    ],
  }, 'agendaClinica');
  assert.equal(plan.entities[0].roleTag, 'agendaClinica.Paciente');
  assert.equal(plan.entities[0].source, '/_102034_/l4/ontology/mdm.defs.ts');
  assert.deepEqual(plan.entities[1].storage, { target: 'moduleDatabase', table: 'agendaClinica_consulta', kind: 'relational' });
  // `field` is derived when the model omits it.
  assert.equal(plan.relationships[0].field, 'Consulta.pacienteId');
  assert.ok(plan.normalizations?.some(item => item.kind === 'derivedFromPlatform'));
});

void test('the plan gate refuses an unknown subtype, catalog type, role and endpoint', () => {
  const bad = normalizeNs5OntologyPlanV3({
    businessDomain: 'Clinic',
    entities: [
      { entityId: 'Paciente', kind: 'role', subtype: 'Patient', title: 'x', description: 'x', displayField: 'details.identification.name' },
    ],
    relationships: [
      { relationshipId: 'x', from: 'Paciente', to: 'ContactChannel', type: 'oneToMany', required: false, mode: 'mdmRelationship', catalogType: 'HasPhone', description: 'x' },
    ],
  }, 'agendaClinica');
  const issues = codes(validateNs5OntologyPlanV3(bad, gateContext).issues);
  assert.ok(issues.includes('NS5_ONTOLOGY_SUBTYPE_UNKNOWN'));
  assert.ok(issues.includes('NS5_ONTOLOGY_CATALOG_TYPE_UNKNOWN'));

  const wrongRole = clone(formPlan());
  const guardian = wrongRole.relationships.find(row => row.relationshipId === 'pacienteResponsavel');
  guardian!.roles = ['babysitter'];
  assert.ok(codes(validateNs5OntologyPlanV3(wrongRole, gateContext).issues).includes('NS5_ONTOLOGY_CATALOG_ROLE_UNKNOWN'));

  const wrongEnd = clone(formPlan());
  const contatos = wrongEnd.relationships.find(row => row.relationshipId === 'pacienteContatos');
  contatos!.catalogType = 'Employs';
  assert.ok(codes(validateNs5OntologyPlanV3(wrongEnd, gateContext).issues).includes('NS5_ONTOLOGY_CATALOG_ENDPOINT'));
});

void test('composition refuses a child that is also an entity or is referenced by a third party', () => {
  const plan = normalizeNs5OntologyPlanV3({
    businessDomain: 'Orders',
    entities: [
      { entityId: 'Pedido', kind: 'entity', class: 'core', title: 'x', description: 'x', displayField: 'numero' },
      { entityId: 'Item', kind: 'entity', class: 'supporting', title: 'x', description: 'x', displayField: 'nome' },
    ],
    relationships: [
      { relationshipId: 'pedidoItens', from: 'Pedido', to: 'Item', type: 'oneToMany', required: true, mode: 'composition', description: 'x' },
      { relationshipId: 'itemProduto', from: 'Item', to: 'Pedido', type: 'manyToOne', required: true, mode: 'fk', description: 'x' },
    ],
  }, 'orders');
  const issues = codes(validateNs5OntologyPlanV3(plan, { moduleName: 'orders', mdm, tdm, ddm }).issues);
  assert.ok(issues.includes('NS5_ONTOLOGY_COMPOSITION_IS_ENTITY'));
  assert.ok(issues.includes('NS5_ONTOLOGY_COMPOSITION_REFERENCED'));
  // A composition row never reaches the index: there is nothing to walk.
  const index = assembleNs5OntologyIndexV3(plan, 'ns');
  assert.deepEqual(index.relationships.map(row => row.relationshipId), ['itemProduto']);
});

// --- T4: the table ---------------------------------------------------------

void test('probe: a column without an index is NS5_ONTOLOGY_COLUMN_WITHOUT_INDEX', () => {
  const plan = formPlan();
  const clean = validateNs5OntologyEntityV3(CONSULTA, plan, gateContext);
  assert.equal(codes(clean.issues).includes('NS5_ONTOLOGY_COLUMN_WITHOUT_INDEX'), false);

  const perturbed = clone(CONSULTA);
  delete perturbed.record.fields.scheduledAt.indexed;
  const red = validateNs5OntologyEntityV3(perturbed, plan, gateContext);
  assert.equal(red.ok, false);
  assert.deepEqual(
    red.issues.filter(issue => issue.code === 'NS5_ONTOLOGY_COLUMN_WITHOUT_INDEX').map(issue => issue.path),
    ['entities.Consulta.record.fields.scheduledAt'],
  );
  // restored: the same object read again is green.
  assert.deepEqual(validateNs5OntologyEntityV3(CONSULTA, plan, gateContext).issues.filter(issue => issue.severity === 'error'), []);
});

void test('probe: uniqueKeys over something that is not a column, and a record pointing nowhere', () => {
  const plan = formPlan();
  const perturbed = clone(CONSULTA);
  perturbed.uniqueKeys = [['profissionalId', 'attendanceNote']];
  perturbed.record.fields.pacienteId.to = ['Paciente', 'Cliente'];
  const issues = codes(validateNs5OntologyEntityV3(perturbed, plan, gateContext).issues);
  assert.ok(issues.includes('NS5_ONTOLOGY_UNIQUE_KEY_NOT_COLUMN'));
  assert.ok(issues.includes('NS5_ONTOLOGY_RECORD_TARGET_UNKNOWN'));
});

void test('probe: a cardinality that disagrees with the index row', () => {
  const plan = formPlan();
  const perturbed = clone(CONSULTA);
  perturbed.relationships.paciente.cardinality = '1:N';
  const red = validateNs5OntologyEntityV3(perturbed, plan, gateContext);
  assert.equal(red.ok, false);
  assert.ok(codes(red.issues).includes('NS5_ONTOLOGY_CARDINALITY_INCOHERENT'));
});

// --- T3: the role ----------------------------------------------------------

void test('probe: the namespace may not imitate a platform service', () => {
  const plan = formPlan();
  for (const [id, field] of [
    ['fotoUrl', { type: 'string', title: 'Foto' }],
    ['photos', { type: 'string', collection: true, title: 'Photos' }],
    ['comprovante', { type: 'string', title: 'Comprovante' }],
    ['telefoneCelular', { type: 'string', title: 'Telefone' }],
    ['documentScan', { type: 'string', title: 'Scan' }],
  ] as const) {
    const perturbed = clone(PACIENTE);
    perturbed.record.fields.details!.fields!.agendaClinica.fields = { [id]: field } as never;
    const red = validateNs5OntologyEntityV3(perturbed, plan, gateContext);
    assert.equal(red.ok, false, id);
    const issue = red.issues.find(item => item.code === 'NS5_ONTOLOGY_NAMESPACE_IMITATES_SERVICE');
    assert.ok(issue, `${id} was not caught`);
    assert.match(issue.message, /attach\.document|link\.contact/);
  }
  // A field of the module that imitates nothing is not an error.
  const fine = clone(PACIENTE);
  fine.record.fields.details!.fields!.agendaClinica.fields = {
    convenio: { type: 'string', title: 'Convenio' },
  } as never;
  assert.equal(codes(validateNs5OntologyEntityV3(fine, plan, gateContext).issues).includes('NS5_ONTOLOGY_NAMESPACE_IMITATES_SERVICE'), false);
});

void test('probe: the namespace may not redeclare what the platform owns, and warns without a trace', () => {
  const plan = formPlan();
  const conflict = clone(PACIENTE);
  conflict.record.fields.details!.fields!.agendaClinica.fields = { docId: { type: 'string' } } as never;
  assert.ok(codes(validateNs5OntologyEntityV3(conflict, plan, gateContext).issues).includes('NS5_ONTOLOGY_NAMESPACE_CONFLICT'));

  const invented = clone(PACIENTE);
  invented.record.fields.details!.fields!.agendaClinica.fields = { pontuacaoFidelidade: { type: 'integer' } } as never;
  const withEvidence = validateNs5OntologyEntityV3(invented, plan, {
    ...gateContext,
    evidenceText: 'A clinica agenda consultas para pacientes.',
  });
  assert.ok(codes(withEvidence.issues).includes('NS5_ONTOLOGY_NAMESPACE_WITHOUT_TRACE'));
  assert.equal(withEvidence.ok, true, 'a missing trace is a warning, not an error');
  const traced = validateNs5OntologyEntityV3(invented, plan, {
    ...gateContext,
    evidenceText: 'A clinica guarda a pontuacaoFidelidade do paciente.',
  });
  assert.equal(codes(traced.issues).includes('NS5_ONTOLOGY_NAMESPACE_WITHOUT_TRACE'), false);
});

void test('probe: a role may only tighten, and never invent a field on a platform branch', () => {
  const plan = formPlan();
  const widened = clone(PACIENTE);
  widened.record.fields.details!.fields!.identification.fields!.docType.values = ['CPF', 'Passport', 'Sticker'];
  const wide = validateNs5OntologyEntityV3(widened, plan, gateContext);
  assert.equal(wide.ok, false);
  const loosened = wide.issues.find(issue => issue.code === 'NS5_ONTOLOGY_PLATFORM_FIELD_LOOSENED');
  assert.ok(loosened);
  assert.match(loosened.message, /Sticker/);

  const derived = clone(PACIENTE);
  delete derived.record.fields.details!.fields!.identification.fields!.status.derived;
  assert.ok(codes(validateNs5OntologyEntityV3(derived, plan, gateContext).issues).includes('NS5_ONTOLOGY_PLATFORM_FIELD_LOOSENED'));

  const invented = clone(PACIENTE);
  invented.record.fields.details!.fields!.person.fields!.prontuario = { type: 'string' } as never;
  const red = validateNs5OntologyEntityV3(invented, plan, gateContext);
  assert.equal(red.ok, false);
  const unknown = red.issues.find(issue => issue.code === 'NS5_ONTOLOGY_PLATFORM_FIELD_UNKNOWN');
  assert.ok(unknown);
  assert.match(unknown.message, /details\.agendaClinica/);
});

void test('probe: an empty namespace carries the fixed description, never an example', () => {
  const plan = formPlan();
  const perturbed = clone(PACIENTE);
  perturbed.record.fields.details!.fields!.agendaClinica.fields = {};
  perturbed.record.fields.details!.fields!.agendaClinica.description = 'For example: convenio, prontuario.';
  const issues = validateNs5OntologyEntityV3(perturbed, plan, gateContext).issues;
  assert.ok(codes(issues).includes('NS5_ONTOLOGY_NAMESPACE_EMPTY_TEXT'));
  // normalize is what writes it: an empty namespace comes back with the fixed sentence.
  const normalizations: Ns5OntologyV3Normalization[] = [];
  const built = normalizeNs5OntologyEntityV3({
    entityId: 'Paciente',
    record: { fields: [{ id: 'details', type: 'object', fields: [] }] },
    relationships: [],
    capabilities: [],
    rules: [],
  }, 'Paciente', { moduleName: 'agendaClinica', mdm, plan }, normalizations);
  assert.equal(
    built!.record.fields.details?.fields?.agendaClinica?.description,
    NS5_NAMESPACE_EMPTY_DESCRIPTION,
  );
  assert.ok(normalizations.some(item => item.kind === 'namespaceEmpty'));
});

void test('probe: unknown capability and rule ids', () => {
  const plan = formPlan();
  const perturbed = clone(PACIENTE);
  perturbed.capabilities = {
    'locate.byName': 'ok',
    'locate.byVibe': 'invented',
    'agendaClinica.listarConsultas': 'ok',
  } as never;
  perturbed.rules = ['rule-person-privacy-consent-required-br-eu', 'rule-invented-by-the-model', 'minhaRegra'] as never;
  const issues = codes(validateNs5OntologyEntityV3(perturbed, plan, gateContext).issues);
  assert.ok(issues.includes('NS5_ONTOLOGY_CAPABILITY_UNKNOWN'));
  assert.ok(issues.includes('NS5_ONTOLOGY_RULE_UNKNOWN'));
});

// --- normalize: what the model writes becomes the form ---------------------

void test('normalize builds the five branches and fills in the platform structure', () => {
  const plan = formPlan();
  const normalizations: Ns5OntologyV3Normalization[] = [];
  const built = normalizeNs5OntologyEntityV3({
    entityId: 'Paciente',
    record: {
      fields: [
        { id: 'details', type: 'object', fields: [
          { id: 'identification', type: 'object', fields: [
            { id: 'name', type: 'string', required: true, title: 'Nome completo' },
            { id: 'docType', type: 'enum', required: true, title: 'Tipo', values: [{ value: 'CPF', title: 'CPF' }] },
            { id: 'status', type: 'enum', required: true, title: 'Situacao' },
          ] },
        ] },
      ],
    },
    relationships: [
      { name: 'consultas', relationshipId: 'consultaPaciente', to: 'Consulta', cardinality: '1:N', title: 'Consultas' },
    ],
    capabilities: [{ id: 'locate.byName', sentence: 'Recepcao localiza pelo nome' }],
    rules: ['inativoNaoAgenda'],
  }, 'Paciente', { moduleName: 'agendaClinica', mdm, plan }, normalizations)!;

  assert.deepEqual(Object.keys(built.record.fields), ['id', 'version', 'details']);
  assert.equal(built.record.fields.version.writePrecondition, true, 'MDM role restores the catalog write precondition when the draft omits it');
  assert.equal(built.record.fields.id.writePrecondition, undefined);
  assert.deepEqual(
    Object.keys(built.record.fields.details!.fields!),
    ['identification', 'base', 'person', 'general', 'agendaClinica'],
  );
  // The platform structure is restored whatever the model wrote or omitted.
  const status = built.record.fields.details!.fields!.identification.fields!.status;
  assert.equal(status.derived, true);
  assert.equal(status.indexed, true);
  assert.deepEqual(status.values, ['Active', 'Inactive', 'Merged', 'Blocked']);
  // The domain the module narrowed is kept and recorded.
  assert.deepEqual(built.record.fields.details!.fields!.identification.fields!.docType.values, [{ value: 'CPF', title: 'CPF' }]);
  assert.ok(normalizations.some(item => item.kind === 'tightened' && item.detail.endsWith('docType.values')));
  // `general` stays open and the module namespace is empty with the fixed text.
  assert.equal(built.record.fields.details!.fields!.general.open, true);
  assert.equal(built.record.fields.details!.fields!.agendaClinica.owner, 'module');
  // `via` comes from the plan, never from the model.
  assert.equal(built.relationships.consultas.via, 'Consulta.pacienteId');
  assert.equal(built.relationships.consultas.mode, 'fk');
  assert.equal((built as Ns5OntologyRoleV3).roleTag, 'agendaClinica.Paciente');
});

void test('normalize indexes a foreign key and writes id and version of a table', () => {
  const plan = formPlan();
  const normalizations: Ns5OntologyV3Normalization[] = [];
  const built = normalizeNs5OntologyEntityV3({
    entityId: 'Consulta',
    record: {
      fields: [
        { id: 'pacienteId', type: 'record', to: ['Paciente'], required: true, title: 'Paciente' },
        { id: 'details', type: 'object', fields: [{ id: 'attendanceNote', type: 'text', title: 'Nota' }] },
      ],
    },
    relationships: [],
    capabilities: [],
    rules: [],
  }, 'Consulta', { moduleName: 'agendaClinica', mdm, plan }, normalizations)! as Ns5OntologyTableV3;
  assert.equal(built.record.fields.id.type, 'uuid');
  assert.equal(built.record.fields.version.derived, true);
  assert.equal(built.record.fields.version.writePrecondition, undefined, 'a non-MDM version field is not marked by name');
  assert.equal(built.record.fields.pacienteId.indexed, true, 'a foreign key is indexed by derivation');
  assert.deepEqual(built.storage, { target: 'moduleDatabase', table: 'agendaClinica_consulta', kind: 'relational' });
  assert.ok(normalizations.some(item => item.detail.includes('foreign key')));
});

// --- the eleven v2 modules are not this gate's business --------------------

void test('no v3 check fires on any recorded v2 module artifact', () => {
  const plan = formPlan();
  let checked = 0;
  let fired = 0;
  for (const moduleName of ns5ReplayModules()) {
    const folder = ns5FixturePath('steps/ontology30/fixtures', moduleName);
    let index: { entities?: string[] };
    try {
      index = JSON.parse(extractNs4ClassicJsonObject(readFileSync(path.join(folder, 'index.defs.ts'), 'utf8')));
    } catch {
      continue;
    }
    for (const entityId of index.entities ?? []) {
      const source = readFileSync(path.join(folder, `${entityId}.defs.ts`), 'utf8');
      const entity = JSON.parse(extractNs4ClassicJsonObject(source)) as Ns5OntologyEntityV3;
      checked += 1;
      const gate = validateNs5OntologyEntityV3(entity, plan, gateContext);
      if (gate.issues.length) fired += 1;
    }
  }
  assert.ok(checked >= 40, `only ${checked} v2 entities were read`);
  assert.equal(fired, 0, `${fired} of ${checked} v2 entities made a v3 check fire`);
});

// --- tools and prompts (T1) ------------------------------------------------

void test('the v3 tool schemas are provider-clean and the field schema is self-recursive', () => {
  const plan = buildNs5OntologyPlanV3Tool(loadSchema('ontology-plan-v3.schema.json'), createNs4FlexibleWorkerTool);
  const entity = buildNs5OntologyEntityV3Tool(loadSchema('ontology-entity-v3.schema.json'), createNs4FlexibleWorkerTool);
  assert.equal(plan.function.name, 'submitNs5OntologyPlan');
  assert.equal(entity.function.name, 'submitNs5Entity');
  assert.equal(lintToolSchema(JSON.stringify(plan.function.parameters)), null);
  assert.equal(lintToolSchema(JSON.stringify(entity.function.parameters)), null);
  // The recursion the spec asks about: `$defs.field.properties.fields.items` points back at the field.
  const defs = (entity.function.parameters as { $defs: Record<string, { properties: Record<string, { items?: { $ref?: string } }> }> }).$defs;
  assert.equal(defs.field.properties.fields.items?.$ref, '#/$defs/field');
});

void test('the plan prompt teaches the two kinds and the four modes, with no business domain', () => {
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /\*\*`role`\*\*/);
  assert.match(prompt, /\*\*`entity`\*\*/);
  for (const mode of ['`fk`', '`mdmRelationship`', '`throughTable`', '`composition`']) {
    assert.ok(prompt.includes(mode), mode);
  }
  assert.match(prompt, /never a\s+field and never a table of the module/);
  assert.doesNotMatch(prompt, /comanda|garcom|waiter|paciente|consulta/i);
});

void test('the entity prompt teaches copy-and-tighten, the column rule and the empty namespace', () => {
  const prompt = readFileSync(path.join(HERE, 'promptEntity.md'), 'utf8');
  assert.match(prompt, /## Starting point \(platform record for <Subtype>\)/);
  assert.match(prompt, /\*\*Only tighten\*\*/);
  assert.match(prompt, /A column with no index is refused/);
  assert.match(prompt, /an empty namespace is the right answer/);
  assert.match(prompt, /`attach\.document`/);
  assert.match(prompt, /`link\.contact`/);
  assert.match(prompt, /prefix\s+`<moduleName>\.`/);
});

void test('the human prompts carry the platform catalog, the starting point and the cited transitions', () => {
  const plan = formPlan();
  const planPrompt = buildNs5OntologyPlanHumanPrompt({
    sourcePrompt: 'Uma clinica agenda consultas.',
    userLanguage: 'pt-BR',
    actors: [{ actorId: 'recepcionista', kind: 'internal', origin: 'named', title: 'Recepcionista', description: 'Front desk.' }],
    journeys: [],
    platformCatalog: formatNs5PlatformCatalog(mdm),
  });
  assert.match(planPrompt, /## Platform catalog \(level 1\)/);
  assert.match(planPrompt, /- Person · Natural persons/);
  assert.match(planPrompt, /- GuardianOf · Person -> Person\|Animal · roles: parent\|guardian\|owner\|foster/);
  assert.match(planPrompt, /Uma clinica agenda consultas/);

  const startingPoint = formatNs5PlatformStartingPoint(resolvePlatformEntity(mdm, 'Person', 'agendaClinica'), 'Person');
  const entityPrompt = buildNs5OntologyEntityHumanPrompt({
    sourcePrompt: 'Uma clinica agenda consultas.',
    userLanguage: 'pt-BR',
    actors: [],
    journeys: [],
    plan,
    entityId: 'Paciente',
    startingPoint,
    platformCatalog: formatNs5PlatformCatalog(mdm),
  });
  assert.match(entityPrompt, /## Starting point \(platform record for Person\)/);
  assert.match(entityPrompt, /details\.identification\.name · string · required · indexed/);
  assert.match(entityPrompt, /details\.agendaClinica · owner module/);
  assert.match(entityPrompt, /Cited transitions this entity must declare/);
  // The links of this entity travel with the relationshipId frozen by the plan.
  assert.match(entityPrompt, /pacienteResponsavel/);
});

void test('persistArtifacts writes the v3 entities, the v3 index and the T7 pipeline keys', () => {
  const source = readFileSync(new URL('./agentNs5Ontology.ts', import.meta.url), 'utf8');
  const persist = source.slice(source.indexOf('async function persistArtifacts'));
  assert.match(persist, /'Ns5OntologyEntityV3'/);
  assert.match(persist, /'Ns5OntologyIndexV3'/);
  assert.match(persist, /reconcileModuleDefs\(moduleName, 'ontology'/);
  assert.match(persist, /removedOrphans/);
  assert.match(persist, /normalizations/);
  assert.match(persist, /citedRules/);
  assert.match(persist, /citedCapabilities/);
  assert.match(persist, /uncitedEntities/);
  assert.match(persist, /writeStepState/);
});

void test('ns5ResolvableFieldIdsV3 answers the internal question, resolvableFieldPaths the disclosure one', () => {
  const ids = ns5ResolvableFieldIdsV3(PACIENTE);
  assert.ok(ids.includes('details.identification.name'));
  assert.equal(ids.includes('Paciente'), false);
  assert.equal(resolvableFieldPaths(PACIENTE)[0], 'Paciente');
  assert.equal(resolvableFieldPaths(PACIENTE).length, ids.length + 1);
});

void test('a panel entity nobody writes is lifted into module.details and leaves the ontology', () => {
  const plan = normalizeNs5OntologyPlanV3({
    businessDomain: 'Clinic',
    entities: [
      { entityId: 'Consulta', kind: 'entity', class: 'core', title: 'x', description: 'x', displayField: 'scheduledAt' },
      { entityId: 'PainelDoDia', kind: 'entity', class: 'supporting', title: 'x', description: 'x', displayField: 'total' },
    ],
    relationships: [],
  }, 'agendaClinica');
  const panel = normalizeNs5OntologyEntityV3({
    entityId: 'PainelDoDia',
    record: { fields: [{ id: 'details', type: 'object', fields: [
      { id: 'totalDoDia', type: 'integer', description: 'Quantas consultas hoje' },
    ] }] },
    relationships: [], capabilities: [], rules: [],
  }, 'PainelDoDia', { moduleName: 'agendaClinica', mdm, plan })!;
  const table = normalizeNs5OntologyEntityV3({
    entityId: 'Consulta',
    record: { fields: [
      { id: 'scheduledAt', type: 'timestamp', required: true, indexed: true },
      { id: 'details', type: 'object', fields: [] },
    ] },
    relationships: [], capabilities: [], rules: [],
  }, 'Consulta', { moduleName: 'agendaClinica', mdm, plan })!;

  const journeys = [{ business: { steps: [{ kind: 'act', entity: 'Consulta' }, { kind: 'locate', entity: 'PainelDoDia' }] } }];
  const lift = liftNs5AggregateOnlyEntitiesV3(plan, [table, panel], journeys);
  assert.deepEqual(lift.liftedEntityIds, ['PainelDoDia']);
  assert.deepEqual(lift.entities.map(entity => entity.entityId), ['Consulta']);
  assert.deepEqual(lift.plan.entities.map(entity => entity.entityId), ['Consulta']);
  assert.deepEqual(lift.moduleDetails.totalDoDia, { type: 'integer', description: 'Quantas consultas hoje' });

  // An act that writes it, or a link that touches it, keeps it a table.
  const written = liftNs5AggregateOnlyEntitiesV3(plan, [table, panel], [
    { business: { steps: [{ kind: 'act', entity: 'PainelDoDia' }] } },
  ]);
  assert.deepEqual(written.liftedEntityIds, []);
  assert.deepEqual(liftNs5AggregateOnlyEntitiesV3(plan, FORM_ENTITIES, []).liftedEntityIds, [], 'the form has no panel');
});

void test('the namespace trace is silent on the gabarito and folds accents on both sides', () => {
  const plan = formPlan();
  const sourcePrompt = (JSON.parse(readFileSync(
    path.join(HERE, '../module10/fixtures/agendaClinica-draft.json'),
    'utf8',
  )) as { sourcePrompt: string }).sourcePrompt;
  // The one namespace field of the gabarito, against the request that produced it.
  const gate = validateNs5OntologyEntityV3(PROFISSIONAL, plan, { ...gateContext, evidenceText: sourcePrompt });
  assert.deepEqual(gate.issues, [], codes(gate.issues).join(', '));

  // The accent is what makes it work: `medico` has to find `medicos` inside "medicos e terapeutas".
  const onlyMedico = clone(PROFISSIONAL);
  onlyMedico.record.fields.details!.fields!.agendaClinica.fields = {
    especialidade: { type: 'enum', title: 'Especialidade', values: [{ value: 'medico', title: 'Medico' }] },
  } as never;
  assert.equal(
    codes(validateNs5OntologyEntityV3(onlyMedico, plan, { ...gateContext, evidenceText: sourcePrompt }).issues).includes('NS5_ONTOLOGY_NAMESPACE_WITHOUT_TRACE'),
    false,
    'medico must match medicos in the accented request',
  );
  assert.ok(
    codes(validateNs5OntologyEntityV3(onlyMedico, plan, { ...gateContext, evidenceText: 'a clinica agenda consultas.' }).issues).includes('NS5_ONTOLOGY_NAMESPACE_WITHOUT_TRACE'),
  );
});

// --- ns5_46: the family, its catalog and the starting point of a table ------

/** A plan with one role, one movement and one summary. The drafts carry no `family`: it is derived. */
function familyPlan(): Ns5OntologyV3PlanDraft {
  return normalizeNs5OntologyPlanV3({
    businessDomain: 'Clinic',
    entities: [
      { entityId: 'Paciente', kind: 'role', subtype: 'Person', title: 'Paciente', description: 'x', displayField: 'details.identification.name', writer: 'journey' },
      { entityId: 'Consulta', kind: 'entity', class: 'core', title: 'Consulta', description: 'x', displayField: 'scheduledAt', writer: 'journey' },
      { entityId: 'ConsultasPorDia', kind: 'entity', class: 'supporting', family: 'ddm', storageKind: 'timeSeries', title: 'Consultas por dia', description: 'x', displayField: 'bucketStart', writer: 'journey' },
    ],
    relationships: [],
  }, 'agendaClinica');
}

void test('ns5_46: the family is derived from the kind when the draft has none, and kept when it is written', () => {
  const plan = familyPlan();
  assert.equal(plan.entities[0].family, 'mdm', 'a role with no family is mdm');
  assert.equal(plan.entities[1].family, 'tdm', 'a table with no family is tdm');
  assert.equal(plan.entities[2].family, 'ddm', 'a family the model wrote is kept');
  assert.equal(plan.entities[2].storage?.kind, 'timeSeries');
  assert.equal(plan.entities[1].storage?.kind, 'relational', 'a table that says nothing is relational');
  assert.equal(plan.entities[0].storage, undefined, 'a role has no storage of its own');
  // T6: the thirteen recorded modules and the hand-written form carry no family, and are unchanged.
  for (const entity of formPlan().entities) {
    assert.equal(entity.family, entity.kind === 'role' ? 'mdm' : 'tdm', entity.entityId);
  }
  assert.deepEqual(validateNs5OntologyPlanV3(formPlan(), gateContext).issues.filter(issue => issue.severity === 'error'), []);
});

void test('ns5_46 probe: the plan gate refuses a family the kind contradicts, and a writer on derived data', () => {
  const role = clone(familyPlan());
  role.entities[0].family = 'tdm';
  assert.ok(codes(validateNs5OntologyPlanV3(role, gateContext).issues).includes('NS5_ONTOLOGY_FAMILY_INCOHERENT'));

  const table = clone(familyPlan());
  table.entities[1].family = 'mdm';
  assert.ok(codes(validateNs5OntologyPlanV3(table, gateContext).issues).includes('NS5_ONTOLOGY_FAMILY_INCOHERENT'));

  const written = clone(familyPlan());
  written.entities[2].writer = 'crud';
  assert.ok(codes(validateNs5OntologyPlanV3(written, gateContext).issues).includes('NS5_ONTOLOGY_DDM_HAS_WRITER'));

  // And none of the three fires on the plan as it is.
  assert.deepEqual(validateNs5OntologyPlanV3(familyPlan(), gateContext).issues.filter(issue => issue.severity === 'error'), []);
});

void test('ns5_46 probe: a capability is checked against the catalog of the entity family', () => {
  const plan = formPlan();
  // The hole this closes: `<module>.<anything>` on a TABLE was never checked, and a platform id was
  // only ever checked against `mdm.capabilities`, which is not the catalog of a table.
  const table = clone(CONSULTA);
  table.capabilities = {
    'locate.byName': 'searching the master record, which a table cannot do',
    'agendaClinica.agendar': 'the module capability, which stays legal',
  } as never;
  const issues = validateNs5OntologyEntityV3(table, plan, gateContext).issues
    .filter(issue => issue.code === 'NS5_ONTOLOGY_CAPABILITY_UNKNOWN');
  assert.deepEqual(issues.map(issue => issue.path), [`entities.Consulta.capabilities.locate.byName`]);
  assert.match(issues[0].message, /this entity is tdm/u);

  // The other direction: a capability of the table catalog is not a capability of a role.
  const role = clone(PACIENTE);
  role.capabilities = { create: 'writing a row, which a master record does not do' } as never;
  assert.ok(
    codes(validateNs5OntologyEntityV3(role, plan, gateContext).issues).includes('NS5_ONTOLOGY_CAPABILITY_UNKNOWN'),
  );

  // Restored, both are clean: the check fires on the perturbation and only there.
  assert.deepEqual(validateNs5OntologyEntityV3(CONSULTA, plan, gateContext).issues, []);
  assert.deepEqual(
    codes(validateNs5OntologyEntityV3(PACIENTE, plan, gateContext).issues).filter(code => code.includes('CAPABILITY')),
    [],
  );

  // And `statusHistory.read`, which the hand-written form declares on the table, IS in the tdm catalog
  // — membership is what makes an id legal, not its readiness (it is measured `missing`).
  assert.ok('statusHistory.read' in tdm.capabilities);
  assert.equal(tdm.capabilities['statusHistory.read'].platform, 'missing');
});

void test('ns5_46 probe: an unknown capability names the nearest id of the catalog', () => {
  // The run that died: `ordenServicio` wrote `next.sequenceNumber` because the only catalog it could
  // see was the platform's. The same two words, in the other order, are `sequence.next`.
  assert.equal(nearestCapabilityId('next.sequenceNumber', Object.keys(tdm.capabilities)), 'sequence.next');
  assert.equal(nearestCapabilityId('document.attach', Object.keys(tdm.capabilities)), 'attach.document');
  assert.equal(nearestCapabilityId('aggregateByWindow', Object.keys(ddm.capabilities)), 'aggregate.byWindow');
  // One shared word out of many is not a suggestion: a wrong "did you mean" is worse than none.
  assert.equal(nearestCapabilityId('locate.byVibe', Object.keys(ddm.capabilities)), undefined);

  const plan = formPlan();
  const table = clone(CONSULTA);
  table.capabilities = { 'next.sequenceNumber': 'numbering the service order' } as never;
  const issue = validateNs5OntologyEntityV3(table, plan, gateContext).issues
    .find(item => item.code === 'NS5_ONTOLOGY_CAPABILITY_UNKNOWN');
  assert.match(issue!.message, /Did you mean 'sequence\.next'\?/u);
});

void test('ns5_46 probe: a derived table has no state, no unique key, and every field derived', () => {
  const plan = familyPlan();
  const normalizations: Ns5OntologyV3Normalization[] = [];
  const built = normalizeNs5OntologyEntityV3({
    entityId: 'ConsultasPorDia',
    record: {
      fields: [
        { id: 'bucketStart', type: 'timestamp', required: true, indexed: true },
        { id: 'consultaId', type: 'record', to: ['Consulta'], required: true },
        { id: 'details', type: 'object', fields: [{ id: 'total', type: 'integer' }] },
      ],
    },
    lifecycleStates: [{ state: 'aberta', reachedBy: 'time' }],
    uniqueKeys: [{ fields: ['bucketStart'] }],
    relationships: [],
    capabilities: [{ id: 'aggregate.byWindow', sentence: 'consultas por dia e por profissional' }],
    rules: [],
  }, 'ConsultasPorDia', { moduleName: 'agendaClinica', mdm, plan }, normalizations)! as Ns5OntologyTableV3;

  // Nobody writes a summary: the flag is written here instead of being asked for and then refused.
  assert.equal(built.record.fields.bucketStart.derived, true);
  assert.equal(built.record.fields.details!.fields!.total.derived, true, 'the document is derived too');
  assert.ok(normalizations.some(item => item.detail.includes('(ddm)')));
  assert.equal(built.storage.kind, 'timeSeries');

  const issues = codes(validateNs5OntologyEntityV3(built, plan, gateContext).issues);
  assert.ok(issues.includes('NS5_ONTOLOGY_DDM_HAS_STATE'));
  assert.ok(issues.includes('NS5_ONTOLOGY_DDM_UNIQUE_KEY'));
  assert.equal(issues.includes('NS5_ONTOLOGY_CAPABILITY_UNKNOWN'), false, 'the ddm catalog is the one consulted');

  // Restored: without the lifecycle and the unique key, the same entity is clean.
  const clean = clone(built);
  delete clean.lifecycleStates;
  delete clean.uniqueKeys;
  assert.deepEqual(validateNs5OntologyEntityV3(clean, plan, gateContext).issues, []);

  /*
   * The catalog and the gate have to agree on where a measure lives. `COLUMN_WITHOUT_INDEX` applies to
   * a ddm table like to any other, and nothing filters by a number, so a measure declared as a column
   * is refused — which is why `ddm.defs.ts` declares `<measure>` INSIDE `details` and says so in a
   * recommendation. Measured, because the first draft of that catalog said the opposite and would have
   * burned a repair round on every summary ever generated.
   */
  const asColumn = clone(clean);
  asColumn.record.fields.total = { type: 'integer', required: true, derived: true };
  assert.ok(
    codes(validateNs5OntologyEntityV3(asColumn, plan, gateContext).issues).includes('NS5_ONTOLOGY_COLUMN_WITHOUT_INDEX'),
  );
  assert.ok(
    ddm.recommendations.some(line => line.includes('Every measure lives inside `details`')),
    'the ddm catalog must not teach a measure as a column',
  );
  assert.equal(ddm.record.fields.details.fields?.['<measure>'] !== undefined, true);
  assert.equal('<measure>' in ddm.record.fields, false);
});

void test('ns5_46: a table starts from the catalog of its family, in the projection a role already gets', () => {
  const plan = familyPlan();
  const table = plan.entities.find(entity => entity.entityId === 'Consulta')!;
  const starting = formatNs5FamilyStartingPoint(tdm, table);
  assert.match(starting, /## Starting point \(the tdm catalog/u);
  assert.match(starting, /family tdm · storage relational · table agendaClinica_consulta/u);
  // The capability that would have saved the ordenServicio run, with its measured status.
  assert.match(starting, /sequence\.next · platform · .* · platform: partial/u);
  assert.match(starting, /- id · uuid · required · derived\+indexed · /u);
  assert.ok(starting.includes('### How a table of this family is written'));
  // Evidence is for whoever reviews the catalog, never for the prompt.
  assert.equal(starting.includes('moduleDataRuntime.ts:77'), false, 'the projection must not carry evidence');

  const summary = plan.entities.find(entity => entity.entityId === 'ConsultasPorDia')!;
  const derived = formatNs5FamilyStartingPoint(ddm, summary);
  assert.match(derived, /## Starting point \(the ddm catalog/u);
  assert.match(derived, /storage timeSeries/u);
  assert.ok(derived.includes('aggregate.byWindow'));
  assert.doesNotMatch(derived, /\n- (create|update|delete|transition) · /u, 'a derived table is never told how to write');
  assert.match(derived, /\n- retain · table · /u);
});

// ---------------------------------------------------------------------------
// ns5_47 - derivation per row (`derived[]`), and `by` without `system`/`time`
// ---------------------------------------------------------------------------

/** A plan in the shape of the prova viva: a role (Aluno), two tables and a summary. */
function derivedPlan(): Ns5OntologyV3PlanDraft {
  return normalizeNs5OntologyPlanV3({
    businessDomain: 'Academia',
    entities: [
      { entityId: 'Aluno', kind: 'role', subtype: 'Person', title: 'Aluno', description: 'x', displayField: 'details.identification.name', writer: 'journey' },
      { entityId: 'Mensalidade', kind: 'entity', class: 'core', title: 'Mensalidade', description: 'x', displayField: 'dueDate', writer: 'journey' },
      { entityId: 'Pagamento', kind: 'entity', class: 'event', title: 'Pagamento', description: 'x', displayField: 'paidAt', writer: 'journey' },
      { entityId: 'PainelGerencial', kind: 'entity', class: 'supporting', family: 'ddm', storageKind: 'relational', title: 'Painel', description: 'x', displayField: 'bucketStart', writer: 'journey' },
    ],
    relationships: [
      { relationshipId: 'mensalidadeAluno', from: 'Mensalidade', to: 'Aluno', type: 'manyToOne', required: true, mode: 'fk', description: 'x' },
      { relationshipId: 'pagamentoMensalidade', from: 'Pagamento', to: 'Mensalidade', type: 'manyToOne', required: true, mode: 'fk', description: 'x' },
    ],
  }, 'mensalidadesAcademia');
}

const derivedContext = { moduleName: 'mensalidadesAcademia', mdm, tdm, ddm };

function buildMensalidade(
  plan: Ns5OntologyV3PlanDraft,
  normalizations: Ns5OntologyV3Normalization[],
  overrides: Record<string, unknown> = {},
): Ns5OntologyTableV3 {
  return normalizeNs5OntologyEntityV3({
    entityId: 'Mensalidade',
    record: {
      fields: [
        { id: 'alunoId', type: 'record', to: ['Aluno'], required: true },
        { id: 'dueDate', type: 'date', required: true, indexed: true },
        { id: 'status', type: 'enum', required: true, indexed: true, values: [{ value: 'open', title: 'Em aberto' }, { value: 'paid', title: 'Paga' }] },
        { id: 'details', type: 'object', required: true, fields: [{ id: 'amount', type: 'money', required: true }] },
      ],
    },
    lifecycleStates: [{ state: 'open', reachedBy: 'actor' }, { state: 'paid', reachedBy: 'actor' }],
    relationships: [{ name: 'aluno', relationshipId: 'mensalidadeAluno', to: 'Aluno', cardinality: 'N:1', title: 'Aluno' }],
    capabilities: [{ id: 'locate.byColumn', sentence: 'lista as mensalidades por aluno' }],
    rules: [],
    derived: [{
      id: 'overdue',
      type: 'boolean',
      title: 'Vencida',
      description: 'Em aberto e com vencimento anterior a hoje.',
      ruleRefs: ['mensalidadeVencidaBloqueiaAluno'],
    }],
    ...overrides,
  }, 'Mensalidade', { moduleName: 'mensalidadesAcademia', mdm, plan }, normalizations)! as Ns5OntologyTableV3;
}

void test('ns5_47: a derived item folds into details of a table, carrying its condition and its rule', () => {
  const plan = derivedPlan();
  const normalizations: Ns5OntologyV3Normalization[] = [];
  const built = buildMensalidade(plan, normalizations);
  const overdue = built.record.fields.details!.fields!.overdue;
  assert.equal(overdue.derived, true);
  assert.equal(overdue.type, 'boolean');
  assert.match(overdue.description ?? '', /vencimento/u);
  // A rule a derived field cites is a rule the entity obeys, so rules40 receives it.
  assert.ok(built.rules.includes('mensalidadeVencidaBloqueiaAluno'));
  assert.ok(collectNs5CitedRulesV3([built]).includes('mensalidadeVencidaBloqueiaAluno'));
  assert.ok(normalizations.some(item => item.kind === 'derivedRuleRefsLifted'));
  // The row keeps only what somebody writes.
  assert.deepEqual([...built.record.fields.status.values ?? []].map(value => typeof value === 'string' ? value : value.value), ['open', 'paid']);
});

void test('ns5_47: a derived item of a role folds into the module namespace, which is then not empty', () => {
  const plan = derivedPlan();
  const normalizations: Ns5OntologyV3Normalization[] = [];
  const aluno = normalizeNs5OntologyEntityV3({
    entityId: 'Aluno',
    record: { fields: [{ id: 'details', type: 'object', required: true, fields: [{ id: 'mensalidadesAcademia', type: 'object', fields: [] }] }] },
    relationships: [],
    capabilities: [{ id: 'read.byId', sentence: 'lê o aluno' }],
    rules: [],
    derived: [{
      id: 'blocked',
      type: 'boolean',
      title: 'Bloqueado',
      description: 'Duas ou mais mensalidades vencidas.',
      ruleRefs: [],
    }],
  }, 'Aluno', { moduleName: 'mensalidadesAcademia', mdm, plan }, normalizations)! as Ns5OntologyRoleV3;
  const namespace = aluno.record.fields.details!.fields!.mensalidadesAcademia;
  assert.equal(namespace.fields!.blocked.derived, true);
  assert.notEqual(namespace.description, NS5_NAMESPACE_EMPTY_DESCRIPTION, 'a namespace that holds a derived field is not empty');
  assert.equal(normalizations.some(item => item.kind === 'namespaceEmpty'), false);
  // A namespace that stopped being empty goes through the namespace checks; a derived field trips none
  // of them, and it adds no writing capability, so the role does not start to look written.
  const issues = codes(validateNs5OntologyEntityV3(aluno, plan, derivedContext).issues);
  assert.equal(issues.includes('NS5_ONTOLOGY_NAMESPACE_EMPTY_TEXT'), false);
  assert.equal(issues.includes('NS5_ONTOLOGY_NAMESPACE_CONFLICT'), false);
  assert.equal(issues.includes('NS5_ONTOLOGY_NAMESPACE_IMITATES_SERVICE'), false);
  assert.equal(Object.keys(aluno.capabilities).includes('edit.moduleNamespace'), false);
});

void test('ns5_47: a ddm entity ignores derived[] and records it, because the whole row is derived', () => {
  const plan = derivedPlan();
  const normalizations: Ns5OntologyV3Normalization[] = [];
  const painel = normalizeNs5OntologyEntityV3({
    entityId: 'PainelGerencial',
    record: {
      fields: [
        { id: 'bucketStart', type: 'timestamp', required: true, indexed: true },
        { id: 'details', type: 'object', required: true, fields: [{ id: 'total', type: 'integer' }] },
      ],
    },
    relationships: [],
    capabilities: [{ id: 'aggregate.byWindow', sentence: 'total por mês' }],
    rules: [],
    derived: [{ id: 'inadimplencia', type: 'number', title: 'Inadimplência', description: 'x', ruleRefs: [] }],
  }, 'PainelGerencial', { moduleName: 'mensalidadesAcademia', mdm, plan }, normalizations)! as Ns5OntologyTableV3;
  assert.equal(painel.record.fields.details!.fields!.inadimplencia, undefined);
  assert.ok(normalizations.some(item => item.kind === 'derivedOnDdmIgnored' && item.detail === 'derived.inadimplencia'));
});

void test('ns5_47: by collapses ["system"] to an empty list and keeps ["time"] for the gate to refuse', () => {
  const plan = derivedPlan();
  const collapsed: Ns5OntologyV3Normalization[] = [];
  const bySystem = buildMensalidade(plan, collapsed, {
    transitions: [{ transitionId: 'settle', from: ['open'], to: 'paid', by: ['system'], description: 'x' }],
  });
  assert.deepEqual([...bySystem.transitions![0].by], []);
  assert.ok(collapsed.some(item => item.kind === 'systemByCollapsed' && item.detail === 'transitions.settle.by'));

  const kept: Ns5OntologyV3Normalization[] = [];
  const byTime = buildMensalidade(plan, kept, {
    transitions: [{ transitionId: 'markOverdue', from: ['open'], to: 'paid', by: ['time'], description: 'x' }],
  });
  assert.deepEqual([...byTime.transitions![0].by], ['time'], 'time is kept so the gate can name the right place');
  const issues = validateNs5OntologyAssemblyV3(
    assembleNs5OntologyIndexV3(plan, 'x'),
    [byTime],
    { ...derivedContext, actors: ['recepcao'] },
  ).issues;
  const actor = issues.find(issue => issue.code === 'NS5_ONTOLOGY_TRANSITION_ACTOR_UNKNOWN');
  assert.ok(actor, codes(issues).join(', '));
  assert.match(actor!.message, /derived\[\]/u);
  // The scalar `system` of the v2 grammar arrives at the same place as the one-item list.
  const scalar = buildMensalidade(plan, [], {
    transitions: [{ transitionId: 'settle', from: ['open'], to: 'paid', by: 'system', description: 'x' }],
  });
  assert.deepEqual([...scalar.transitions![0].by], []);
});

void test('transition payload is optional and normalization preserves both explicit empty and populated lists', () => {
  const plan = derivedPlan();
  const built = buildMensalidade(plan, [], {
    transitions: [
      { transitionId: 'confirm', from: ['open'], to: 'paid', by: ['recepcao'], description: 'x', payload: [] },
      { transitionId: 'settle', from: ['open'], to: 'paid', by: ['recepcao'], description: 'x', payload: ['details.attendanceNote'] },
      { transitionId: 'legacy', from: ['open'], to: 'paid', by: ['recepcao'], description: 'x' },
    ],
  });
  assert.deepEqual(built.transitions?.map(item => item.payload), [[], ['details.attendanceNote'], undefined]);
});

void test('ns5_47 probe: a transition that still names a state that became derived is named as such', () => {
  const plan = derivedPlan();
  const index = assembleNs5OntologyIndexV3(plan, 'x');
  const built = buildMensalidade(plan, [], {
    transitions: [{ transitionId: 'settle', from: ['overdue'], to: 'paid', by: ['recepcao'], description: 'x' }],
  });
  const issues = validateNs5OntologyAssemblyV3(index, [built], { ...derivedContext, actors: ['recepcao'] }).issues;
  const missing = issues.find(issue => issue.code === 'NS5_ONTOLOGY_TRANSITION_REF_MISSING');
  assert.ok(missing, codes(issues).join(', '));
  assert.match(missing!.message, /'overdue', which is not a declared state/u);
});

// --- ns5_49: who owns a transition -----------------------------------------
// workflows50 now runs BEFORE this step. A journey act gives a transition an actor; a process stage
// gives it no person at all, and the ontology writes that as `by: []`.

const NS5_49_JOURNEYS = [
  {
    business: {
      actorRef: 'recepcionista',
      steps: [
        { stepId: 'confirmar', kind: 'act', entity: 'Consulta', effect: 'transition' as const, transitionRef: 'confirmarConsulta' },
      ],
    },
  },
];

const NS5_49_WORKFLOWS = {
  processes: [
    {
      processId: 'fecharAgenda',
      tasks: [
        { taskId: 'marcarFalta', kind: 'mechanical', entityRef: 'Consulta', effect: 'transition' as const, transitionRef: 'registrarFalta' },
      ],
    },
  ],
};

function ns5_49Consulta(by: { confirmarConsulta: string[]; registrarFalta: string[] }) {
  const entity = clone(CONSULTA);
  entity.transitions = entity.transitions!.map(transition => {
    if (transition.transitionId === 'confirmarConsulta') return { ...transition, by: by.confirmarConsulta };
    if (transition.transitionId === 'registrarFalta') return { ...transition, by: by.registrarFalta };
    return transition;
  });
  return entity;
}

function ns5_49Normalize(entity: Ns5OntologyTableV3, normalizations: Ns5OntologyV3Normalization[]) {
  return normalizeNs5OntologyEntityV3(entity, 'Consulta', {
    moduleName: 'agendaClinica',
    mdm,
    plan: formPlan(),
    journeys: NS5_49_JOURNEYS,
    workflows: NS5_49_WORKFLOWS,
  }, normalizations);
}

void test('ns5_49: a transition cited only by a process stage is owned by it (by: [])', () => {
  const normalizations: Ns5OntologyV3Normalization[] = [];
  const built = ns5_49Normalize(
    ns5_49Consulta({ confirmarConsulta: ['recepcionista'], registrarFalta: ['recepcionista'] }),
    normalizations,
  ) as Ns5OntologyTableV3;
  const registrarFalta = built.transitions!.find(item => item.transitionId === 'registrarFalta');
  assert.deepEqual(registrarFalta!.by, []);
  const record = normalizations.find(item => item.kind === 'transitionOwnedByProcess');
  assert.ok(record, 'the emptied `by` is on the record');
  assert.match(record!.detail, /fecharAgenda\.marcarFalta/);
});

void test('ns5_49: a journey citation still adds the actor and wins over the process', () => {
  const normalizations: Ns5OntologyV3Normalization[] = [];
  const built = ns5_49Normalize(
    ns5_49Consulta({ confirmarConsulta: [], registrarFalta: ['recepcionista'] }),
    normalizations,
  ) as Ns5OntologyTableV3;
  const confirmar = built.transitions!.find(item => item.transitionId === 'confirmarConsulta');
  assert.deepEqual(confirmar!.by, ['recepcionista']);
  assert.ok(normalizations.some(item => item.kind === 'transitionByAdded'));
});

void test('ns5_49: a transition nobody cites is left as the model wrote it', () => {
  const normalizations: Ns5OntologyV3Normalization[] = [];
  const built = ns5_49Normalize(
    ns5_49Consulta({ confirmarConsulta: ['recepcionista'], registrarFalta: ['recepcionista'] }),
    normalizations,
  ) as Ns5OntologyTableV3;
  const untouched = built.transitions!.find(item => item.transitionId === 'registrarAtendimento');
  const original = CONSULTA.transitions!.find(item => item.transitionId === 'registrarAtendimento');
  assert.deepEqual(untouched!.by, original!.by);
});

void test('ns5_49: the plan gate refuses an entity only a process stage declares', () => {
  const plan = formPlan();
  plan.entities = plan.entities.filter(entity => entity.entityId !== 'Consulta');
  plan.relationships = [];
  const gate = validateNs5OntologyPlanV3(plan, {
    moduleName: 'agendaClinica',
    mdm,
    tdm,
    ddm,
    journeys: [],
    workflows: NS5_49_WORKFLOWS,
  });
  const issue = gate.issues.find(item => item.code === 'NS5_ONTOLOGY_JOURNEY_ENTITY');
  assert.ok(issue, 'the stage citation reaches the plan gate');
  assert.match(issue!.message, /fecharAgenda\.marcarFalta/);
});

void test('ns5_49: an entity only a process stage writes is not lifted into module.details', () => {
  const plan = formPlan();
  const kept = liftNs5AggregateOnlyEntitiesV3(plan, FORM_ENTITIES, [], NS5_49_WORKFLOWS);
  assert.equal(kept.liftedEntityIds.includes('Consulta'), false);
});

void test('ns5_49: the entity prompt lists the process stages and tags the transition they own', () => {
  const prompt = buildNs5OntologyEntityHumanPrompt({
    sourcePrompt: 'agenda',
    userLanguage: 'pt-BR',
    actors: [],
    journeys: NS5_49_JOURNEYS as never,
    workflows: NS5_49_WORKFLOWS as never,
    plan: formPlan(),
    entityId: 'Consulta',
    platformCatalog: '',
  });
  assert.match(prompt, /## Process stages that touch this entity/);
  assert.match(prompt, /fecharAgenda\.marcarFalta Consulta effect=transition transitionRef=registrarFalta/);
  assert.match(prompt, /- registrarFalta by: \(process\)/);
  assert.match(prompt, /- confirmarConsulta by recepcionista/);
});

// --- ns5_57: a decide cited by a journey needs a branch ---------------------

/** `compras` in miniature: one journey whose only step decides over the entity. */
const NS5_57_JOURNEYS = [
  {
    journeyId: 'avaliarConsulta',
    business: {
      actorRef: 'recepcionista',
      steps: [{ stepId: 'decidirConsulta', kind: 'decide', entity: 'Consulta' }],
    },
  },
];

void test('ns5_57: a decide is green when two transitions leave the same state', () => {
  // The form branches out of `scheduled` (confirmar, registrarFalta, registrarAtendimento).
  const gate = validateNs5OntologyEntityV3(CONSULTA, formPlan(), { ...gateContext, journeys: NS5_57_JOURNEYS });
  assert.equal(codes(gate.issues).includes('NS5_ONTOLOGY_DECIDE_NEEDS_BRANCH'), false);
  assert.deepEqual(gate.issues.filter(issue => issue.severity === 'error'), []);
});

void test('ns5_57: a decide over a lifecycle that never branches is an error naming the citation', () => {
  const collapsed = clone(CONSULTA);
  collapsed.transitions = [collapsed.transitions![0]];
  const red = validateNs5OntologyEntityV3(collapsed, formPlan(), { ...gateContext, journeys: NS5_57_JOURNEYS });
  const issue = red.issues.find(item => item.code === 'NS5_ONTOLOGY_DECIDE_NEEDS_BRANCH');
  assert.ok(issue, `expected the decide error, got: ${codes(red.issues).join(', ')}`);
  assert.equal(issue!.severity, 'error');
  assert.equal(red.ok, false);
  assert.equal(issue!.path, 'entities.Consulta.transitions');
  assert.match(issue!.message, /journey avaliarConsulta \(decidirConsulta\)/);
  assert.match(issue!.message, /at least two transitions leaving the same state/);
});

void test('ns5_57: a decide over a record with no lifecycle is a warning, not an error', () => {
  const catalog = clone(CONSULTA);
  delete catalog.lifecycleStates;
  delete catalog.transitions;
  const gate = validateNs5OntologyEntityV3(catalog, formPlan(), { ...gateContext, journeys: NS5_57_JOURNEYS });
  const issue = gate.issues.find(item => item.code === 'NS5_ONTOLOGY_DECIDE_NEEDS_BRANCH');
  assert.ok(issue, 'the journey defect is still said out loud');
  assert.equal(issue!.severity, 'warning');
  assert.equal(issue!.path, 'entities.Consulta.lifecycleStates');
  assert.match(issue!.message, /journey defect/);
});

void test('ns5_57: without journeys in the context the check is silent (the v2 replay is untouched)', () => {
  const collapsed = clone(CONSULTA);
  collapsed.transitions = [collapsed.transitions![0]];
  const gate = validateNs5OntologyEntityV3(collapsed, formPlan(), gateContext);
  assert.equal(codes(gate.issues).includes('NS5_ONTOLOGY_DECIDE_NEEDS_BRANCH'), false);
});

void test('ns5_57: the entity system prompt states what a cited decide requires', () => {
  const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'promptEntity.md'), 'utf8');
  assert.match(source, /a `decide` cited on this entity requires/);
  assert.match(source, /at least two transitions leaving the same state — one per outcome — with the deciding actor in `by`/);
});

void test('ns5_57: the human prompt tags the decide citation the gate reads', () => {
  const prompt = buildNs5OntologyEntityHumanPrompt({
    sourcePrompt: 'agenda',
    userLanguage: 'pt-BR',
    actors: [],
    journeys: NS5_57_JOURNEYS as never,
    plan: formPlan(),
    entityId: 'Consulta',
    platformCatalog: '',
  });
  assert.match(prompt, /- decidirConsulta decide Consulta decide/);
});
