# integration70

## 2026-11-19 (l4_p4_117)

- `externalSystems[]` on `submitNs5Integration`: the module declares the system outside the app it talks to (`{ id, title, description, settings[], operations[] }`, no address, method, format or authentication). A row of `connections` resolves against the platform catalog, then this module's systems, then a sibling's (read from the sibling's own `integration.defs.ts`). The artifact is `...-integration-v4` only when it declares a system; otherwise it stays v3. The model no longer writes `inbound`/`outbound` with `kind: external`; the gate still accepts what exists. The human prompt lists the siblings' systems.

## 2026-11-18 (l4_p4_109 s2)

- An arrival from a catalog connection is a `serve` row of `connections`, never an `inbound` too. Normalize drops an `inbound` (`kind: external`, `from` = a catalog connection) that a `serve` row of that connection repeats (same entity, `create`/`update`); the gate charges any other such `inbound` (`NS5_INTEGRATION_INBOUND_NO_SERVE`). The three texts that told the model to write `inbound.writes` now also name the `serve` row.

## 2026-11-17 (l4_p4_107 s2c)

- `connections[]` on `submitNs5Integration`: closed catalog in the human prompt, no `direction` or `kind` asked of the model. A connection-catalog term is a signal, so the step runs; it does not by itself require an item.

## 2026-10-02 (p4_21)

- p4_21: `gate.ts`, `contracts.ts` moved to `solution/gates/integration70/` (pure normalize/validate, used outside the agent; `mls-base/skills/agentCodeIsPrivate.md`). The LLM tool (buildNs5IntegrationTool) stayed in the agent: it moved, body unchanged, to `agentNs5Integration.ts`. Dated reexport left at the old path of `gate.ts` for consumers of another owner (newRelease, agentReviewSolution); delete it when they switch.

## 2026-09-29 (p4_20)

- The Studio compiler is the last gate: `integration.defs.ts` are compiled after writing; errors go to the repair (same budget), never approved; `steps.integration70.compile` records the result for finalize80. The noIntegrationSignal artifact has no LLM to repair it: a compile error there fails the step.

## 2026-09-16

- ns5_43 T4: reads the ontology through `solution/ontologyView.ts`, so a v3 index does not
  break the entity/writer list. The registry it feeds names a papel `{ subtype, roleTag }`.

## 2026-09-12

- Inbound `transitionRef` with `effect ≠ transition` is dropped (`dropTransitionRef`); `effect: transition` without `transitionRef` stays `NS5_INTEGRATION_TRANSITION_REF`; unknown id stays `NS5_INTEGRATION_TRANSITION_UNKNOWN`.
- Form `-integration-v2` (ns5_31): inbound `{ id, kind, from, event?, writes[], effect, transitionRef? }`;
  outbound `{ id, kind, to, event, on, entityRefs[] }`; plugins `{ pluginId, usedBy[], description }`.
  `inbound.writes` is a writer. `outbound.on` is `Entity.transitionId` or `Entity.create`.
  Signals also fire when siblings exist in the registry. `unknownModule` is a warning for
  event/moduleEndpoint peers not in the registry. Gate: inbound writer coverage, outbound.on,
  plugins.usedBy, platform events (`from: organization`).

## 2026-09-11

- Actors come from `readNs5Actors` (pipeline), not `module.defs.ts`.

## 2026-09-10

- First integration step of agentNewSolution5: inbound/outbound module endpoints, events and
  externals, plus platform plugins. Tool `submitNs5Integration` only when a structural signal
  exists (`kind: system` actor, or a plugin-catalog term in `sourcePrompt`); otherwise persist
  empty lists with `noIntegrationSignal` and no LLM call. Gate: refs, plugin catalog,
  `moduleEndpoint` unknownModule as a warning. v1 form, minimum; align with the production
  harness before any executor. A run then stops at `awaitingStep: finalize80`.
