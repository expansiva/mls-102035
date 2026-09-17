/// <mls fileReference="_102035_/l2/newRelease/widgets/ontologyV3Model.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ns5OntologyIndexV3 } from '../../solution/types.js';
import type { OntologyNode, OntologyTreeView } from '../../../../mls-102034/l2/mdm/resolveMdmEntity.js';
import {
  buildOntologyV3Graph,
  isOntologyV3Index,
  ontologyNodeLeafCount,
  ontologyPlatformFile,
  ontologyV3FieldCount,
} from './ontologyV3Model.js';

const index: Ns5OntologyIndexV3 = {
  schemaVersion: '2026-09-15-ns5-ontology-v3', moduleName: 'agendaClinica', businessDomain: 'Agenda',
  platformOntology: '/_102034_/l4/ontology/mdm.defs.ts', moduleNamespace: { key: 'agendaClinica', description: 'Módulo' },
  entities: [{ entityId: 'Paciente', kind: 'role', subtype: 'Person' }, { entityId: 'Consulta', kind: 'entity', class: 'core' }],
  relationships: [
    { relationshipId: 'consultaPaciente', from: 'Consulta', to: 'Paciente', type: 'manyToOne', required: true, mode: 'fk', field: 'Consulta.pacienteId', description: 'Paciente' },
    { relationshipId: 'responsavel', from: 'Person', to: 'Paciente', type: 'oneToMany', required: false, mode: 'mdmRelationship', catalogType: 'GuardianOf', description: 'Responsável' },
    { relationshipId: 'historico', from: 'Paciente', to: 'Consulta', type: 'manyToMany', required: false, mode: 'throughTable', through: 'Consulta', description: 'Histórico' },
  ],
};

const leaf = (id: string): OntologyNode => ({ id, path: `details.${id}`, title: id, type: 'string', required: false, nullable: false, collection: false, derived: false, indexed: false, unique: false });
const view: OntologyTreeView = {
  entityId: 'Paciente', title: 'Paciente', description: 'Pessoa', kind: 'role', subtype: 'Person', displayField: 'details.identification.name',
  columns: [leaf('id'), leaf('version')],
  details: [{ ...leaf('base'), type: 'object', children: [leaf('name'), { ...leaf('address'), type: 'object', children: [leaf('city'), leaf('postalCode')] }] }],
  relationships: [], capabilities: [], rules: [],
};

test('v3 discriminator is exact and leaf counts recurse through record branches', () => {
  assert.equal(isOntologyV3Index(index), true);
  assert.equal(isOntologyV3Index({ ...index, schemaVersion: 'v2' }), false);
  assert.equal(ontologyNodeLeafCount(view.details), 3);
  assert.equal(ontologyV3FieldCount(view), 5);
  assert.deepEqual(ontologyPlatformFile('/_102034_/l4/ontology/mdm.defs.ts'), {
    project: 102034, level: 4, folder: 'ontology', shortName: 'mdm', extension: '.defs.ts',
  });
  assert.throws(() => ontologyPlatformFile('/hard-coded/mdm.defs.ts'), /Invalid platform ontology path/u);
});

test('v3 graph keeps module nodes, creates platform ghosts, and styles persistence modes', () => {
  const graph = buildOntologyV3Graph(index, [view], ['#1', '#2', '#3', '#4']);
  assert.deepEqual(graph.nodes.map(node => node.id), ['Paciente', 'Consulta', 'Person']);
  assert.equal(graph.nodes[2].ghost, true);
  assert.deepEqual(graph.links.map(link => [link.name, link.value, link.lineStyle.type]), [
    ['consultaPaciente', 'Consulta.pacienteId', 'solid'],
    ['responsavel', 'GuardianOf', 'dashed'],
    ['historico', 'Consulta', 'dotted'],
  ]);
  assert.deepEqual(graph.nodes[0].detailBranches, ['base']);
});
