# integration70

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
