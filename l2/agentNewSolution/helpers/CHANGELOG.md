# NS4 helpers

## 2026-09-15

- ns5_43 T6: `level1Catalog.ts` derives the level-1 catalog from
  `/_102034_/l4/ontology/mdm.defs.ts` (plus `platform.defs.ts` beside it) instead of
  importing the fifteen emitted `l4/organization/ontology/*.defs.ts`, which are deleted.
  `formatNs4Level1CatalogPrompt` is unchanged and its output is frozen line by line in
  `level1Catalog.test.ts`; the only movement against the emitted catalog is the order of
  the subtype branch inside `baseFields` for Company, Service, AssetProperty and
  BankAccount (same set). `level1FromEngine.test.ts` went with the parser it tested.

## 2026-09-12

- Solution registry module block stores `entities[{ entityId, kind, mdmSubtype? }]` and
  outbound `events[{ eventId, on }]`. `generalFields` stays.

## 2026-09-11

- Level-1 catalog is read from `/_102034_/l4/organization/ontology/*`. The parser
  and `nodejsLevel1FromEngine` left this project. `formatNs4Level1CatalogPrompt`
  appends `formatPlatformCatalogPrompt` (services use-for/not-for and role rules
  derived from `platform.defs.ts`).
