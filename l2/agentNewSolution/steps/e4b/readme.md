# E4B — access realization

Automated compiler after E4. No human checkpoint. It reconciles the approved E3 access matrix
with the E4 ontology and writes `access/access-bindings.defs.ts`.

Each grant that covers an entity (authority `journeyStepRefs` → journey step → entity) becomes a
binding. `own` / `assigned` / `related` carry an `anchor` of field hops ending on a Person
(`mdmSubtype: Person` or `party: person`) at `platformUserId`. `organization` / `public` / `custom`
set `anchor: null` with a reason.

The LLM may propose hops from grant prose when the path is not unique. The gate checks every hop
against the ontology. A field the ontology does not have is `NS4_E4B_ANCHOR_FIELD_MISSING` with
`repairStep: e4-ontology`.

`synthesizedAuthorities[]` is one authority per `(entity × profile)`, id `synth:<entity>:<profile>`,
inheriting `dataScope` and `disclosure` from the covering grant. E8 puts those ids on catalogue
operations. Journey operations inherit the E3 authorities of their compiled steps.

For each external grant with `fieldsOnly`, `summaryOnly` or `aggregateOnly`, the LLM extracts a
disclosure projection `<Entity><Profile>View` from grant prose and referenced rule descriptions.
The gate checks form only: the projection exists (`NS4_E4B_DISCLOSURE_PROJECTION_REQUIRED`), its
fields are a proper subset of the source entity (plus optional level-1 base fields), and
`excludedFields[]` is declared. Prose stays the source; the gate does not match text to field ids.

`projectionRef` and `excludedFields` live on the access-binding (machine artifact), not on the
human grant. The projection is written as `ontology/<Entity><Profile>View.defs.ts` and is **not**
added to the E4 ontology index (that index is hash-frozen at E4 approval). Downstream readers
load it by `projectionRef`.
