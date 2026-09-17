/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/level1Catalog.test.ts" enhancement="_blank"/>

/**
 * The level-1 catalog is now DERIVED from `/_102034_/l4/ontology/mdm.defs.ts` (ns5_43 T6). Two things
 * have to stay true, and neither is checked by the compiler:
 *
 *  1. The prompt e4/e4b/e10 read (`formatNs4Level1CatalogPrompt`) is FROZEN text. It is asserted here
 *     line by line, as measured against the fifteen generated defs the adapter replaced: the subtype
 *     order, the identification list, the base-field list of each of the thirteen subtypes, the
 *     relationship lines, the statuses and the doc types. The only difference from the pre-ns5_43
 *     prompt is the order WITHIN the subtype branch of four subtypes (Company, Service, AssetProperty,
 *     BankAccount), which is now `mdm.defs.ts`'s order instead of `defs/ontology.ts`'s; the SET is the
 *     same in all thirteen. Recorded in the ns5_43 return.
 *  2. Nothing of `mdm.defs.ts` is silently dropped. The adapter picks by id lists (see the header of
 *     `level1Catalog.ts` for why), so a field added to the platform base or to a subtype has to show up
 *     in `baseFields`, and a subtype added to the platform has to show up in `subtypes`.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import mdm from '/_102034_/l4/ontology/mdm.defs.js';
import mdmPlatformCatalog from '/_102034_/l4/ontology/platform.defs.js';
import {
  NS4_LEVEL1_IDENTIFICATION_FIELD_IDS,
  NS4_LEVEL1_LEADING_BASE_FIELD_IDS,
  NS4_LEVEL1_TRAILING_BASE_FIELD_IDS,
  NS4_LEVEL1_BASE_FIELD_IDS_HIDDEN,
  ns4Level1Catalog,
  ns4Level1Entity,
  ns4Level1FieldIds,
  ns4Level1FieldSlot,
  ns4Level1PlatformCatalog,
  ns4Level1Subtypes,
} from '/_102035_/l2/agentNewSolution/helpers/level1Catalog.js';
import { formatNs4Level1CatalogPrompt } from '/_102035_/l2/agentNewSolution/helpers/organizationContext.js';

const NS4_LEVEL1_CATALOG_PROMPT_LINES = [
  "## Platform level-1 catalog (placeholders — not module entities)",
  "Subtypes: <Person>, <Company>, <Product>, <Service>, <Location>, <AssetGeneric>, <AssetVehicle>, <AssetProperty>, <AssetEquipment>, <Animal>, <BankAccount>, <Document>, <ContactChannel>",
  "Identification fields (every subtype): <name>, <docType>, <docId>, <countryCode>, <tags>",
  "<Person> base fields: <aliases>, <contacts>, <addresses>, <relationshipRefs>, <birthDate>, <gender>, <nationality>, <occupation>, <photoUrl>, <privacyConsent>, <notes>",
  "<Company> base fields: <aliases>, <contacts>, <addresses>, <relationshipRefs>, <companyKind>, <legalName>, <tradeName>, <legalType>, <parentCompanyId>, <externalCode>, <foundingDate>, <taxRegime>, <industryCode>, <website>, <notes>",
  "<Product> base fields: <aliases>, <contacts>, <addresses>, <relationshipRefs>, <sku>, <productType>, <category>, <brand>, <unitOfMeasure>, <isInventoried>, <notes>",
  "<Service> base fields: <aliases>, <contacts>, <addresses>, <relationshipRefs>, <serviceCode>, <serviceKind>, <serviceType>, <parentServiceId>, <durationMinutes>, <deliveryMode>, <notes>",
  "<Location> base fields: <aliases>, <contacts>, <addresses>, <relationshipRefs>, <locationType>, <locationCode>, <parentLocationId>, <capacity>, <propertyAddress>, <notes>",
  "<AssetGeneric> base fields: <aliases>, <contacts>, <addresses>, <relationshipRefs>, <assetCategory>, <serialNumber>, <manufacturer>, <model>, <notes>",
  "<AssetVehicle> base fields: <aliases>, <contacts>, <addresses>, <relationshipRefs>, <plate>, <vin>, <brand>, <model>, <year>, <color>, <fuelType>, <notes>",
  "<AssetProperty> base fields: <aliases>, <contacts>, <addresses>, <relationshipRefs>, <registrationNumber>, <propertyAddress>, <propertyType>, <areaSqft>, <areaM2>, <taxParcelId>, <notes>",
  "<AssetEquipment> base fields: <aliases>, <contacts>, <addresses>, <relationshipRefs>, <serialNumber>, <brand>, <model>, <category>, <acquisitionDate>, <notes>",
  "<Animal> base fields: <aliases>, <contacts>, <addresses>, <relationshipRefs>, <species>, <breed>, <birthDate>, <sex>, <color>, <microchip>, <registrationNumber>, <isNeutered>, <notes>",
  "<BankAccount> base fields: <aliases>, <contacts>, <addresses>, <relationshipRefs>, <bankName>, <bankRoutingNumber>, <accountNumber>, <accountType>, <swift>, <iban>, <pixKey>, <pixKeyType>, <isVerified>, <notes>",
  "<Document> base fields: <aliases>, <contacts>, <addresses>, <relationshipRefs>, <originModule>, <docCategory>, <storageBucket>, <storagePath>, <fileName>, <mimeType>, <fileSizeKb>, <issuedAt>, <expiresAt>, <issuer>, <notes>",
  "<ContactChannel> base fields: <aliases>, <contacts>, <addresses>, <relationshipRefs>, <contactType>, <value>, <isVerified>, <verifiedAt>, <notes>",
  "Relationship types:",
  "- <Owns> from <Person>|<Company> to <AssetGeneric>|<AssetVehicle>|<AssetProperty>|<AssetEquipment>",
  "- <Employs> from <Company> to <Person>",
  "- <OffersProduct> from <Company> to <Product>",
  "- <OffersService> from <Company>|<Person> to <Service>",
  "- <StocksAt> from <Product>|<AssetEquipment> to <Location>",
  "- <Teaches> from <Person> to <Service>",
  "- <HappensAt> from <Service> to <Location>",
  "- <FranchiseOf> from <Company> to <Company>",
  "- <BelongsToGroup> from <Company> to <Company>",
  "- <PartOfUnit> from <Company> to <Company>",
  "- <ManagedBy> from <Person> to <Company>|<Service>",
  "- <ReportsTo> from <Person> to <Person>",
  "- <AssignedTo> from <Person> to <Company>|<Service>",
  "- <Attends> from <Person> to <Service>",
  "- <SuppliesProduct> from <Company> to <Product>",
  "- <PartnersWith> from <Person> to <Company>",
  "- <Family> from <Person> to <Person>",
  "- <GuardianOf> from <Person> to <Person>|<Animal>",
  "- <CustomerOf> from <Person>|<Company> to <Company>",
  "- <SupplierOf> from <Company> to <Company>",
  "- <MemberOf> from <Person> to <Company>",
  "- <HoldsAccount> from <Person>|<Company> to <BankAccount>",
  "- <SubsidiaryOf> from <Company> to <Company>",
  "- <LocatedAt> from <Person>|<Company> to <AssetProperty>",
  "- <Signed> from <Person>|<Company> to <Document>",
  "- <HasContact> from <Person>|<Company>|<Product>|<Service>|<Location>|<AssetGeneric>|<AssetVehicle>|<AssetProperty>|<AssetEquipment>|<Animal>|<BankAccount>|<Document>|<ContactChannel> to <ContactChannel>",
  "Statuses: <Active>, <Inactive>, <Merged>, <Blocked>",
  "Doc types: <SSN>, <EIN>, <Passport>, <DriversLicense>, <NationalId>, <CPF>, <CNPJ>, <VAT>, <Other>",
];

test('the NS4 level-1 prompt is the frozen text the fifteen generated defs produced', () => {
  const catalog = ns4Level1Catalog();
  const actual = formatNs4Level1CatalogPrompt({ index: catalog.index, entities: catalog.entities }).split('\n');
  assert.deepEqual(actual, NS4_LEVEL1_CATALOG_PROMPT_LINES);
});

test('the prompt with the platform block is the structure plus the platform catalog', () => {
  const catalog = ns4Level1Catalog();
  const structure = formatNs4Level1CatalogPrompt({ index: catalog.index, entities: catalog.entities });
  const full = formatNs4Level1CatalogPrompt(catalog);
  assert.ok(full.startsWith(`${structure}\n`));
  assert.equal(ns4Level1PlatformCatalog(), mdmPlatformCatalog);
  assert.equal(catalog.platform.catalogVersion, '2026-09-11-mdm-platform-v1');
});

test('the subtype set is exactly the one mdm.defs.ts declares, in both places it declares it', () => {
  const subtypes = [...ns4Level1Subtypes()].sort();
  assert.deepEqual(subtypes, Object.keys(mdm.subtypes).sort());
  assert.deepEqual(subtypes, [...mdm.groups.identification.fields.subtype.values].sort());
  assert.deepEqual(ns4Level1Catalog().entities.map(entity => entity.subtype), [...ns4Level1Subtypes()]);
});

test('no platform base field is silently dropped by the adapter', () => {
  const shown = [
    ...NS4_LEVEL1_LEADING_BASE_FIELD_IDS,
    ...NS4_LEVEL1_TRAILING_BASE_FIELD_IDS,
    ...NS4_LEVEL1_BASE_FIELD_IDS_HIDDEN,
  ].sort();
  assert.deepEqual(shown, Object.keys(mdm.groups.base.fields).sort());
});

test('every identification id the adapter picks still exists in mdm.defs.ts', () => {
  for (const fieldId of NS4_LEVEL1_IDENTIFICATION_FIELD_IDS) {
    assert.ok(fieldId in mdm.groups.identification.fields, `identification.${fieldId} is gone`);
  }
});

test('each subtype carries its own branch, whole, between the shared base fields and notes', () => {
  for (const subtype of ns4Level1Subtypes()) {
    const entity = ns4Level1Entity(subtype);
    assert.ok(entity, subtype);
    const ids = entity.baseFields.map(field => field.fieldId);
    assert.deepEqual(ids, [
      ...NS4_LEVEL1_LEADING_BASE_FIELD_IDS,
      ...Object.keys(mdm.subtypes[subtype].fields),
      ...NS4_LEVEL1_TRAILING_BASE_FIELD_IDS,
    ]);
  }
});

test('the relationship catalog of the index is mdm.defs.ts relationships, in order', () => {
  assert.deepEqual(
    ns4Level1Catalog().index.relationshipTypes.map(rel => [rel.type, [...rel.from], [...rel.to], rel.bidirectional]),
    mdm.relationships.map(rel => [rel.type, [...rel.from], [...rel.to], rel.bidirectional]),
  );
  assert.deepEqual([...ns4Level1Catalog().index.docTypes], [...mdm.docTypes]);
  assert.deepEqual([...ns4Level1Catalog().index.mdmStatuses], [...mdm.statuses]);
});

test('Person keeps the relationship view and the compact keys the emitter used to write', () => {
  const person = ns4Level1Entity('Person');
  const guardian = person?.allowedRelationships.find(item => item.type === 'GuardianOf');
  assert.equal(guardian?.as, 'both');
  assert.deepEqual(guardian?.otherSubtypes, ['Person', 'Animal']);
  assert.equal(person?.allowedRelationships.find(item => item.type === 'Employs')?.as, 'to');
  assert.deepEqual([...(person?.compactRelationshipKeys ?? [])], [
    'ownedAssets', 'employers', 'offeredServices', 'taughtServices', 'managedOrganizations',
    'reportManagers', 'reports', 'assignments', 'attendedServices', 'partners', 'family', 'pets',
    'guardians', 'suppliers', 'memberships', 'bankAccounts', 'locations', 'documents', 'contacts',
  ]);
});

test('the lookups the gate uses answer by id, whichever slot the field sits in', () => {
  assert.equal(ns4Level1FieldSlot('Person', 'name'), 'identification');
  assert.equal(ns4Level1FieldSlot('Person', 'birthDate'), 'base');
  assert.equal(ns4Level1FieldSlot('Person', 'plate'), undefined);
  assert.equal(ns4Level1FieldSlot('Nope', 'name'), undefined);
  assert.ok(ns4Level1FieldIds('BankAccount').has('iban'));
  assert.ok(ns4Level1FieldIds('BankAccount').has('tags'));
  assert.equal(ns4Level1FieldIds('Nope').size, 0);
});
