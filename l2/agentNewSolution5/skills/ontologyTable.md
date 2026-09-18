<!-- mls fileReference="_102035_/l2/agentNewSolution5/skills/ontologyTable.md" enhancement="_blank" -->
<!-- to be injected into the prompts of ontology30 (plan, entity, bindings) alongside skills/mdm.md; wiring = ns5_37. Generic platform knowledge,
     no business domain. Written 15/09/2026 from the hierarchical-ontology decision (Wagner + planner). -->

# How to define a table (an entity of the ontology)

An entity describes **one record as it is stored and returned**: a few indexed columns and one `details` document. This is true for a table
of the module (`moduleDatabase`) and for a master-data record of the platform (`mdm`). Describe the record, not a form.

## 1. Shape: primary fields + `details`

```
record.fields: [
  { id: 'id',      type: 'uuid',    required, derived, indexed }   // identity; never in details -- written for you
  { id: 'version', type: 'integer', required, derived }            // bumped by the engine on every write -- written for you
  { id: <column>,  …,                         indexed: true }     // ONLY what needs an index: filter, sort, uniqueness, search
  { id: 'details', type: 'object', required, fields: [ … ] }     // everything else, as a tree (JSONB)
]
```

**Rule:** a field is a column only when it needs an index; `indexed: true` says so and a column without it is refused.
If nobody filters, sorts or deduplicates by it, it goes inside `details`. `status` of a lifecycle is a column (it is filtered).
Free text, amounts that are only displayed, nested objects and lists go in `details`.

## 2. `details` is a tree — depth is free

Each field has `title`, `description`, `required`, and one of:

| form | meaning | example |
|---|---|---|
| scalar `type` | `string · text · integer · number · money · boolean · date · timestamp · uuid` with intrinsic constraints (`maxLength`, `pattern`, `min`, `max`, `precision`) | `postalCode: { type: string, pattern: '^\\d{5}-?\\d{3}$' }` |
| `type: enum` + `values[{ value, title }]` | closed domain; `value` is a stable English code, `title` in the user language | `titular: { values: [{ self, 'O próprio' }, { dependent, 'Dependente' }] }` |
| `type: object` + `fields` | nested object, inline; nest as deep as the business needs | `convenio: { type: object, fields: { operadora, numeroCarteira, validade } }` |
| `type: object` + `of: <ValueType>` | reuse a platform value type (`Address`, `GeoPoint`, `PrivacyConsent`); list its sub-fields you use | `addresses: { type: object, of: Address, collection: true, fields: {…} }` |
| `type: record` + `to: [<Entity|Subtype>]` | reference to another record (its uuid / mdmId); the link itself is a relationship | `operadora: { type: record, to: [Company] }` |
| `collection: true` on any of the above | an array of that type — an **embedded table** when the type is `object` | items of an order, addresses of a person |

Constraints of the type live on the field. Business policy ("max 12 installments") is a rule, cited by id. A value that varies per record is a field.

## 3. Who writes each field

The engine writes `id`, `version`, the status of a master record, `tags`, `relationshipRefs` and the derived contact list; a form never
offers them and you never declare them. On a platform branch the whole structure -- type, `derived`, `indexed`, `unique`, `collection`,
`of` -- is the platform's and is filled in for you: you say which fields you keep, how you tighten them, and what they mean here.

## 4. A master-data record (MDM) — copy from the platform, then customize

A person, company, product, place, asset, animal, bank account, document or contact channel is **never a table of the module**. The module
declares a **role** over the platform subtype (`kind: role`, `subtype: Person`, tag `<module>.<Entity>`) and describes the record the way
the platform stores and returns it:

```
record.fields: [
  { id: 'id' }, { id: 'version' },                 // written for you
  { id: 'details', type: 'object', fields: [
    // identification — index columns of the platform (kept, tightened): name, docType, docId, countryCode, status, tags
    // base — platform document: aliases, addresses (of Address), contacts (derived list of ContactChannel refs), relationshipRefs (derived)
    // <subtype> — platform document: birthDate, gender, privacyConsent (of PrivacyConsent) …
    { id: 'general', type: 'object' },             // promoted by the organization; you read it, you do not declare it
    { id: '<moduleId>', type: 'object', fields: [ … ] },  // THE MODULE NAMESPACE — one key, only this module writes it
  ] },
]
```

- **Copy and customize.** Start from the `## Starting point` the prompt hands you — the platform record of the subtype, read from
  `/_102034_/l4/ontology/mdm.defs.ts` — keep the fields this role uses, drop the rest, and **tighten** only: `required` false→true,
  `values` subset, stricter `pattern`. Never loosen, never rename, never invent a field in a platform layer. Keep the five branches even
  when one of them ends up empty.
