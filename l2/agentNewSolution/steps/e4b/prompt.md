<!-- mls fileReference="_102035_/l2/agentNewSolution/steps/e4b/prompt.md" enhancement="_blank" -->
<!-- modelType: reasoning -->

# E4B — propose person-scope anchors and disclosure projections

You reconcile an approved access matrix with an approved ontology. For each grant whose
`dataScope.mode` is `own`, `assigned` or `related`, propose the field path from the covered
entity to a Person (an entity with `mdmSubtype: Person` or `party: person`). The login field
on that person is always `platformUserId`. Do not invent entities.

When a listed grant has an external profile and disclosure mode `fieldsOnly`, `summaryOnly` or
`aggregateOnly`, also propose a disclosure projection. Read `allowedInformation`,
`deniedInformation` and any referenced rule descriptions. Map that prose to field ids that exist
on the covered entity (or on level-1 identification/base of a related master-data subtype). Do not
invent field ids. Do not copy prose into the artifact.

Write human-facing text in the user's language. Ids stay exactly as given.

Return JSON only:

```json
{
  "type": "flexible",
  "result": {
    "proposals": [
      {
        "profileRef": "<profileId>",
        "authorityRef": "<authorityRef>",
        "entityRef": "<EntityId>",
        "hops": [
          {
            "entityRef": "<entity that owns the field>",
            "fieldId": "<fieldId>",
            "targetEntityRef": "<entity the field points at>",
            "direction": "forward"
          }
        ]
      }
    ],
    "projections": [
      {
        "profileRef": "<profileId>",
        "authorityRef": "<authorityRef>",
        "entityRef": "<EntityId>",
        "fields": ["<fieldId>"],
        "excludedFields": ["<fieldId>"]
      }
    ]
  }
}
```

Hop `direction`:
- `forward` — the field lives on the current entity and points at the next one (`<Entity>.<fk>`).
- `incoming` — the field lives on another entity that points at the current one (`<Owner> ← <Link>.<fk>`).

If the prose of the grant requires a field that is not in the ontology, omit `hops` and set
`missingField: { "entityRef": "<EntityId>", "fieldId": "<fieldId>" }` instead of inventing the field.

Disclosure projection:
- The persisted entity id is always `<EntityId><ProfileId>View` (PascalCase profile id, suffix `View`).
- `fields` is a proper subset of the covered entity fields (strictly fewer), plus optional level-1 base fields.
- `excludedFields` lists the entity field ids you decided to leave out, for a human to read.
- For `aggregateOnly`, `fields` are derived output fields; still declare `excludedFields`. You may add
  `"aggregate": [{ "fieldId": "<fieldId>", "op": "count" }]` (`count` | `sum` | `min` | `max` | `first` | `groupKey`).
- Placeholders — use only ids that exist in the entity. Do not copy example names into the artifact.

Rules:
- Propose hops only for the grants listed as needing a person-scope path. Organization, public and custom grants have no path.
- Propose projections only for the grants listed as needing a disclosure projection.
- Every hop must name ids that exist in the ontology relationships or fields.
- The last hop must land on a Person. Do not stop on a company, a document or a projection.
- Do not add, omit or rename keys. Do not wrap the JSON in Markdown fences.
