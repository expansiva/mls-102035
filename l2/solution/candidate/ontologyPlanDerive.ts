/// <mls fileReference="_102035_/l2/solution/candidate/ontologyPlanDerive.ts" enhancement="_blank" />

/** Plan of the edition under edit. Derived from the edited index and entity files. Nothing is written. */
import { ns5FamilyOfV3, type Ns5OntologyV3PlanDraft, type Ns5OntologyV3PlanEntity, type Ns5OntologyV3PlanRelationship } from '/_102035_/l2/solution/gates/ontology30/contractsV3.js';
import type { Ns5OntologyEntityV3, Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';

export function deriveOntologyPlan(
  index: Ns5OntologyIndexV3,
  entities: Ns5OntologyEntityV3[],
  frozen?: Ns5OntologyV3PlanDraft | null,
): Ns5OntologyV3PlanDraft {
  const files = new Map(entities.map(entity => [entity.entityId, entity]));
  const frozenRows = new Map((frozen?.entities ?? []).map(entity => [entity.entityId, entity]));
  const planEntities: Ns5OntologyV3PlanEntity[] = [];
  for (const row of index.entities) {
    const file = files.get(row.entityId);
    if (!file) continue;
    const kept = frozenRows.get(row.entityId);
    const entity: Ns5OntologyV3PlanEntity = {
      entityId: row.entityId,
      kind: row.kind,
      family: kept?.family ?? ns5FamilyOfV3({ kind: row.kind }),
      title: file.title,
      description: file.description,
      displayField: file.displayField,
    };
    if (row.class) entity.class = row.class;
    if (row.subtype) entity.subtype = row.subtype;
    if (file.writer) entity.writer = file.writer;
    if (file.kind === 'entity') {
      entity.storage = { target: file.storage.target, table: file.storage.table, kind: file.storage.kind ?? 'relational' };
    }
    planEntities.push(entity);
  }
  const relationships: Ns5OntologyV3PlanRelationship[] = index.relationships.map(row => {
    const link: Ns5OntologyV3PlanRelationship = {
      relationshipId: row.relationshipId,
      from: row.from,
      to: row.to,
      type: row.type,
      required: row.required,
      mode: row.mode,
      description: row.description,
    };
    if (row.field !== undefined) link.field = row.field;
    if (row.through !== undefined) link.through = row.through;
    if (row.catalogType !== undefined) link.catalogType = row.catalogType;
    if (row.roles) link.roles = [...row.roles];
    if (row.path !== undefined) link.path = row.path;
    if (row.derived) link.derived = true;
    return link;
  });
  return {
    moduleName: index.moduleName,
    businessDomain: index.businessDomain,
    entities: planEntities,
    relationships,
    normalizations: frozen?.normalizations ?? [],
  };
}
