<!-- mls fileReference="_102035_/l2/agentNewSolution5/skills/mdm.md" enhancement="_blank" -->
<!-- injected into the prompts of module10, journeys20, ontology30 and access60 (readAgentText('skills', 'mdm', '.md')); generic platform knowledge, no business domain -->

# MDM — how the platform keeps people, companies, products and places

The organization has ONE master data store (MDM). A module never owns a person, a company, a product, a
place or an asset: it declares a **role** over a level-1 record and keeps only what is specific to the
module in its own namespace. This is what makes the same customer appear in every module as one record.

## The record

Every MDM record has four layers. Only the last one belongs to a module.

| layer | who writes | what it holds |
|---|---|---|
| identification | organization | `subtype` (level-1 catalog), `name`, `docType` + `docId`, `countryCode`, `tags` |
| base | organization | typed fields of the subtype (`contacts[]`, `addresses[]`, `birthDate`, `legalName`, `sku`…), `relationshipRefs` |
| general | organization, by promotion | fields that more than one module needed and the platform promoted |
| `details[<moduleId>]` | **the module** | the module's namespace: only what nobody else needs |

A module reads identification + base + general + its own namespace. Other modules' namespaces are visible
only by name. A module never redeclares a level-1 field (name, document, contacts, addresses) in its
namespace, and never stores a login or an identity there.

## Identity and login

A person who signs in is one MDM record. Her login is an **index row**, not a field: the tag table
(`mdm_tag`) holds many rows per record — `{ entityType: 'MdmEntity', entityId: <mdmId>, namespace: 'login',
tag: <login e-mail>, module: 'organization' }` — and is indexed by `(entityType, tag, module)`, so login
resolves in one indexed lookup. One login e-mail belongs to exactly one record; one record may carry other
identifiers the same way (an external system id, a badge number), each in its own namespace.

The record's `docType` + `docId` stay for the **national document** (`CPF`, `CNPJ`, `SSN`…), unique among
permanent records, which is what deduplication uses. A person can therefore have both a login and a
document, and a record that never signs in has no login row.

The JWT says **who** (login e-mail) and **what she may do** (authorities `<moduleId>:<actorId>`). The MDM
says **where she exists**: the role tags `<moduleId>.<EntityId>` on her record list every module she takes
part in, and `details[<moduleId>]` holds that module's data about her. The platform resolves the session
person (`sessionContext.person`); a module never does. Nothing about permissions is stored in the MDM;
nothing about identity is stored in a module table.

Registering a person who will sign in is an `act` of an internal actor on that person entity (or a
public self-registration entry). The platform does the rest: looks the e-mail up in the login index
and the document in the record, attaches the role when it is the same person, refuses when the
e-mail belongs to another record, and issues the invitation. A journey never has an 'invite' or
'verify e-mail' step.

## Roles

`kind: mdm` in the ontology means "a role of this module over a level-1 subtype". Declare:
- `mdmSubtype` from the level-1 catalog (`Person`, `Company`, `Product`, `Service`, `Location`, `AssetEquipment`…);
- `fields[]` with **namespace fields only** — the identity field (`storage.idField`) is the MDM id and stays
  **outside** `fields[]`; `displayField` is a level-1 field (`name`) or a namespace field;
- no `lifecycleStates`, no `transitions`: a master record has no business state; its activity is the
  MDM status (active / inactive), and what happens to it is recorded by the module's own entities;
- `storage.target: 'mdm'`, `scope: 'organization'`, `mdmType: '<moduleId>.<EntityId>'`.

Creating a role is **create-or-attach**: the engine looks the record up by document (or contact), creates
it only when absent, then attaches the role tag and writes the namespace. A role is never deleted; it is
inactivated and can be reactivated.

Actors are not roles. A receptionist or a manager is an actor (someone who acts) and a profile (a set of
authorities); she becomes an MDM entity only when the business needs to record something **about** her
(an employee file, a commission). Do not create a `Person` entity per actor.

## Relationships

Relationships between records are typed, versioned and live in the MDM (`link` / `unlink`), from the
level-1 catalog: `Family`, `GuardianOf`, `CustomerOf`, `SupplierOf`, `Employs`, `MemberOf`, `Owns`,
`LocatedAt`, `HasContact`… One person may be guardian of many, customer of many, member of many. Compact
keys (`family`, `guardians`, `customers`…) are kept on the record for fast reads.

A module uses these instead of inventing a join entity when the fact is about two master records
("this person is responsible for that person"). A module invents an entity only for a **business event
or transaction** of its own (an enrollment, an order, a payment).

## Ownership and scope

Who may see a record is decided by the access matrix, and enforced by the backend as a path:
- `own`: the entity reaches, through its foreign keys, the `Person` whose login row is the session login;
- `related`: the same path, then one MDM relationship (`GuardianOf`, `Family`…) to the login person;
- `organization`: no path; every record of the organization.
A journey step that reads "my orders" or "my students" is therefore a `dataScope`, never a filter field
the user types.

## Computed values

Values derived from other data (a total, a balance, a due situation) are not fields and not entities:
they are `details: { <name>: { type, description } }` on the entity that owns them (or on the module,
for organization-wide aggregates). The backend computes them; a rule may cite them.

## What the MDM already answers (do not model it in the module)

Deduplication by document, contact channels, addresses, aliases, tags (`mdm_tag`, many rows per record),
relationships, status history, attachments (photos, files), comments (notes), **audit** (every master-data
write is logged and readable through the platform `audit` module — never create an audit, log or history entity),
prospects with promotion, number sequences, and the `general` layer. The machine-readable list is the platform
catalog (`platform.defs.ts`, emitted with the level-1 defs). If the request needs one
of these for a person, company, product or place, it is level-1 base data — reference it, do not redeclare it.
