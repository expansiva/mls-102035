/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/level1Catalog.ts" enhancement="_blank"/>

import organizationLevel1Index from '/_102034_/l4/organization/ontology/index.defs.js';
import mdmPlatformCatalog from '/_102034_/l4/organization/ontology/platform.defs.js';
import level1Animal from '/_102034_/l4/organization/ontology/Animal.defs.js';
import level1AssetEquipment from '/_102034_/l4/organization/ontology/AssetEquipment.defs.js';
import level1AssetGeneric from '/_102034_/l4/organization/ontology/AssetGeneric.defs.js';
import level1AssetProperty from '/_102034_/l4/organization/ontology/AssetProperty.defs.js';
import level1AssetVehicle from '/_102034_/l4/organization/ontology/AssetVehicle.defs.js';
import level1BankAccount from '/_102034_/l4/organization/ontology/BankAccount.defs.js';
import level1Company from '/_102034_/l4/organization/ontology/Company.defs.js';
import level1ContactChannel from '/_102034_/l4/organization/ontology/ContactChannel.defs.js';
import level1MdmDocument from '/_102034_/l4/organization/ontology/Document.defs.js';
import level1Location from '/_102034_/l4/organization/ontology/Location.defs.js';
import level1Person from '/_102034_/l4/organization/ontology/Person.defs.js';
import level1Product from '/_102034_/l4/organization/ontology/Product.defs.js';
import level1Service from '/_102034_/l4/organization/ontology/Service.defs.js';
import {
  NS4_LEVEL1_SUBTYPE_VALUES,
  type MdmPlatformCatalogArtifact,
  type Ns4Level1EntityArtifact,
  type Ns4Level1IndexArtifact,
  type Ns4Level1Subtype,
} from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';

const ENTITIES: readonly Ns4Level1EntityArtifact[] = [
  level1Person, level1Company, level1Product, level1Service, level1Location, level1AssetGeneric,
  level1AssetVehicle, level1AssetProperty, level1AssetEquipment, level1Animal, level1BankAccount,
  level1MdmDocument, level1ContactChannel,
];

export function ns4Level1Catalog(): {
  index: Ns4Level1IndexArtifact;
  entities: readonly Ns4Level1EntityArtifact[];
  platform: MdmPlatformCatalogArtifact;
} {
  return { index: organizationLevel1Index, entities: ENTITIES, platform: mdmPlatformCatalog };
}

export function ns4Level1PlatformCatalog(): MdmPlatformCatalogArtifact {
  return mdmPlatformCatalog;
}

export function ns4Level1Subtypes(): readonly Ns4Level1Subtype[] {
  return organizationLevel1Index.subtypes;
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
