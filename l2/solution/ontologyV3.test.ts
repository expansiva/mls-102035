/// <mls fileReference="_102035_/l2/solution/ontologyV3.test.ts" enhancement="_blank"/>
/**
 * Proof that the four hand-written v3 files of `agendaClinica` say only things the platform ontology
 * really declares (ns5_39 T2).
 *
 * TWO MECHANISMS, ON PURPOSE, because in this repo neither one alone can fail here:
 *
 *  - the RUNTIME half below runs under `node scripts/run-tests.mjs 102035 l2`, a certification command.
 *    `tsx` transpiles without type-checking, so this half is what actually goes red in that command.
 *  - the COMPILE half lives in `mls-102034/l1/mdm/defs/resolveMdmEntity.test.ts`, because
 *    `tsconfig.frontend.json` excludes `**\/*.test.ts` — measured in ns5_39 with a deliberate
 *    `const x: number = "boom"` in this folder: `tsconfig.json` reported it, `tsconfig.frontend.json`
 *    did not. `tsconfig.backend.json` excludes only `*.spec.ts`, so an `l1` test IS checked.
 *
 * The `@ts-expect-error` block at the bottom therefore only bites under `npm run typecheck`
 * (`tsc -p tsconfig.json --noEmit`), filtered to this file.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { mdm } from '/_102034_/l4/ontology/mdm.defs.js';
import type {
  Ns5OntologyAnyEntity,
  Ns5OntologyEntityV3,
  Ns5OntologyIndexV3,
} from '/_102035_/l2/solution/types.js';
import { NS5_ONTOLOGY_SCHEMA_VERSION_V3 } from '/_102035_/l2/solution/types.js';
import { agendaClinicaRules } from '/_102035_/l2/agentNewSolution5/steps/ontology30/fixtures/agendaClinica-v3/rules.defs.js';
import { agendaClinicaEntityConsulta } from '/_102035_/l2/agentNewSolution5/steps/ontology30/fixtures/agendaClinica-v3/Consulta.defs.js';
import { agendaClinicaEntityPaciente } from '/_102035_/l2/agentNewSolution5/steps/ontology30/fixtures/agendaClinica-v3/Paciente.defs.js';
import { agendaClinicaEntityProfissional } from '/_102035_/l2/agentNewSolution5/steps/ontology30/fixtures/agendaClinica-v3/Profissional.defs.js';
import { agendaClinicaOntologyIndex } from '/_102035_/l2/agentNewSolution5/steps/ontology30/fixtures/agendaClinica-v3/index.defs.js';

const MODULE_NAME = 'agendaClinica';

const entities: Ns5OntologyEntityV3[] = [
  agendaClinicaEntityPaciente,
  agendaClinicaEntityProfissional,
  agendaClinicaEntityConsulta,
];
const index: Ns5OntologyIndexV3 = agendaClinicaOntologyIndex;

const platformCapabilities = new Set(Object.keys(mdm.capabilities));
const platformRules = new Set(Object.keys(mdm.rules));
const platformSubtypes = new Set(Object.keys(mdm.subtypes));
const platformValueTypes = new Set(Object.keys(mdm.types));
const catalogTypes = new Set<string>(mdm.relationships.map(entry => entry.type));
const moduleRuleIds = new Set<string>(agendaClinicaRules.rules.map(rule => rule.ruleId));
const indexRelationshipIds = new Set<string>(index.relationships.map(row => row.relationshipId));

/** Every field of a record, depth first, as `path` → field. */
function walk(
  fields: Ns5OntologyEntityV3['record']['fields'] | undefined,
  parent = '',
): Array<[string, Ns5OntologyEntityV3['record']['fields'][string]]> {
  const out: Array<[string, Ns5OntologyEntityV3['record']['fields'][string]]> = [];
  for (const [id, field] of Object.entries(fields ?? {})) {
    const path = parent ? `${parent}.${id}` : id;
    out.push([path, field]);
    if (field.fields) out.push(...walk(field.fields, path));
  }
  return out;
}

test('(a) the four files carry the final v3 schemaVersion', () => {
  assert.equal(NS5_ONTOLOGY_SCHEMA_VERSION_V3, '2026-09-15-ns5-ontology-v3');
  for (const entity of [...entities, index]) {
    assert.equal(entity.schemaVersion, NS5_ONTOLOGY_SCHEMA_VERSION_V3, `${'entityId' in entity ? entity.entityId : 'index'}`);
  }
  assert.deepEqual(entities.map(entity => entity.entityId), index.entities.map(row => row.entityId));
  for (const entity of entities) assert.equal(entity.moduleName, MODULE_NAME);
});

test('(b) every capability id is a platform id or lives in the module namespace', () => {
  for (const entity of entities) {
    for (const id of Object.keys(entity.capabilities)) {
      if (id.startsWith(`${MODULE_NAME}.`)) continue;
      assert.ok(platformCapabilities.has(id), `${entity.entityId}.capabilities: ${id} is in no platform catalog`);
    }
  }
  // Measured, and NOT the 16 the spec assumed: 13 platform ids + 2 of the module.
  assert.equal(Object.keys(agendaClinicaEntityPaciente.capabilities).length, 15);
});

