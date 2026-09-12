# module10

## 2026-09-11

- Actors go to `pipeline.json` `module10.actors`, not `module.defs.ts`. `scope` is gone.
  Schema `2026-09-10-ns5-module-v2`.
- System prompt prepends the MDM skill (`skills/mdm.md`). `details` on the module
  artifact is written later by ontology30, not by this step.

## 2026-09-10

- First LLM step of agentNewSolution5: actors with `origin`, languages by prompt provenance, module
  name from `/module` or a lowerCamel proposal, scope as prose lists. Tool `submitNs5Module`, gate,
  repair <= 2, persist `module.defs.ts`.
