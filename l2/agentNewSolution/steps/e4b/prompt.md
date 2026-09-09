<!-- mls fileReference="_102035_/l2/agentNewSolution/steps/e4b/prompt.md" enhancement="_blank" -->
<!-- modelType: reasoning -->

# E4B — propose person-scope anchors

You reconcile an approved access matrix with an approved ontology. For each grant whose
`dataScope.mode` is `own`, `assigned` or `related`, propose the field path from the covered
entity to a Person (an entity with `mdmSubtype: Person` or `party: person`). The login field
on that person is always `platformUserId`. Do not invent entities.

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
    ]
  }
}
```

Hop `direction`:
- `forward` — the field lives on the current entity and points at the next one (`<Entity>.<fk>`).
- `incoming` — the field lives on another entity that points at the current one (`Vehicle ← VehicleAssignment.<fk>`).

If the prose of the grant requires a field that is not in the ontology, omit `hops` and set
`missingField: { "entityRef": "<EntityId>", "fieldId": "<fieldId>" }` instead of inventing the field.

Rules:
- Propose only for the grants listed in the prompt. Organization, public and custom grants have no path.
- Every hop must name ids that exist in the ontology relationships or fields.
- The last hop must land on a Person. Do not stop on a company, a document or a projection.
- Placeholders — use only ids that exist in the entity. Do not copy example names into the artifact.
- Do not add, omit or rename keys. Do not wrap the JSON in Markdown fences.