test('(c) every rule id is a platform rule or a ruleId of the module rules.defs.ts', () => {
  for (const entity of entities) {
    for (const id of entity.rules) {
      assert.ok(
        platformRules.has(id) || moduleRuleIds.has(id),
        `${entity.entityId}.rules: ${id} is in neither the platform catalog nor rules.defs.ts`,
      );
    }
  }
  assert.equal(agendaClinicaEntityPaciente.rules.length, 6);
});

test('(d) every `of` names a reusable type of the platform', () => {
  let seen = 0;
  for (const entity of entities) {
    for (const [path, field] of walk(entity.record.fields)) {
      if (!field.of) continue;
      seen += 1;
      assert.ok(platformValueTypes.has(field.of), `${entity.entityId}.${path}: of ${field.of} is in no mdm.types`);
    }
  }
  assert.ok(seen >= 4, `expected the module to cite reusable types, saw ${seen}`);
});

test('(e) the subtype of every role is a subtype of the platform', () => {
  const roles = entities.filter(entity => entity.kind === 'role');
  assert.equal(roles.length, 2);
  for (const role of roles) {
    assert.ok(platformSubtypes.has(role.subtype), `${role.entityId}: subtype ${role.subtype} does not exist`);
    assert.equal(role.roleTag, `${MODULE_NAME}.${role.entityId}`);
  }
  for (const row of index.entities) {
    if (row.kind === 'role') assert.ok(platformSubtypes.has(String(row.subtype)), `index: ${row.entityId}`);
  }
});

test('(f) a link with no fk/throughTable mode names a relationship type of the catalog', () => {
  for (const entity of entities) {
    for (const [name, link] of Object.entries(entity.relationships)) {
      if (link.mode) continue;
      assert.ok(catalogTypes.has(link.via), `${entity.entityId}.${name}: via ${link.via} is in no mdm.relationships`);
    }
  }
  for (const row of index.relationships) {
    if (row.mode !== 'mdmRelationship') continue;
    assert.ok(catalogTypes.has(String(row.catalogType)), `index.${row.relationshipId}: ${row.catalogType}`);
    // A role named on a catalog link must be a role that link accepts.
    const entry = mdm.relationships.find(item => item.type === row.catalogType);
    const allowedRoles = new Set<string>(entry?.roles ?? []);
    for (const role of row.roles ?? []) {
      assert.ok(allowedRoles.has(role), `index.${row.relationshipId}: role ${role} is not a role of ${row.catalogType}`);
    }
  }
});

test('(g) every relationshipId an entity repeats is a row of the index', () => {
  for (const entity of entities) {
    for (const [name, link] of Object.entries(entity.relationships)) {
      assert.ok(
        indexRelationshipIds.has(link.relationshipId),
        `${entity.entityId}.${name}: relationshipId ${link.relationshipId} is in no row of index.defs.ts`,
      );
    }
  }
  // The index calls itself the source, so every row must be reachable from some entity.
  const repeated = new Set(entities.flatMap(entity => Object.values(entity.relationships).map(link => link.relationshipId)));
  for (const row of index.relationships) {
    assert.ok(repeated.has(row.relationshipId), `index row ${row.relationshipId} is repeated by no entity`);
  }
  // And both ends of a row are entities of this module or subtypes of the platform.
  const known = new Set([...index.entities.map(row => row.entityId), ...platformSubtypes]);
  for (const row of index.relationships) {
    for (const end of [row.from, row.to]) assert.ok(known.has(end), `index row ${row.relationshipId} points at ${end}`);
  }
});

test('(T4) v2 and v3 are told apart by schemaVersion alone', () => {
  const any: Ns5OntologyAnyEntity = agendaClinicaEntityPaciente;
  assert.equal(any.schemaVersion, NS5_ONTOLOGY_SCHEMA_VERSION_V3);
  if (any.schemaVersion === NS5_ONTOLOGY_SCHEMA_VERSION_V3) {
    // narrowed to v3 by the compiler: `record` exists only on v3, `fields` only on v2.
    assert.ok(any.record.fields.details);
  } else {
    assert.fail('the v3 entity narrowed to v2');
  }
});

// --- the negative half: only `npm run typecheck` reads these (see the header) ---------------
type CapabilityId = keyof typeof mdm.capabilities | `${typeof MODULE_NAME}.${string}`;
// @ts-expect-error — a capability id that is in no catalog and outside the module namespace.
const strayCapability: CapabilityId = 'locate.byVibes';
// @ts-expect-error — a reusable type that does not exist.
const strayOf: Ns5OntologyEntityV3['record']['fields'][string]['of'] = 'PostalAddress';
// @ts-expect-error — a cardinality outside the four the form allows.
const strayCardinality: Ns5OntologyEntityV3['relationships'][string]['cardinality'] = '1:M';
void strayCapability; void strayOf; void strayCardinality;
