# workflows50 — orchestrated processes

One LLM call with tool `submitNs5Workflows` **only when a structural signal exists**. Writes
`l4/<mod>/workflows.defs.ts`. Clarification is reserved and has no screen; `/fast` auto-approves.

v1 form, provisional; align with the production harness (G3c) before any executor. This artifact
is orchestration of human/system/wait tasks for a later collab-messages runner — not the entity
FSM (states and allowed transitions stay on the ontology).

## Input

- The original request (`sourcePrompt`)
- Journeys (`business` entire, including `handoff` / `handoffTo`)
- Ontology transitions (`by` actors)
- Module actors

## Output

`Ns5WorkflowsArtifact`: `processes[]` of `{ processId, title, description, tasks[] }`. Each task
is `{ taskId, kind: human|system|wait, actorRef?, journeyRef?, stepRef?, next, description }`.
Empty `processes` is valid when there is no signal; the step then writes that artifact **without**
an LLM call and records `noProcessSignal` on the pipeline step.

## Signals (LLM vs skip)

The step calls the model only when at least one of:

- a journey step `kind: handoff`
- an entity whose actor-valued transitions are `by` two or more distinct actors (a transition
  whose `by` is not the single journey actor of that entity)
- a `decide` whose entity is also touched by a journey of a different actor (the case the
  journeys already declare: after one actor publishes, another decides)

No signal ⇒ `processes: []`, cost 0, `noProcessSignal: true`.

## Invariants

- Ids are unique lowerCamel. `next` points at task ids of the same process.
- A `human` task names `actorRef` that exists on the module.
- `journeyRef` / `stepRef` exist when set. Every journey `handoff` appears as some task's
  `journeyRef`+`stepRef`.
- The task graph has no cycle unless the cycle goes through a `wait` task.
- A process signal with empty `processes` fails `NS5_WORKFLOWS_SIGNAL_WITHOUT_PROCESS`.
- Gate repair is bounded (2). After that the pipeline step is `failed`.
- Success emits the `workflows50-done` result. `integration70` still waits for `rules40-done` and
  `access60-done`. A run then stops at the first unimplemented sibling (`access60`).

## Known traps

- This is not the NS4 entity lifecycle. Do not emit states/`from`/`to`.
- Do not invent a process from independent jobs on the same record (open / add / close with no
  handoff, no multi-actor transition, no cross-actor decide).
- Do not add prompt examples of a domain. Placeholders (`<journeyId>`, `<stepId>`, `<actorRef>`)
  are context.
- `handoffTo` on a non-handoff step is dropped by journeys20; this step only reads real handoffs.
