/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/level1Catalog.ts" enhancement="_blank"/>

/**
 * The level-1 catalog the NS4 readers (e4/e4b/e10) see, derived from the ONE platform ontology
 * (`/_102034_/l4/ontology/mdm.defs.ts`) instead of from a generated copy of it (ns5_43 T6).
 *
 * WHAT CHANGED. Until ns5_43 this file imported fifteen `l4/organization/ontology/*.defs.ts` written by
 * `l1/mdm/scripts/emitLevel1Defs.ts`, which scraped the engine's TypeScript (`defs/ontology.ts`,
 * `module.ts`, `mdmSupport.ts`) with regexes. That was a second source of the same truth: the ontology was
 * stated twice, and only a script nobody ran kept the two aligned. Now `mdm.defs.ts` states it once and
 * this adapter shapes it into `Ns4Level1EntityArtifact`, which is a READING form, not a source.
 *
 * WHAT IS NOT DERIVABLE, and therefore stays written here:
 *   - WHICH identification fields a module author is shown. `groups.identification.fields` has ten keys;
 *     the catalog has always shown five. It is not "the indexed ones" (`storage.indexedColumns` has
 *     `subtype`/`status`/`createdAt`/`updatedAt` and lacks `tags`) nor "the non-derived ones" (`tags` is
 *     `derived`). It is an editorial pick — so it is a list, and `level1Catalog.test.ts` checks every id
 *     in it still exists in `mdm.defs.ts`.
 *   - THE ORDER of `baseFields`: the four shared scalars, then the subtype branch, then `notes`. That is
 *     the order the NS4 prompt has carried since ns5_14 and it is kept so the prompt does not move under
 *     the frozen readers. The SET is checked against `groups.base.fields` minus `moduleTypes`, so a field
 *     added to the platform base is a red test and not a silent omission.
 *   - THE ORDER of the subtypes: `NS4_LEVEL1_SUBTYPE_VALUES`, which is also the type `Ns4Level1Subtype`.
 *     Its SET is checked against `mdm.subtypes` and against `identification.subtype.values`.
 *
 * `Ns4Level1Field.type` is now the platform's own notation (`string`, `enum`, `Address`, `string[]`)
 * rather than the engine's TypeScript text (`'Male' | 'Female' | …`). No reader consumes it: the prompt
 * prints field ids only, and `ns4Level1FieldIds`/`ns4Level1FieldSlot` answer by id.
 */

import mdm from '/_102034_/l4/ontology/mdm.defs.js';
import mdmPlatformCatalog from '/_102034_/l4/ontology/platform.defs.js';
import type { MdmDefField, MdmDefFields } from '/_102034_/l1/mdm/defs/ontologyTypes.js';
import {
  NS4_LEVEL1_SCHEMA_VERSION,
  NS4_LEVEL1_SUBTYPE_VALUES,
  type MdmPlatformCatalogArtifact,
  type Ns4Level1AllowedRelationship,
  type Ns4Level1EntityArtifact,
  type Ns4Level1Field,
  type Ns4Level1IndexArtifact,
  type Ns4Level1RelationshipRef,
  type Ns4Level1Subtype,
} from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';

/** Identification fields shown to a module author, in prompt order. See the header for why it is a list. */
export const NS4_LEVEL1_IDENTIFICATION_FIELD_IDS = [
  'name', 'docType', 'docId', 'countryCode', 'tags',
] as const;

/** Platform base fields printed BEFORE the subtype branch. */
export const NS4_LEVEL1_LEADING_BASE_FIELD_IDS = [
  'aliases', 'contacts', 'addresses', 'relationshipRefs',
] as const;

/** Platform base fields printed AFTER the subtype branch. */
export const NS4_LEVEL1_TRAILING_BASE_FIELD_IDS = ['notes'] as const;

/** Engine bookkeeping that duplicates `identification.tags`; never shown (`mdm.defs.ts` base.moduleTypes). */
export const NS4_LEVEL1_BASE_FIELD_IDS_HIDDEN = ['moduleTypes'] as const;

const IDENTIFICATION_FIELDS: readonly Ns4Level1Field[] =
  pickFields(mdm.groups.identification.fields, NS4_LEVEL1_IDENTIFICATION_FIELD_IDS);

const LEADING_BASE_FIELDS: readonly Ns4Level1Field[] =
  pickFields(mdm.groups.base.fields, NS4_LEVEL1_LEADING_BASE_FIELD_IDS);

const TRAILING_BASE_FIELDS: readonly Ns4Level1Field[] =
  pickFields(mdm.groups.base.fields, NS4_LEVEL1_TRAILING_BASE_FIELD_IDS);

const RELATIONSHIP_TYPES: readonly Ns4Level1RelationshipRef[] = mdm.relationships.map(entry => ({
  type: entry.type,
  from: [...entry.from],
  to: [...entry.to],
  bidirectional: entry.bidirectional,
}));

