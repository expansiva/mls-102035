/// <mls fileReference="_102035_/l2/solution/ontologyPaths.ts" enhancement="_blank"/>

/**
 * What a disclosure may address on ONE entity, whichever form the ontology is written in (ns5_40 T1).
 *
 * PURE ON PURPOSE, like `resolveMdmEntity.ts`: types only, no `node:*`, no `mls.*`, no I/O. That is what
 * lets an `l1` test import it (and therefore lets the compiler check it under `tsconfig.backend.json`,
 * which `tsconfig.frontend.json` cannot do for an `l2` test — it excludes `**\/*.test.ts`).
 *
 * WHY IT EXISTS. On a v2 module an entity is a flat list of `fields`, so `<Entity>.<fieldId>` addressed
 * everything there was. A v3 `role` stores nothing but its namespace: its data is the MDM record's tree,
 * and the only v2-addressable thing is `<Entity>.<idField>`. That is the measured symptom of ns5_40 —
 * `gestaoAgendaRecepcionista` could only list `Paciente.id`, so read literally the receptionist could not
 * see the patient's name. A disclosure therefore has to address the TREE.
 *
 * THE FORM. A reference is the entity root, or a path under it:
 *   `Consulta`                              the whole record
 *   `Consulta.status`                       a column
 *   `Paciente.details.person`               a whole branch
 *   `Paciente.details.person.birthDate`     one leaf
 * Branches and leaves are both addressable, so a grant says `Paciente.details.base.contacts` without
 * enumerating the shape of a contact.
 *
 * `derived` DOES NOT EXCLUDE. ns5_40 T1 asks for `derived` to be filtered out; it must not be, and the
 * spec's own T2 and T4 prove it. `derived` is a WRITE-side mark — `resolveMdmEntity.ts:34-35`, "the engine
 * owns it, so no form may offer it" — while a disclosure is about READING. Concretely: `Paciente.id` is
 * `derived` (`Paciente.defs.ts:19-25`), so filtering it would make T2's `NS5_ACCESS_DISCLOSURE_IDS_ONLY`
 * unreachable; and `Paciente.details.base.contacts` is `derived` (`Paciente.defs.ts:176-183`), which T4
 * puts in `allowedFields`. Both tasks are unsatisfiable under the filter. Recorded in ns5_40's return.
 */

import {
  NS5_ONTOLOGY_SCHEMA_VERSION_V3,
  type Ns5OntologyAnyEntity,
  type Ns5OntologyFieldsV3,
} from '/_102035_/l2/solution/types.js';

/**
 * Every reference a grant may name on this entity, in declaration order, the entity root first.
 *
 * v2 — `<Entity>`, the identity of `storage.idField`, each declared `fieldId`, each `details.<name>`.
 * v3 — `<Entity>`, then every node of `record.fields` depth first, branches included (`details`,
 *      `details.identification`, `details.identification.name`, …).
 *
 * The identity is emitted first on v2 because `fields` is namespace-only on an mdm entity and the id
 * lives outside it (`ns4EntityFields.ts:34-46`); the set, not the order, is what the gate compares.
 */
export function resolvableFieldPaths(entity: Ns5OntologyAnyEntity): string[] {
  const refs: string[] = [];
  const seen = new Set<string>();
  const add = (ref: string): void => {
    if (!ref || seen.has(ref)) return;
    seen.add(ref);
    refs.push(ref);
  };

  add(entity.entityId);
  if (entity.schemaVersion === NS5_ONTOLOGY_SCHEMA_VERSION_V3) {
    walkFields(entity.record.fields, entity.entityId, add);
    return refs;
  }
  if (entity.storage?.idField) add(`${entity.entityId}.${entity.storage.idField}`);
  for (const field of entity.fields ?? []) add(`${entity.entityId}.${field.fieldId}`);
  for (const name of Object.keys(entity.details ?? {})) add(`${entity.entityId}.details.${name}`);
  return refs;
}

function walkFields(
  fields: Ns5OntologyFieldsV3 | undefined,
  parent: string,
  add: (ref: string) => void,
): void {
  for (const [id, field] of Object.entries(fields ?? {})) {
    const ref = `${parent}.${id}`;
    add(ref);
    if (field.fields) walkFields(field.fields, ref, add);
  }
}
