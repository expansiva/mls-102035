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
- `externalSystems` that the sibling modules declare, read from each sibling's own `l4/<sibling>/integration.defs.ts` (never from a written list)

## Output

`Ns5IntegrationArtifact`: `inbound[]`, `outbound[]`, `plugins[]`, `connections[]` when the module names an operation (omitted when empty), and `externalSystems[]` when the module declares a system outside the app (omitted when empty; the artifact is then `...-integration-v4`, otherwise v3). Inbound is
`{ id, kind, from, event?, writes[], effect, transitionRef?, description }`. Outbound is
`{ id, kind, to, event, on, entityRefs[], description }`. A plugin is
`{ pluginId, usedBy[], description }`. An external system is `{ id, title, description, settings[{ id, title, description, secret }], operations[{ operationId, direction, description }] }`: intent only, never address, method, header, format, authentication or input/output types. Empty lists are valid when there is no signal; the step
then writes that artifact **without** an LLM call and records `noIntegrationSignal` on the pipeline
step.

## Signals (LLM vs skip)

The step calls the model only when at least one of:

- an actor `kind: system` on the module
- `sourcePrompt` contains a term from the platform plugin catalog (`stripe`, `cardPayment`)
- `sourcePrompt` contains a connection-catalog id (lets the step run; does not by itself require an item)
- a sibling module is already in the organization registry

No signal ⇒ empty lists, cost 0, `noIntegrationSignal: true`. Shared MDM (`Product`, `Person`) is
not a signal and is not an integration item.

## Invariants

- Ids are unique lowerCamel across inbound and outbound. Plugin ids are unique.
- Inbound items name `from`. Outbound items name `to`.
- `writes` / `entityRefs` exist in the ontology when set. `transitionRef` only with
  `effect: 'transition'`; leftover refs are dropped (`dropTransitionRef` on
  `normalizations[]`). `effect: 'transition'` without `transitionRef` is
  `NS5_INTEGRATION_TRANSITION_REF`; a named id that does not exist is
  `NS5_INTEGRATION_TRANSITION_UNKNOWN`.
- `pluginId` is in the platform catalog; `usedBy` is `journeyId.stepId` or `processId.taskId`.
- `from` / `to` that is not a registry sibling, `organization` or `any` is a warning
  (`NS5_INTEGRATION_UNKNOWN_MODULE` / `unknownModule`), not an error (`kind: external` never warns).
- A signal other than `connectionTerm`, with inbound, outbound, plugins and connections all empty, fails `NS5_INTEGRATION_SIGNAL_WITHOUT_ITEM`.
- A connection row names `connectionId` and `operationId` that resolve, in this order, against the platform catalog, a system this module declares, a system a sibling declares. `direction` is filled from the operation found. `call` needs a real `usedBy`. `entityRefs` and `effect` come together or not at all.
- An external system: `id`, `settings[].id` and `operations[].operationId` are lowerCamel and unique at their level; `direction` is `call` or `serve`; `title` and `description` are not empty; `secret` is a boolean; `id` repeats neither a platform catalog connection nor a sibling's system (`NS5_INTEGRATION_SYSTEM_*`). The model no longer writes `inbound`/`outbound` with `kind: external`; the gate still accepts what already exists.
- A language model or any AI service is never an `externalSystems` entry: the prompt sends the module to the catalog connection that offers AI (`cm`). Intent only, no gate (l4_p4_120); if a live run declares one anyway, it goes back to the planner.
- Gate repair is bounded (2). After that the pipeline step is `failed`.
- Success emits the `integration70-done` result. `finalize80` then runs the oracle, writes
  the registry and l5, and marks the pipeline complete.
- p4_20: after writing, `integration.defs.ts` go through the Studio compiler (`helpers/ns5Compile.ts`, never a disk tsc). Diagnostics go to this step's repair as `gateFeedback`, same budget as the gate; past it the step is `failed` with the error. `steps.integration70.compile` records `clean`/`errors`/`unavailable` and the file count; `unavailable` (no `mls.l2.typescript`) is a state, never clean. The noIntegrationSignal artifact has no LLM to repair it: a compile error there fails the step.

## Known traps

- Do not emit a card / token entity for a payment plugin.
- Do not treat a shared MDM entity as inbound/outbound.
- Do not add prompt examples of a domain. Placeholders (`<id>`, `<moduleName>`, `<Entity>`) are
  context.
- The catalog is platform, not domain. Do not grow it from a module prompt.
- p4_21: `gate.ts`, `contracts.ts` moved to `solution/gates/integration70/` (pure normalize/validate, used outside the agent; `mls-base/skills/agentCodeIsPrivate.md`). The LLM tool (buildNs5IntegrationTool) stayed in the agent: it moved, body unchanged, to `agentNs5Integration.ts`. Dated reexport left at the old path of `gate.ts` for consumers of another owner (newRelease, agentReviewSolution); delete it when they switch.
