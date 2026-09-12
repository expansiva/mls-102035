# integration70 — what enters and leaves the module

One LLM call with tool `submitNs5Integration` **only when a structural signal exists**. Writes
`l4/<mod>/integration.defs.ts`. Clarification is reserved and has no screen; `/fast` auto-approves.

v2 form (ns5_31). A module talks to another by event (`outbound.on` = `Entity.transitionId` or
`Entity.create`; inbound `writes` + `effect` is a writer), module endpoint, external system, or
platform plugin (`usedBy` = `journey.step` or `process.task`).

## Input

- The original request (`sourcePrompt`)
- Module actors (`kind: system` is a signal)
- Ontology entity ids
- Solution registry module names (siblings)
- Platform plugin catalog (closed; same ids E6 has named)

## Output

`Ns5IntegrationArtifact`: `inbound[]`, `outbound[]`, `plugins[]`. Inbound is
`{ id, kind, from, event?, writes[], effect, transitionRef?, description }`. Outbound is
`{ id, kind, to, event, on, entityRefs[], description }`. A plugin is
`{ pluginId, usedBy[], description }`. Empty lists are valid when there is no signal; the step
then writes that artifact **without** an LLM call and records `noIntegrationSignal` on the pipeline
step.

## Signals (LLM vs skip)

The step calls the model only when at least one of:

- an actor `kind: system` on the module
- `sourcePrompt` contains a term from the platform plugin catalog (`stripe`, `cardPayment`)
- a sibling module is already in the organization registry

No signal ⇒ empty lists, cost 0, `noIntegrationSignal: true`. Shared MDM (`Product`, `Person`) is
not a signal and is not an integration item.

## Invariants

- Ids are unique lowerCamel across inbound and outbound. Plugin ids are unique.
- Inbound items name `from`. Outbound items name `to`.
- `writes` / `entityRefs` exist in the ontology when set.
- `pluginId` is in the platform catalog; `usedBy` is `journeyId.stepId` or `processId.taskId`.
- `from` / `to` that is not a registry sibling, `organization` or `any` is a warning
  (`NS5_INTEGRATION_UNKNOWN_MODULE` / `unknownModule`), not an error (`kind: external` never warns).
- A signal with all three arrays empty fails `NS5_INTEGRATION_SIGNAL_WITHOUT_ITEM`.
- Gate repair is bounded (2). After that the pipeline step is `failed`.
- Success emits the `integration70-done` result. `finalize80` then runs the oracle, writes
  the registry and l5, and marks the pipeline complete.

## Known traps

- Do not emit a card / token entity for a payment plugin.
- Do not treat a shared MDM entity as inbound/outbound.
- Do not add prompt examples of a domain. Placeholders (`<id>`, `<moduleName>`, `<Entity>`) are
  context.
- The catalog is platform, not domain. Do not grow it from a module prompt.
