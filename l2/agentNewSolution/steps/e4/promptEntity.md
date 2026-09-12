<!-- mls fileReference="_102035_/l2/agentNewSolution/steps/e4/promptEntity.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->

# E4 — detail one ontology entity

Generate fields, constraints and entity-local rule references only for the requested entity. The supplied
overview is frozen: do not rename the entity, change its kind/storage/lifecycle/source references,
cardinality, mutability, `derivation`, add entities or change relationships. Write human-facing text in the user's language.
The human prompt includes the platform level-1 catalog as placeholders (`<Person>`). It is context, not a list of fields to copy onto this entity. A party or a catalogue thing is a role on a level-1 subtype; declare only the fields this module adds; fields the level 1 already has are not declared here. When `kind` is `mdm`, `fields` is the module namespace (it may be empty). When a person-registration field is in neither level 1 nor the registry `general` list, put its `fieldId` in `promoteToGeneral` (E4 records `promoteToGeneral<Field>`, chosen `general`, alternative `moduleNamespace`).
If the overview stored an on-demand export/report/file as `derived`, do not invent line-item records
to persist its composition. When the frozen overview carries `derivation`, emit output fields whose
`fieldId`s match `derivation.aggregate[].fieldId` — do not invent a second formula.

## Field contract

- Field, constraint and invariant ids are lowerCamel.
- Types: `uuid`, `string`, `text`, `number`, `integer`, `boolean`, `money`, `date`, `datetime`, `json`.
- A stored entity must contain the overview's `idField` as required `uuid`, unless `kind` is `mdm` and `fields` is an empty namespace (identity lives at level 1).
- Honour the frozen overview `displayField`. Do not invent a second identifying field from a name suffix.
- Lifecycle states require a `status` field with an `enum` constraint whose value is a compact JSON
  array string containing exactly those state ids (`lifecycleStates[].state`; a bare string is the id).
- Those states, and every other enum constraint value, are **stable English codes**: lowerCamel ASCII
  (`active`, `inactive`, `monday`), never the user's language (`ativo`, `segunda-feira`). Field
  `title` and `description` remain in the user's language.
- For every enumerated field that is NOT the lifecycle `status` field, emit `enumLabels` as
  `{ "code", "label" }[]` next to the enum constraint — `code` matches a value in the constraint,
  `label` is the user's language (`userLanguage`, default `en`). Example:
  `{ "code": "high", "label": "Alta" }`. Do not emit `enum` itself; it is derived. Do not emit
  `enumLabels` on the `status` field: those codes already have `lifecycleLabels` on the overview.
  Optional in the schema is not optional for the model — a later deterministic pass will humanize
  the code (`inProgress` → `In progress`) if you omit a label, which is worse than your translation.
- The overview already freezes any named lifecycle subsets required by the supplied sources. Use
  those exact predicates when shaping fields and rule references; do not add, remove or reinterpret them.
- Constraints are shared frontend/backend validation contracts. Kinds: `min`, `max`, `minLength`,
  `maxLength`, `pattern`, `enum`, `format`, `unique`, `custom`. Sources in this greenfield run are
  `journey`, `user` or `inferred`, never `database` or `legacyCode`.
- Do not invent restrictive bounds or enums without a source. Time-relative conditions, authorization,
  cross-entity rules, transitions and calculations belong to E5. `useRules` contains only stable
  lower-camel ids; never repeat rule descriptions in the ontology.
- Include relationship reference fields needed by the supplied touching relationships and connected
  journeys. A reference is carried/selected context, not a raw id that a user must type.
- A later deterministic pass may bind relationships only to fields emitted now. For a stored scalar
  relationship, place the required reference on its actual owning/cardinality side; for an existing
  collection use an explicit JSON/list-reference field. MDM edges and derived joins should use their
  identity or genuine derivation fields and must not receive a fabricated foreign key.

## Output

Return exactly one `{ "type": "flexible", "result": { ... } }` object without Markdown. The `result`
value must be the entity artifact below.

{
  "planId": "e4-ontology-entity",
  "moduleName": "lowerCamelModule",
  "reviewRound": 1,
  "entityId": "Project",
  "fields": [{
    "fieldId": "projectId",
    "title": "Project id",
    "type": "uuid",
    "required": true,
    "description": "Stable identifier carried between connected journey steps.",
    "constraints": [{
      "constraintId": "uniqueProjectId",
      "kind": "unique",
      "value": "true",
      "description": "Each project has one stable identifier.",
      "source": "inferred"
    }]
  }, {
    "fieldId": "priority",
    "title": "Priority",
    "type": "string",
    "required": true,
    "description": "How urgent the work is.",
    "constraints": [{
      "constraintId": "priorityEnum",
      "kind": "enum",
      "value": "[\"low\",\"medium\",\"high\"]",
      "description": "Allowed priority codes.",
      "source": "user"
    }],
    "enumLabels": [
      { "code": "low", "label": "Low" },
      { "code": "medium", "label": "Medium" },
      { "code": "high", "label": "High" }
    ]
  }],
  "useRules": ["projectHasClient"],
  "promoteToGeneral": []
}
