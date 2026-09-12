# NS4 helpers

## 2026-09-12

- Solution registry module block stores `entities[{ entityId, kind, mdmSubtype? }]` and
  outbound `events[{ eventId, on }]`. `generalFields` stays.

## 2026-09-11

- Level-1 catalog is read from `/_102034_/l4/organization/ontology/*`. The parser
  and `nodejsLevel1FromEngine` left this project. `formatNs4Level1CatalogPrompt`
  appends `formatPlatformCatalogPrompt` (services use-for/not-for and role rules
  derived from `platform.defs.ts`).
