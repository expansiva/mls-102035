# agentPlannerL4

L4 planner. On accept it **wipes** the module pool, diffs the sealed release against
the `/candidate` root, lists the artifacts of an existing complete module, writes
`pool/l1` and `pool/l2`, and orchestrates L2 → L1 → L2 by `type: 'agent'` steps
**in the same task**. No LLM. Does not read ontology to opine. A step never emits
`add-message-ai`.

`entry10` parses (including `/candidate`), sets `moduleFolder`, refuses, wipes
`l4/<mod>/pool/{l1,l2,l4}/` (messages + `web/*.json`), adjusts `l5/config.json`.
Wiping is unconditional: an `implement` message left unconsumed by a prior accept
is wiped too — a new plan invalidates an old accept, regardless of `mode`.
`diff20` writes `pool/l1/web/l4diff.json` and `pool/l2/web/l4diff.json`.
`dispatch20` lists artifacts, cites the two `l4diff.json` files, writes the two
messages tagged `mode: estimate`, traces `delivered`, and creates `L2 r1`. `loop30`
creates `L1 r1` with the real `l2→l1` filename when that message is in the box,
then `L2 effort r1` with the real `l1→l2` filename (L2 does not accept `file: ''`
as a step prompt). A completed planner without output fails the task. Rounds 2 and
3 only when a new message with `round > 1` is in the box. Round 3 with a non-empty
box is `disputed`. `loop30` also drains `pool/l4` — the mailbox L4 itself owns —
every tick: L2's `l2→l4` effort-ready report is traced `processed` and deleted
below round 3, and traced `disputed` and kept at round 3 (the newRelease review
run reads that outcome the same way it already does for l1/l2). "Defined" is l1
and l2 with no fresh work and `pool/l4` with no pendency. The l4 pipeline records
`{ round, l2, l1, effort }`.

## Invocation

```
@@agentPlannerL4 <lowerCamel>
@@agentPlannerL4 <lowerCamel> /fast
@@agentPlannerL4 <lowerCamel> /candidate
@@agentPlannerL4 <lowerCamel> /candidate pipeline/changes/<id>/revisions/<rev>/l4
```

- Module must already exist in `l4/`. Canonical and manual roots need `pipeline.status: complete`.
  A sealed revision root (`pipeline/changes/<changeId>/revisions/<revisionId>/l4`) is gated by
  the revision manifest instead, and refused when `pipeline/releases/<baseId>/l4` is missing.
- `/candidate` alone points `moduleFolder` at `<mod>/tobe/plan` (`revision: null`). A relative path is
  joined under the module. Without the flag the canonical l4 is byte-identical.
- The pool is derived from l4: a new run wipes it and plans again. Pending messages do not refuse.
- `/estimate` as a flag is refused (`not available yet`) — there is nothing to opt into: every pool
  message this planner writes or reads is already tagged `mode: estimate`. There is no `/rebuild`.
- The planning loop only ever writes and reads `mode: estimate`. `mode: implement` is written
  elsewhere, by the newRelease accept once a run is `ready` — this planner never writes it.
- Unknown `pipeline.flowId` (not NS5 / review / this planner) is recorded, not refused.

## What entry10 writes

If `l5/config.json` of the current project is missing `102020` or `102021` in
`workspaceDependencies`, they are appended (existing order kept) and
`projects[id] = { root: '../mls-<id>', type: 'lib' }` is filled when absent.
Tokens land on `pipeline.json` as `l5Adjusted` (e.g. `workspaceDependencies:+102021`).
When both ids are already there the file is not rewritten.

Wiped pool paths land on `pipeline.json` as `poolWiped`. Message traces use
`outcome: 'processed'` (the pool enum does not grow); reason: pool wiped: l4 changed.

## L4 table

| path | owner |
|---|---|
| `l4/<mod>/pipeline/pipeline.json` | NS5 run + planner `l5Adjusted`, `poolWiped`, `plOrchestration`, pool trace |
| `l4/<mod>/pool/{l1,l2,l4}/` | mailbox (`solution/pool.ts`) |
| `l5/config.json` | planner deps `102020` / `102021` |

Types of the pool live in `/_102035_/l2/solution/pool.ts`. `docs/flow.json` is the contract.
