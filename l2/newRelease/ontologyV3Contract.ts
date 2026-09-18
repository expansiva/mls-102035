/// <mls fileReference="_102035_/l2/newRelease/ontologyV3Contract.ts" enhancement="_blank" />

/** Browser-safe discriminator. Kept separate from solution/types because that barrel re-exports l1 contracts. */
export const NEW_RELEASE_ONTOLOGY_V3_SCHEMA_VERSION = '2026-09-15-ns5-ontology-v3' as const;
/** ns5_47: v3.1 dropped `time` from `reachedBy`/`by` and gave the row its own `derived` fields. */
export const NEW_RELEASE_ONTOLOGY_V31_SCHEMA_VERSION = '2026-09-17-ns5-ontology-v3.1' as const;

/**
 * Both versions are the same form to a reader — v3.1 only removed ways of saying something — so the
 * screen accepts an artifact recorded in either. Mirrors `isNs5OntologyV3Version` of `solution/types`,
 * which cannot be imported here.
 */
export function isNewReleaseOntologyV3Version(value: unknown): boolean {
  return value === NEW_RELEASE_ONTOLOGY_V3_SCHEMA_VERSION
    || value === NEW_RELEASE_ONTOLOGY_V31_SCHEMA_VERSION;
}
