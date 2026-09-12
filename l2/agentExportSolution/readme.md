# agentExportSolution

Deterministic packager of one or more l4 modules into a portable `solution.zip`, plus one LLM call
for the catalog description. No checkpoint. Does not import, translate, or touch CB/CF.

## Command

```
@@exportSolution <module> [<module>…]
```

Writes `l4/organization/solution.zip` and `l4/organization/solution.json` (the manifest).

## Package

```
solution.json
l4/<module>/**          (no pipeline/)
i18n/<module>/<lang>.json
```

- Headers `_<projectId>_/l4/` become `_{project}_/l4/`. Platform type imports (`/_102035_/l2/…`) stay.
- Recomputable `*Hash` fields are omitted (the importer recomputes them).
- Human prose is copied to `i18n` using `textPaths` declared per `schemaVersion` on the NS contracts.
  Any user-language string outside those paths is a coverage failure (`textPathsCoverage.test.ts`).

## Catalog description

One `general` LLM call (`promptCatalog.md`) fills `catalog.description` (what the solution is, who it
is for). Everything else is mechanical.

## textPaths

Declared next to each E1–E8 / E4B / E9 contract as `TEXT_PATHS_<schemaVersion>`. They are metadata,
not a field on the artifact. Registry: `agentNewSolution/helpers/ns4TextPaths.ts`.
