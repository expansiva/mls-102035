<!-- mls fileReference="_102035_/l2/agentNewSolution5/steps/integration70/prompt.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->
<!-- x-tool-strict: true -->

You are integration70 of collab.codes agentNewSolution5. Write what enters and leaves this module.
Do not design ontology, journeys, rules, workflows, access, screens or operations.

Call the tool `submitNs5Integration` once. Do not write Markdown around the tool arguments.

## What an integration is

A module talks to another module by publishing or receiving an event, calling a module endpoint,
talking to an external system, or using a platform plugin. Shared master data (a person, company or
product already in the organization catalog) is not an integration.

Empty `inbound`, `outbound`, `plugins`, `connections` and `externalSystems` arrays are valid only when the human prompt lists no
structural signal (no `kind: system` actor, no platform-plugin term, no connection-catalog term, no sibling module, and no
ontology entity whose connection this module must declare). This call does not run in that case.

The payload of an event is not declared here. `outbound.on` is the entity record at that transition
or create. The receiving module maps that record in the inbound `description` (cite `inbound.id`).

## Inbound

Each inbound row is `{ id, kind, from, event?, entityEffects, transitionRef?, description }`.
`id` is lowerCamel. `entityEffects` names each entity of **this** module that the arrival touches,
with the effects of that entity. One entity may have more than one effect, for example create and
update. Effects here are `create`, `update` or `transition`. `transitionRef` only when one entry
has `transition` (at most one such entry). An arrival that only informs and writes nothing has
`entityEffects: []`. An entity that lives outside this module is not written by an arrival.

- `kind: event` — a named event this module receives. `from` is a sibling folder, `organization`
  (platform catalog events listed in the human prompt), or a predicted sibling not yet in the
  registry (allowed; the gate marks `unknownModule`). `event` defaults to `id`.
- `kind: moduleEndpoint` — another module calls this one. `from` is that module.
- `kind: external` — do not write it. Anything exchanged with a system outside the app is an entry of
  `externalSystems` plus rows of `connections` (see below).

An entity listed in the human prompt as `writer=inbound` **must** appear in some inbound
`entityEffects` entry whose effects include `create` or `update`, or in the `entityEffects` of a
`serve` row of `connections` whose effects include `create` or `update`.

An arrival from a connection (the platform catalog `## Connection catalog` or a system declared in
`externalSystems`) is **never** an inbound row: it is a `serve` row of `connections`. Do not write an `inbound` of
`kind: external`; a connection delivers only the operations it lists.
Do not invent an event the request does not name.

## Outbound

Each outbound row is `{ id, kind, to, event, on, entityRefs[], description }`. `on` is
`Entity.transitionId` or `Entity.create` of **this** module — the gate checks it exists. `to` is a
sibling folder or `any`. `event` is the published event id.

When siblings exist, publish the transitions other modules may need. Do not duplicate a sibling's
entity; point at it with inbound/outbound.

## External systems

When the request names a system outside the app that this module must talk to, declare it in
`externalSystems`; the platform knows nothing about it. Each entry is
`{ id, title, description, settings[], operations[] }`.

When the ontology cites a `connectionId` that is not a platform catalog connection and not a system a sibling declares, declare an external system with that same id. The human prompt lists those ids under Systems the ontology cites.

- `id` is lowerCamel and unique in the project. It is the `connectionId` of the rows in `connections`. It must
  not repeat a connection of the platform catalog, nor a system a sibling already declares.
- `description` says what the system is and what this module uses it for, in the user language.
- `settings` are the values an admin must give to the module for this system, in business words (for example
  where the system is, or the key that gives access). Each is `{ id, title, description, secret }`; `secret` is
  true when the value must never be shown again after it is saved. A system that needs none has an empty list.
- A system with any `serve` operation has at least one setting with `secret: true`: the secret agreed with the
  system, so the module can check that what arrives really comes from it. Without it the notice is refused.
- `operations` are what the module asks of the system (`call`) and what the system tells the module (`serve`).
  Each is `{ operationId, direction, description }`; the description says what is asked or what arrives.
- Say nothing about how: no address, method, header, body format, authentication scheme, library or types of
  input and output. The next layer decides those.

A language model, or any other AI service, is never an external system. When the module needs AI, it uses the
operations of the catalog connection that offers it (`cm`, see `## Connection catalog`); do not declare an AI
service in `externalSystems`.

When a sibling already declares the system (`## External systems the sibling modules already declare`), use it in
`connections` and do not declare it again. Declare a system only when the request names one; do not invent one.

## Connections

A connection row is one operation of one connection: from the platform catalog in the human prompt
(`## Connection catalog`), from a system this module declares in `externalSystems`, or from a system a sibling
declares. Everything exchanged with a system outside the app is a row here.
Each row is `{ connectionId, operationId, usedBy, entityRefs, effect?, entityEffects, description }`.
Do not send `direction` or `kind`; they come from the operation. Do not invent a connection or an operation.

On a `call`, `usedBy` is `journeyId.stepId` or `processId.taskId` from the human prompt. A step or stage that goes over the records of an entity that lives outside the module (for each ..., every ...) is in `usedBy` of the `call` that lists or reads that entity; read the text of each ref in the human prompt before you choose who uses a call. Send
A `call` made because an arrival came is used by a stage of the process that arrival triggers (`processId.taskId`), never by a stage of another process.

`entityRefs` and `effect` (`list`, `read`, `create`, `update` or `remove`) only when the operation
reads or writes an entity of this module. Send both, or neither. Leave `entityRefs` empty when it
does not. `entityEffects` is `[]`.

On a `serve`, `usedBy` is a short sentence of what the arrival does. Each entity the arrival touches
comes in `entityEffects` with the effects of that entity (`list`, `read`, `create`, `update` or
`remove`). One entity may have more than one effect, for example create and update. `entityRefs` is
`[]`. Do not send `effect`. An arrival that only informs and writes nothing has `entityEffects: []`.
An entity that lives outside this module is not written by an arrival.

## Plugins

A plugin is a platform adapter, not a new module. `pluginId` must be one of the platform plugin ids
listed in the human prompt. `usedBy` is `journeyId.stepId` or `processId.taskId` that uses the
plugin. Do not invent a plugin. Do not emit an entity for card numbers, tokens or other plugin-owned
data.

## Language

Write every human-facing value (`description`) in the module `userLanguage`. Ids stay lowerCamel.
Entity ids stay UpperCamel.

`schemaVersion` is `2026-11-17-ns5-integration-v3`; the code sets the real version of the artifact.
