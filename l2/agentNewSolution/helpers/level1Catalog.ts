/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/level1Catalog.ts" enhancement="_blank"/>

import organizationLevel1Index from '/_102035_/l4/organization/ontology/index.defs.js';
import level1Animal from '/_102035_/l4/organization/ontology/Animal.defs.js';
import level1AssetEquipment from '/_102035_/l4/organization/ontology/AssetEquipment.defs.js';
import level1AssetGeneric from '/_102035_/l4/organization/ontology/AssetGeneric.defs.js';
import level1AssetProperty from '/_102035_/l4/organization/ontology/AssetProperty.defs.js';
import level1AssetVehicle from '/_102035_/l4/organization/ontology/AssetVehicle.defs.js';
import level1BankAccount from '/_102035_/l4/organization/ontology/BankAccount.defs.js';
import level1Company from '/_102035_/l4/organization/ontology/Company.defs.js';
import level1ContactChannel from '/_102035_/l4/organization/ontology/ContactChannel.defs.js';
import level1MdmDocument from '/_102035_/l4/organization/ontology/Document.defs.js';
import level1Location from '/_102035_/l4/organization/ontology/Location.defs.js';
import level1Person from '/_102035_/l4/organization/ontology/Person.defs.js';
import level1Product from '/_102035_/l4/organization/ontology/Product.defs.js';
import level1Service from '/_102035_/l4/organization/ontology/Service.defs.js';
import type {
  Ns4Level1EntityArtifact,
  Ns4Level1IndexArtifact,
} from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';

const ENTITIES: readonly Ns4Level1EntityArtifact[] = [
  level1Person, level1Company, level1Product, level1Service, level1Location, level1AssetGeneric,
  level1AssetVehicle, level1AssetProperty, level1AssetEquipment, level1Animal, level1BankAccount,
  level1MdmDocument, level1ContactChannel,
];

export function ns4Level1Catalog(): {
  index: Ns4Level1IndexArtifact;
  entities: readonly Ns4Level1EntityArtifact[];
} {
  return { index: organizationLevel1Index, entities: ENTITIES };
}

export function ns4Level1Subtypes(): readonly string[] {
  return organizationLevel1Index.subtypes;
}
