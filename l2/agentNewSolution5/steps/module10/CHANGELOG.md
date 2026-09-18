# module10

## 2026-09-18 (ns5_52b)

- `requestKind` (`moduleRequest` | `notAModuleRequest`) is required by `submitNs5Module` and read by
  `ns5ModuleRequestKind`. `notAModuleRequest` answers the user with `NS5_MODULE_NOT_A_REQUEST`,
  drains the remaining steps and returns before `ensurePipeline`, so no folder is created in `l4/`.
  The verdict is not persisted: `normalizeNs5ModuleArtifact` never copies it to the artifact, and a
  payload without the field (every recorded run) still means `moduleRequest`.
- The verdict does not apply to `/rebuild all`: the entry hook already deleted the module before the
  step runs, so refusing there would leave nothing in its place. A `/rebuild all` with no request in
  the body is refused earlier, by `ns5EntryRefusal`, before the deletion.

## 2026-09-12

- `pt` → `pt-BR` on `userLanguage` / `productLanguages` / `defaultLanguage`. `en` stays
  `en`. Recorded as `ptToPtBR` on `pipeline.json` `module10.normalizations[]`.

## 2026-09-11

- Actors go to `pipeline.json` `module10.actors`, not `module.defs.ts`. `scope` is gone.
  Schema `2026-09-10-ns5-module-v2`.
- System prompt prepends the MDM skill (`skills/mdm.md`). `details` on the module
  artifact is written later by ontology30, not by this step.

## 2026-09-10

- First LLM step of agentNewSolution5: actors with `origin`, languages by prompt provenance, module
  name from `/module` or a lowerCamel proposal, scope as prose lists. Tool `submitNs5Module`, gate,
  repair <= 2, persist `module.defs.ts`.
