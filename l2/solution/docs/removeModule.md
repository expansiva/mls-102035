# removeModule

`removeModule(moduleName, opts?)` → `{ deleted: string[]; edited: string[]; skipped: string[] }`.

Touches, by exact folder (`isExactModuleFolder`, never prefix): `l4/<mod>/**`, `l1/<mod>/**`, `l2/<mod>/**`, `l5/<mod>/**` (index ∪ host `listFolder`, via `libStor.deleteFile`); `l5/project.json` (`modules[]` plus `routeKeys` with prefix `<mod>.` in any block); `l5/config.json` (`projects.<id>.modules`, `persistenceModules`, lists/menus that name the module); `l4/organization/registry.defs.ts` (that module block; `validateSolutionRegistry` before write).

Never: `l4/organization/*` besides the registry, `l2/designSystem.ts`, `l2/project.ts`, another module (`venda` does not remove `vendaExterna`). Does not delete MDM data.

`opts.dryRun` returns the inventory without writing. A module that is nowhere → `skipped`, no throw.

Example: `{ deleted: ["l4/venda/module.defs.ts", "l1/venda/router.ts"], edited: ["l4/organization/registry.defs.ts", "l5/config.json", "l5/project.json"], skipped: [] }`.

Callers: `/rebuild all` (`startNs5Pipeline`); future `@@removeModule`.
