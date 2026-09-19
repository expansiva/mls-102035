# journeys20

## 2026-09-19 (ns5_62)

- Nested repair from `judge35` does not emit a second `journeys20-done` when that planId already
  exists in the task. Persist is unchanged. No new gate and no new prompt phrase.

## 2026-09-16

- ns5_43 T1: an `affects` entry is an entity id OR a path into an embedded child of one
  (`PedidoCompra.details.itens`). The root is normalised to PascalCase, the path segments
  are kept verbatim. `NS5_JOURNEY_STEP_AFFECTS_ID` and `journey.schema.json` accept the path.

## 2026-09-12

- An `act` declares `effect`: `create` | `update` | `transition` (required; not derived).
  `transitionRef` only with `effect: 'transition'`; leftover refs are dropped and
  recorded on `draft.normalizations[]` and `pipeline.json` `journeys20.normalizations[]`.
  `creates` / `NS5_JOURNEY_ACT_INTENT_BOTH` are gone.
  Gate: `NS5_JOURNEY_ACT_EFFECT_REQUIRED` / `NS5_JOURNEY_TRANSITION_REF_REQUIRED`.

## 2026-09-11

- Inferred-actor drop writes `droppedActors` on `pipeline.json` `journeys20` and
  no longer rewrites `module.defs.ts`. Actors are read via `readNs5Actors`.
- System prompt prepends `skills/mdm.md` (same `composeNs5SystemPrompt` as
  module10/ontology30/access60). Skill § Identity and login: registering a
  login person is an `act`; the platform invites; no invite/verify-email step.
- A journey of only `locate`/`inspect` is valid. The ≥1 `act|decide` gate
  (`NS5_JOURNEY_ACT_OR_DECIDE`) is gone; it had no business basis (G15). Fixture:
  `consultarMisOrdenes` without the fabricated `act`.
- After writing `journeys/index.defs.ts`, remove every `journeys/*.defs.ts` whose id is not
  in the index. Draft records `removedOrphans[]`. Closes the class where a new id set left
  previous files on disk (Q1 / ns5_11).

## 2026-09-10

- Normalize drops `handoffTo` unless `kind === 'handoff'` (prompt + named `gateFeedback` did not
  stop the model filling the field as a self-label: 17/17 x 3). Schema `if/then` not used:
  `x-tool-strict` would reject the batch and leave the repair path. Gate still requires a valid
  `handoffTo` on a real handoff. Fixture: live `comandaRestaurante5` self-label payload.
- Prompt omits `handoffTo` except on `kind: handoff` (structural counter-example with placeholders).
  `NS5_JOURNEY_HANDOFF_TO_KIND` names the `stepId` and says `remove the field`; formatted feedback
  includes the path. Gate unchanged. `MAX_REPAIRS` stays 2.
- First journeys step of agentNewSolution5: business only, `affects`, `decide`, mechanical drop of
  inferred external actors without an exclusive step. Tool `submitNs5Journeys`, gate, repair <= 2,
  persist `journeys/*.defs.ts` and `journeys/index.defs.ts`. A run then stops at
  `awaitingStep: ontology30`.
