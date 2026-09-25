# access60 — who may do what, and sees what

One LLM call with tool `submitNs5Access`. Writes `l4/<mod>/access.defs.ts`. Clarification is reserved
and has no screen; `/fast` auto-approves.

## Input

- The original request (`sourcePrompt`)
- Module actors
- Journeys (`business` entire)
- Ontology: entities, fields (including `details.<name>` and identity), `party`, required
  relationships

## Output

`Ns5AccessArtifact`: `actors[]` (pipeline actors plus `personEntity`) and `grants[]`. A grant
carries `actorRef`, `title`, `description`, `entityRefs`, `dataScope` (`mode` + optional
`anchorEntity` + description) and `disclosure` (`mode` + `allowedFields`/`deniedFields` as
`Entity.field` + description). No authorities, profiles, landing intent, realization, hops,
`allowedInformation` or journey-step lists.

## Invariants

- Ids are unique lowerCamel. Every grant has a title and a description.
- Every actor has at least one grant. Every journey actor is covered.
- A resolved `crud` writer (`ns5ResolveEntityWriter`) is in `entityRefs` of ≥1 grant of an `internal`
  actor (`NS5_ACCESS_CRUD_WITHOUT_INTERNAL_GRANT`).
- An `external` actor only receives `own` grants.
- `actors[].personEntity` is the `kind: role` entity that actor is, or `''` when this module has no
  person record for them. The tool sends `actorPersons` (one item per actor); access60 merges it
  onto the pipeline actors before the gate and always writes the field. A missing actor is `''`
  plus `personEntityMissing`. Schema stays `2026-09-12-ns5-access-v3` (the field is additive).
- `own` / `assigned` anchor on that `personEntity`. A different anchor is rewritten
  (`anchorFromActor`, `from` → `to`) before the gate. `related` keeps the other person.
  `personEntity` that is not a `party: person` entity is `NS5_ACCESS_PERSON_UNKNOWN` /
  `NS5_ACCESS_PERSON_NOT_PERSON`. An external actor with `''` is
  `NS5_ACCESS_EXTERNAL_PERSON_REQUIRED`. `own` / `assigned` of an actor with `''` is
  `NS5_ACCESS_OWN_WITHOUT_PERSON`. A file that omits the key is not `''` — those checks stay off.
- `fieldsOnly` / `summaryOnly` name `allowedFields` or `deniedFields` as a proper restriction
  (non-empty and not the complete resolvable set). Unrestricted `fieldsOnly` is normalized to
  `fullRecord` before the gate. Every ref resolves (`fields[]` ∪ `storage.idField` ∪ `details.<name>`).
- `own` / `assigned` / `related` name `anchorEntity` as a `party: person` entity reachable from
  every `entityRef` by required relationships. `anchorPath()` computes that walk and is not stored.
  `anchorEntity` on any other mode is dropped before the gate. `assigned` is a direct FK to the
  login Person; `related` is a level-1 relationship (`MemberOf`, `ReportsTo`, `Employs`…).
- `custom` is valid when no `party: person` is reachable from the grant entities. A reachable
  Person plus a description that cites the actor (id or title) is
  `NS5_ACCESS_CUSTOM_HAS_ANCHOR`. No Person in the module is warning
  `NS5_ACCESS_CUSTOM_WITHOUT_PERSON` (access60 cannot create the entity).
- Gate repair is bounded (2). After that the pipeline step is `failed`.
- Success emits the `access60-done` result. `integration70` still waits for `rules40-done` and
  `workflows50-done`. A run then stops at the first unimplemented step (`finalize80`).

## Known traps

- Disclosure names fields, not concepts. Prose stays in `description`.
- Do not persist hops or a login field on the module. `own` reaches the Person whose
  `mdm_tag` login row (namespace `login`) is the session e-mail. `docType`/`docId` is
  the national document and is not the own-anchor. The consumer derives the person path
  from `anchorEntity` and the ontology.
- Do not add prompt examples of a domain. Placeholders (`<profileId>`, `<Entity>`, `<field>`) are
  context.