const INDEX: Ns4Level1IndexArtifact = {
  schemaVersion: NS4_LEVEL1_SCHEMA_VERSION,
  level1SchemaVersion: NS4_LEVEL1_SCHEMA_VERSION,
  subtypes: NS4_LEVEL1_SUBTYPE_VALUES,
  docTypes: mdm.docTypes,
  mdmStatuses: mdm.statuses,
  relationshipTypes: RELATIONSHIP_TYPES,
};

const ENTITIES: readonly Ns4Level1EntityArtifact[] = NS4_LEVEL1_SUBTYPE_VALUES.map(subtype => {
  const allowedRelationships = allowedForSubtype(subtype);
  return {
    schemaVersion: NS4_LEVEL1_SCHEMA_VERSION,
    subtype,
    identification: IDENTIFICATION_FIELDS,
    baseFields: [
      ...LEADING_BASE_FIELDS,
      ...toFields(mdm.subtypes[subtype].fields),
      ...TRAILING_BASE_FIELDS,
    ],
    allowedRelationships,
    compactRelationshipKeys: compactKeysForSubtype(allowedRelationships),
  } satisfies Ns4Level1EntityArtifact;
});

export function ns4Level1Catalog(): {
  index: Ns4Level1IndexArtifact;
  entities: readonly Ns4Level1EntityArtifact[];
  platform: MdmPlatformCatalogArtifact;
} {
  return { index: INDEX, entities: ENTITIES, platform: mdmPlatformCatalog };
}

export function ns4Level1PlatformCatalog(): MdmPlatformCatalogArtifact {
  return mdmPlatformCatalog;
}

export function ns4Level1Subtypes(): readonly Ns4Level1Subtype[] {
  return INDEX.subtypes;
}

export function ns4Level1IsSubtype(value: string): value is Ns4Level1Subtype {
  return (NS4_LEVEL1_SUBTYPE_VALUES as readonly string[]).includes(value);
}

export function ns4Level1Entity(subtype: string): Ns4Level1EntityArtifact | undefined {
  return ENTITIES.find(entity => entity.subtype === subtype);
}

/** Identification ∪ base field ids of a level-1 subtype. Empty when the subtype is unknown. */
export function ns4Level1FieldIds(subtype: string): ReadonlySet<string> {
  const entity = ns4Level1Entity(subtype);
  if (!entity) return new Set();
  return new Set([
    ...entity.identification.map(field => field.fieldId),
    ...entity.baseFields.map(field => field.fieldId),
  ]);
}

export function ns4Level1FieldSlot(subtype: string, fieldId: string): 'identification' | 'base' | undefined {
  const entity = ns4Level1Entity(subtype);
  if (!entity) return undefined;
  if (entity.identification.some(field => field.fieldId === fieldId)) return 'identification';
  if (entity.baseFields.some(field => field.fieldId === fieldId)) return 'base';
  return undefined;
}

/** `Address`, `string[]`, `enum`, `record` — the platform's own notation, not the engine's TypeScript. */
function fieldType(field: MdmDefField): string {
  const base = field.of ?? field.type;
  return field.collection ? `${base}[]` : base;
}

function toFields(fields: MdmDefFields): Ns4Level1Field[] {
  return Object.entries(fields).map(([fieldId, field]) => ({
    fieldId,
    type: fieldType(field),
    required: field.required === true,
  }));
}

function pickFields(fields: MdmDefFields, ids: readonly string[]): Ns4Level1Field[] {
  return ids.map(fieldId => {
    const field = fields[fieldId];
    if (!field) throw new Error(`[level1Catalog] mdm.defs.ts no longer declares ${fieldId}`);
    return { fieldId, type: fieldType(field), required: field.required === true };
  });
}

function allowedForSubtype(subtype: string): Ns4Level1AllowedRelationship[] {
  const allowed: Ns4Level1AllowedRelationship[] = [];
  for (const entry of mdm.relationships) {
    const isFrom = (entry.from as readonly string[]).includes(subtype);
    const isTo = (entry.to as readonly string[]).includes(subtype);
    if (!isFrom && !isTo) continue;
    const as = isFrom && isTo ? 'both' : isFrom ? 'from' : 'to';
    const otherSubtypes = as === 'from' ? [...entry.to]
      : as === 'to' ? [...entry.from]
      : unique([...entry.from, ...entry.to]);
    allowed.push({ type: entry.type, as, otherSubtypes });
  }
  return allowed;
}

function compactKeysForSubtype(allowed: readonly Ns4Level1AllowedRelationship[]): string[] {
  const keys: string[] = [];
  for (const rel of allowed) {
    const entry = mdm.relationships.find(item => item.type === rel.type);
    if (!entry) continue;
    if (rel.as === 'from' || rel.as === 'both') keys.push(...entry.compactKeys.from);
    if (rel.as === 'to' || rel.as === 'both') keys.push(...entry.compactKeys.to);
  }
  return unique(keys);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
