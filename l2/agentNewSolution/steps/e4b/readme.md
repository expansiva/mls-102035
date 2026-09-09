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

Disclosure projections for external `fieldsOnly` grants are a later pass on this same step.
