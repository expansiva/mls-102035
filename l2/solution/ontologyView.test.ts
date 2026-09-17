/// <mls fileReference="_102035_/l2/solution/ontologyView.test.ts" enhancement="_blank"/>

/**
 * ns5_43 T1–T5. The steps after `ontology30` read the module ontology through `ontologyView.ts`; this is
 * the proof that the reading is the same on both forms and that nothing about the eleven v2 modules moved.
 *
 * The v3 side uses the hand-written `agendaClinica` of ns5_42 (`steps/ontology30/fixtures/agendaClinica-v3`),
 * the v2 side `comandaRestaurante5` — the same files the replay uses, so a fixture that drifts is red here.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import agendaClinicaIndexV3 from '/_102035_/l2/agentNewSolution5/steps/ontology30/fixtures/agendaClinica-v3/index.defs.js';
import agendaClinicaPaciente from '/_102035_/l2/agentNewSolution5/steps/ontology30/fixtures/agendaClinica-v3/Paciente.defs.js';
import agendaClinicaConsulta from '/_102035_/l2/agentNewSolution5/steps/ontology30/fixtures/agendaClinica-v3/Consulta.defs.js';
import { loadNs5Entities, loadNs5OntologyIndex } from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import { resolvableFieldPaths } from '/_102035_/l2/solution/ontologyPaths.js';
import {
  isNs5OntologyV3Entity,
  isNs5OntologyV3Index,
  ns5OntologyEdges,
  ns5OntologyEntityIds,
  ns5OntologyEntityView,
  ns5OntologyEntityViews,
  ns5OntologyV3FieldLines,
  splitNs5EntityRef,
  type Ns5OntologyAnyIndex,
} from '/_102035_/l2/solution/ontologyView.js';
import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

const V3_INDEX = agendaClinicaIndexV3 as unknown as Ns5OntologyAnyIndex;
const PACIENTE = agendaClinicaPaciente as unknown as Ns5OntologyEntityV3;
const CONSULTA = agendaClinicaConsulta as unknown as Ns5OntologyEntityV3;

void test('the index answers with entity ids and edges in both forms', () => {
  assert.equal(isNs5OntologyV3Index(V3_INDEX), true);
  assert.deepEqual(ns5OntologyEntityIds(V3_INDEX), ['Paciente', 'Profissional', 'Consulta']);
  const edges = ns5OntologyEdges(V3_INDEX);
  const consultaPaciente = edges.find(edge => edge.relationshipId === 'consultaPaciente');
  assert.deepEqual(
    { from: consultaPaciente?.fromEntity, to: consultaPaciente?.toEntity, required: consultaPaciente?.required },
    { from: 'Consulta', to: 'Paciente', required: true },
  );

  const v2Index = loadNs5OntologyIndex('comandaRestaurante5');
  assert.equal(isNs5OntologyV3Index(v2Index), false);
  assert.ok(ns5OntologyEntityIds(v2Index).includes('Comanda'));
  for (const edge of ns5OntologyEdges(v2Index)) {
    assert.ok(edge.fromEntity && edge.toEntity, edge.relationshipId);
  }
});

void test('a v3 role is read as the papel over an MDM record that v2 called kind mdm', () => {
  const view = ns5OntologyEntityView(PACIENTE);
  assert.equal(view.kind, 'role');
  assert.equal(view.writerKind, 'mdm');
  assert.equal(view.party, 'person');
  assert.equal(view.mdmSubtype, 'Person');
  assert.equal(view.idField, 'id');
  assert.deepEqual([...view.columnIds], ['id', 'version']);
  // The module namespace of `agendaClinica` on Paciente is declared and empty: the papel stores nothing.
  assert.deepEqual([...view.writtenFieldIds], []);
  assert.deepEqual([...(view.paths ?? [])], resolvableFieldPaths(PACIENTE));
  assert.ok(view.paths!.includes('Paciente.details.identification.name'));
  assert.deepEqual([...view.fields], []);
});

void test('a v3 table keeps its columns, its class and what the module writes', () => {
  const view = ns5OntologyEntityView(CONSULTA);
  assert.equal(view.kind, 'entity');
  assert.equal(view.writerKind, 'core');
  assert.equal(view.party, 'none');
  assert.equal(view.mdmSubtype, undefined);
  assert.deepEqual([...view.columnIds], ['id', 'version', 'pacienteId', 'profissionalId', 'scheduledAt', 'status']);
  assert.ok(view.writtenFieldIds.includes('pacienteId'));
  assert.ok(!view.writtenFieldIds.includes('version'));
  assert.ok(view.writtenFieldIds.includes('details.attendanceNote'));
  assert.ok(view.transitions.length > 0);
});

void test('a v2 entity is read exactly as it is written, with no v3 marks', () => {
  const comanda = loadNs5Entities('comandaRestaurante5').find(entity => entity.entityId === 'Comanda')!;
  assert.equal(isNs5OntologyV3Entity(comanda), false);
  const view = ns5OntologyEntityView(comanda);
  assert.equal(view.paths, undefined);
  assert.equal(view.writerKind, view.kind);
  assert.deepEqual(view.fields, (comanda as { fields: unknown }).fields);
  assert.deepEqual([...view.fieldRefs], resolvableFieldPaths(comanda));
  assert.deepEqual(
    [...view.writtenFieldIds],
    (comanda as { fields: Array<{ fieldId: string }> }).fields.map(field => field.fieldId),
  );
});

void test('the v3 prompt lines name every node of the record, branches included', () => {
  const lines = ns5OntologyV3FieldLines(PACIENTE);
  assert.ok(lines.some(line => line.startsWith('- id (uuid')));
  assert.ok(lines.some(line => line.startsWith('- details (object')));
  assert.ok(lines.some(line => line.startsWith('- details.identification.name (string, required)')));
  assert.ok(lines.some(line => line.startsWith('- details.base.contacts (object[]')));
  // One line per resolvable path, minus the entity root that `resolvableFieldPaths` prepends.
  assert.equal(lines.length, resolvableFieldPaths(PACIENTE).length - 1);
});

void test('a reference splits into the entity that owns it and the path inside it', () => {
  assert.deepEqual(splitNs5EntityRef('PedidoCompra'), { root: 'PedidoCompra', path: '' });
  assert.deepEqual(splitNs5EntityRef('PedidoCompra.details.itens'), { root: 'PedidoCompra', path: 'details.itens' });
  assert.deepEqual(splitNs5EntityRef('  Consulta.status '), { root: 'Consulta', path: 'status' });
  assert.deepEqual(splitNs5EntityRef(''), { root: '', path: '' });
});

void test('the eleven recorded modules are all still v2 (ns5_43 T7 keeps them there)', () => {
  const views = ns5OntologyEntityViews(loadNs5Entities('ordenServicio5'));
  assert.ok(views.length > 0);
  assert.ok(views.every(view => view.paths === undefined));
});
