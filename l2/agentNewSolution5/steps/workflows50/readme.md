# workflows50 — orchestrated processes

One LLM call with tool `submitNs5Workflows` **only when a structural signal or a
time/event phrase exists**. Writes `l4/<mod>/workflows.defs.ts`. Clarification is
reserved and has no screen; `/fast` auto-approves.

v2 form (G13): a process has a trigger and business stages — not a copy of journey
screen steps, and not the entity FSM (states and allowed transitions stay on the
ontology).

## Input

- The original request (`sourcePrompt`)
- Journeys (`business` entire, including `handoff` / `handoffTo` and `act.effect`)
- Ontology transitions (`by` actors, `system`, `time`)
- Time/event phrases extracted from `sourcePrompt` (heuristic in code, not in the prompt)
- Module actors

## Output

`Ns5WorkflowsArtifact` (`2026-09-12-ns5-workflows-v2`): `processes[]` of
`{ processId, title, description, trigger, tasks[] }` plus `journeyDecisions[]`
(`{ journeyId, inProcess, processId? }`).

Trigger is `{ kind: scheduled, schedule }` | `{ kind: event, event: Entity.transitionId }`
| `{ kind: manual, actorRef }`.

Each task is `{ taskId, kind: human|mechanical|llm|wait, …, next, description }`.
`human` requires `actorRef` and `journeyRef`. `mechanical`/`llm` require `entityRef`
and `effect` (`create` | `update` | `transition`); `transitionRef` iff `effect` is
`transition`. `wait` is a pause (prose in `description`).

Empty `processes` is valid when there is no signal and no time/event phrase; the
step then writes that artifact **without** an LLM call, records `noProcessSignal`,
and fills `journeyDecisions` with `inProcess: false`.

## Signals (LLM vs skip)

The step calls the model when at least one of:

- a journey step `kind: handoff`
- an entity whose actor-valued transitions are `by` two or more distinct actors
- a `decide` whose entity is also touched by a journey of a different actor
- a transition `by: system` or `by: time`
- a time/event phrase in `sourcePrompt` (`todo|cada|quando|automaticamente|a cada|mensal|diario`, accents folded)

No signal and no phrase ⇒ `processes: []`, cost 0, `noProcessSignal: true`.

## Invariants

- Ids are unique lowerCamel. `next` points at task ids of the same process.
- A `human` task names `actorRef` and `journeyRef` that exist.
- Every journey `handoff` appears as some human task's `journeyRef`.
- `mechanical`/`llm` `transitionRef` exists on the entity with `by` `system`/`time` or the actor.
- `trigger.event` is `Entity.transitionId` of this module (inbound is ns5_31).
- Duplicate `kind`+`journeyRef|entityRef`+`effect` in the same process is dropped and
  recorded on `systemDecisions`.
- The task graph has no cycle unless the cycle goes through a `wait` task.
- A handoff / foreign-by / cross-actor decide with empty `processes` fails
  `NS5_WORKFLOWS_SIGNAL_WITHOUT_PROCESS`.
- Gate repair is bounded (2). After that the pipeline step is `failed`.
- Success emits the `workflows50-done` result. `integration70` still waits for `rules40-done` and
  `access60-done`.

## Known traps

- This is not the NS4 entity lifecycle. Do not emit states/`from`/`to`.
- Do not invent a process from independent jobs on the same record (open / add / close with no
  handoff, no multi-actor transition, no cross-actor decide, no schedule/event).
- Do not add prompt examples of a domain. Placeholders (`<journeyId>`, `<Entity>`, `<actorRef>`)
  are context.
- `handoffTo` on a non-handoff step is dropped by journeys20; this step only reads real handoffs.
- A stage is a business step, never `locate`/`inspect`.
