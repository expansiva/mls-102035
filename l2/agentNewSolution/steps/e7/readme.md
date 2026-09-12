# E7 — realization

E7 is an automated compiler after the sixth and final product-design clarification. It groups identical journey step
ids into stable N→1 use cases, details each use case with a `parallel_dynamic` reasoning worker, runs a
deterministic targeted repair for invalid drafts, derives lifecycle workflows and emits permanent typed
L4 contracts.
The versioned validation report is append-by-round: a targeted repair preserves every earlier finding
for audit, while replaying the same round replaces only that round instead of duplicating it.
Each worker uses the strict internal `{type:"flexible",result:{…}}` envelope, avoiding a temporary
failure state when its artifact is healthy.

Each use case keeps its description, E2 context ids, E4 entity refs, `writes[]` (which business
objects it records), behavior-owned E5 rule ids and references to real lifecycle transitions. E8 owns
operation inputs/outputs. `writes` is the realization of the journey's `affects` plus the step entity
and transition entities; the gate requires coverage and records extras as a system decision.
Actors, authorities, data scopes, errors, endpoint access patterns, ports and transaction policies stay
with their actual owners. Old drafts are rejected by version; a resume reuses only v4 drafts.

Full transitions have one owner in workflow artifacts; use cases and journeys store only transition ids.
Global provenance and generation metadata live in indexes, not in every artifact. The step never edits journey `business` and verifies its `businessHash`. It writes only realization
metadata back to journey/access contracts. E3 realization derives authority links from journey-step refs;
E8 operations are the future channel integration endpoints, and backend generators choose their architecture.

Workflow compilation starts from the explicit E4 lifecycle. States with `reachedBy: time` never
enter the workflow and are never shrunk — they are computed on read. Actor/command states without a
reachable transition fail `NS4_E7_STATE_UNREACHABLE` (repair: connect the command via `affects`, or
mark `reachedBy: time` with a `ruleRef`). Silent `shrinkLifecycle` / `omitWorkflow` is gone except
when a human unmarked the state at the E4 checkpoint. Binary inactivation or reversal flags still
do not require a workflow. The deterministic post-resolution gate remains a terminal invariant
for broken entity/use-case references, invalid transition bounds/operators and compiler/gate drift.
