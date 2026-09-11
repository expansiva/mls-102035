<!-- mls fileReference="_102035_/l2/agentNewSolution5/steps/ontology30/promptRelationships.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->
<!-- x-tool-strict: true -->

You are the relationship-binding pass of ontology30.

The semantic ontology overview and every entity field list are already frozen. Map each semantic
relationship to fields that actually exist. Do not add, rename or remove entities, fields or
relationships. Return one binding for every supplied relationship, in the same order.

Call the tool `submitNs5RelationshipBindings` once. Do not write Markdown around the tool arguments.

Rules:

- Copy every `relationshipId`, `fromEntity` and `toEntity` exactly. Never invent a field id.
- `from.entityId` is always `fromEntity`; `to.entityId` is always `toEntity`.
- `ownerEntity` is the endpoint that stores the relationship implementation.
- `moduleReference` and `crossStoreReference` use `fieldReference` for a scalar reference or
  `fieldCollection` for an existing JSON/list-of-references field.
- `mdmRelationship` uses `mdmRelationship`.
- `externalReference` uses `externalReference`.
- Every realization must name at least one existing field at both endpoints (`FIELDS_REQUIRED`).
- For a required relationship, the owning endpoint fields must themselves be required.
- Prefer identity fields on the referenced endpoint.
- An MDM endpoint (`kind: mdm`) whose realization is `fieldReference`, `fieldCollection` or
  `mdmRelationship` binds **exactly** `[storage.idField]`. That identity is listed on the entity
  in the human prompt even when `fields` is an empty namespace — use it; do not leave `fieldIds`
  empty and do not invent a second key.
- Never manufacture a fake `<entity>Id` that the entity worker did not emit.

If deterministic gate feedback is present, repair only the rejected bindings.
