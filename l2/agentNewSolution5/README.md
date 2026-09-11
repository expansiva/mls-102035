# agentNewSolution5

L4 v5 source compiler. Writes the six business sources of a module and a deterministic
finalize. Does not emit derived copies (operations, workspaces, usecases, landings) and
never dispatches agentChangeBackend or agentChangeFrontend.

`module10`, `journeys20`, `ontology30`, `rules40`, `workflows50`, `access60`, `integration70`
and `finalize80` are implemented. `finalize80` is deterministic: integrity oracle, organization
registry, l5 config/project.json, `pipeline.status: complete`. It never dispatches CB or CF.
Gate tests run on the two complete-run fixtures; `replayRealRuns.test.ts` replays
`normalize → gate → writeDefs` against those defs.

## Invocation

```
@@newSolution5 <prompt> /module <lowerCamel>
@@newSolution5 <prompt> /fast /module <lowerCamel>
@@newSolution5 <prompt> /fast
@@newSolution5 /rebuild all <module>
```

- `/module` fixes the folder name. Without it, `module10` proposes a lowerCamel name.
- `/fast` skips reserved clarification anchors (they have no screen) and auto-approves each
  implemented step.
- `/rebuild all` deletes only `l4/<module>/**` of that module and recreates the pipeline.
- An existing module without `/rebuild all` is refused.

## L4 table

| source | file |
|---|---|
| module | `l4/<mod>/module.defs.ts` |
| journeys | `l4/<mod>/journeys/<journeyId>.defs.ts` + `journeys/index.defs.ts` |
| ontology | `l4/<mod>/ontology/<Entity>.defs.ts` + `ontology/index.defs.ts` |
| rules | `l4/<mod>/rules.defs.ts` |
| workflows | `l4/<mod>/workflows.defs.ts` |
| access | `l4/<mod>/access.defs.ts` |
| integration | `l4/<mod>/integration.defs.ts` |
| pipeline | `l4/<mod>/pipeline/pipeline.json` |

Types live in `/_102035_/l2/solution/types.ts`. Shared pure helpers are re-exported from
`/_102035_/l2/solution/lib.ts` without moving the NS4 files.

## Pipeline

`docs/flow.json` is the contract: `module10 → journeys20 → ontology30 → {rules40, workflows50, access60} → integration70 → finalize80`.
`finalize80` writes `pipeline/finalize-report.json` and `pipeline/runNN_newsolution5.json`.
Oracle errors fail the run; warnings do not. The step never dispatches CB or CF.
