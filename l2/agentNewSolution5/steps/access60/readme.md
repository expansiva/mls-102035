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

`Ns5AccessArtifact`: `actors[]` (copied from the pipeline), `authorities[]`, `grants[]`. A grant
carries `actorRef`, `entityRefs`, `dataScope` (`mode` + optional `anchorEntity` + description)
and `disclosure` (`mode` + `allowedFields`/`deniedFields` as `Entity.field` + description). No
profiles, landing intent, realization, hops, `allowedInformation` or journey-step lists.

## Invariants

- Ids are unique lowerCamel. Authorities have a title and a description.
- Every actor has at least one grant. Every journey actor is covered.
- An `external` actor only receives `own` grants.
- `fieldsOnly` / `summaryOnly` name `allowedFields` or `deniedFields` as a proper restriction
  (non-empty and not the complete resolvable set). Unrestricted `fieldsOnly` is normalized to
  `fullRecord` before the gate. Every ref resolves (`fields[]` ∪ `storage.idField` ∪ `details.<name>`).
- `own` / `assigned` / `related` name `anchorEntity` as a `party: person` entity reachable from
  every `entityRef` by required relationships. `anchorPath()` computes that walk and is not stored.
  `anchorEntity` on any other mode is dropped before the gate.
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