- **The namespace `details.<moduleId>`** is the only place the module writes something of its own about the record. It is a
  `Record<moduleId, object>` inside the same document: each module has one key, only that module changes it, other modules see the key name
  and never the content (`MDM_FOREIGN_NAMESPACE`). It is a tree like any `details`. **Never** put identity, document, contact, login or a copy
  of a platform field there, and never a field that fakes a platform service (a photo, a receipt, an attachment, a link to a file, a phone).
  It carries what the request or the journeys asked for about the record, and nothing else; when nothing was asked for it stays **empty**,
  which is the right answer and not a gap to fill.
- **`general`** holds fields the organization promoted because two modules needed them. You read it; you do not declare it here.
- **Contacts are records, not fields.** A phone, WhatsApp or e-mail is a `ContactChannel` linked by `HasContact`; the person's document carries
  only the derived reference list. Declare the link in `relationships`, and the capability `vincular.contato` — never a `phone` field.
- **Kinship and function are the `role` of the relationship** (`Family` role spouse|child|parent, `GuardianOf` role parent|guardian). Declare
  allowed roles on the relationship; never a `parentName` field.

## 5. Relationships (in the same file for reading; the index keeps the canonical list)

`relationships: { <name>: { to, via, cardinality, required, title, description, roles?, compactKey? } }`

- `via: <CatalogType>` (HasContact, GuardianOf, Family, Employs, CustomerOf…) for master ↔ master: the platform versions it (`validFrom/validTo`),
  keeps `role`, and derives the compact key (`relationshipRefs.<key>`). Never copy the compact keys.
- `via: <Table>.<fk>` for a module table pointing at this record (`Consulta.pacienteId`).
- `via: <Table>` + `path` for a derived N:N through a table ("professionals who attended me" through `Consulta`).
- A child that has no lifecycle of its own and is referenced by nobody else is an **embedded collection** inside the parent's `details`, not a
  table (`composition`). A child with its own lifecycle, or referenced from outside, is a table.

## 6. Capabilities — what can be done with this record

`capabilities` — one line per action, readable by a person and by the model, in three parts:
**what it does · how (key, index, route) · who uses it**. The platform status comes from the catalog and is not repeated.

Choose the ids from the catalog of the entity's **family**, which the starting point of the prompt carries whole, and add the module's own with
the prefix `<moduleName>.`:

- `mdm` (a role over a master record): locate by name / by document / by contact, create-or-attach, capture as prospect, edit, inactivate, merge,
  link/unlink, list links, attach a document, comment, tag, next sequence number, status history, audit, invite to login;
- `tdm` (a table of this module): read by id, locate by column, locate by text, count, list by foreign key, create, update, delete, transition,
  unique key, transaction, read the master record a column points at — plus what the platform lends a table: next sequence number, attach a
  document, comment, tag, status history, audit;
- `ddm` (a summary): aggregate by window, store as a time series, read a window, refresh, rebuild, resample, retain.

An id of another family is refused: a table does not "locate by document", and a master record does not "create". The platform status comes from
the catalog; do not guess it. A capability the module needs and the platform lacks is
declared with `platform: missing` — never replaced by a field that fakes it (no `photoUrl: json` when attachments exist).

## 7. Rules and triggers

`rules: [<ruleId>…]` — ids only; the text and `enforcedBy` (engine | module | screen) live in `rules.defs.ts`. Engine rules come from the
platform catalog (unique document, LGPD consent, foreign namespace). Module rules are yours (minor needs a guardian, inactive cannot book).
`triggers: { <name>: { when, then[], ruleRefs?, enforcedBy } }` — what happens on its own (on create: attach role, next number, audit, event).

## 8. What you write vs what is derived

You write: the `details` tree (which platform fields you keep and how you tighten them; your namespace), the columns of a table and its
`details`, the links you read with their cardinality, the capabilities you offer and to whom, and the rule ids you obey.
Derived (never write): `id`, `version`, the structure and flags of platform fields, `tags`, `relationshipRefs`, `contacts`, compact keys,
`via`/`path` of a link, platform status of capabilities, `roleTag`, `source`, `storage`.

### What nobody writes

A value that follows from the row itself, or from the rows linked to it, is declared once as a derived field and computed when the row is
read — never stored, never a state of the lifecycle, never a value of `status`. One line per condition, in the user language: `vencida: em
aberto e com vencimento anterior a hoje`. A value recalculated over many rows by time window and group is a `ddm` entity instead.
