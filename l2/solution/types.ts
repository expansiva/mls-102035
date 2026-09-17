/// <mls fileReference="_102035_/l2/solution/types.ts" enhancement="_blank"/>

import type { MdmDefField, MdmSubtypeName } from '/_102034_/l1/mdm/defs/ontologyTypes.js';

/** Schema ids for NS5 source artifacts. Bumped when a field is added or removed. */
export const NS5_MODULE_SCHEMA_VERSION = '2026-09-10-ns5-module-v2' as const;
export const NS5_JOURNEY_SCHEMA_VERSION = '2026-09-10-ns5-journey-v1' as const;
export const NS5_ONTOLOGY_SCHEMA_VERSION = '2026-09-11-ns5-ontology-v2' as const;
export const NS5_RULES_SCHEMA_VERSION = '2026-09-10-ns5-rules-v1' as const;
export const NS5_RULES_SCHEMA_VERSION_V2 = '2026-09-16-ns5-rules-v2' as const;
export const NS5_WORKFLOWS_SCHEMA_VERSION = '2026-09-12-ns5-workflows-v2' as const;
export const NS5_ACCESS_SCHEMA_VERSION = '2026-09-12-ns5-access-v3' as const;
export const NS5_INTEGRATION_SCHEMA_VERSION = '2026-09-12-ns5-integration-v2' as const;
export const NS5_INTEGRATION_REQUEST_SCHEMA_VERSION = '2026-09-12-ns5-integration-request-v1' as const;
export const NS5_PIPELINE_SCHEMA_VERSION = '2026-09-10-ns5-pipeline-v1' as const;

export const NS5_STEP_IDS = [
  'module10',
  'journeys20',
  'ontology30',
  'rules40',
  'workflows50',
  'access60',
  'integration70',
  'finalize80',
] as const;

export type Ns5StepId = typeof NS5_STEP_IDS[number];

export interface Ns5ModuleActor {
  /** journeys20 binds actorRef; access60 copies survivors onto access.defs.ts; finalize80 I3 checks coverage. */
  actorId: string;
  /** journeys20 drops inferred external without an exclusive step; integration70 treats system as a signal. */
  kind: 'internal' | 'external' | 'system';
  /** journeys20 removes inferred external without a private step; module10 only records the origin. */
  origin: 'named' | 'inferred';
  /** Planner / UI; no generator reads this as structure. */
  title: string;
  /** Planner / UI; no generator reads this as structure. */
  description: string;
}

export interface Ns5ModuleArtifact {
  /** Gate of module10; later steps refuse a different version. */
  schemaVersion: typeof NS5_MODULE_SCHEMA_VERSION;
  /** Folder name; every later step and the registry key off this. */
  moduleName: string;
  /** Planner / UI; no generator reads this as structure. */
  title: string;
  /** Phrases catalogue and later prompts write user-facing text in this language. */
  userLanguage: string;
  /** module10 gate; defaultLanguage must be in this list. */
  productLanguages: string[];
  /** Fallback language when a phrase is missing. */
  defaultLanguage: string;
  /** Resume and /rebuild all recover the original request from here. */
  sourcePrompt: string;
  /** Organization-wide aggregates; ontology30 writes this at the end of the fan-out. */
  details?: Record<string, Ns5OntologyDetail>;
}

export interface Ns5JourneyStep {
  /** Identity of the step; I6 names a handoff by this id. */
  stepId: string;
  /** journeys20 gate; finalize80 maps act/decide onto ontology transitions. */
  kind: 'locate' | 'inspect' | 'act' | 'decide' | 'handoff';
  /** ontology30 must declare this UpperCamel id; finalize80 checks it exists. */
  entity: string;
  /** ontology30 must declare each extra entity the step also changes. */
  affects?: string[];
  /**
   * Required on `kind: act`. `create` opens the record (or attaches, when mdm);
   * `transition` applies `transitionRef`; `update` writes fields without a state change.
   * Readers: I2, master backend, master frontend.
   */
  effect?: 'create' | 'update' | 'transition';
  /**
   * Required iff `effect === 'transition'`. Ontology `transitionId` of `entity` (lowerCamel).
   * Readers: I2, master backend, master frontend.
   */
  transitionRef?: string;
  /** Planner / UI. */
  title: string;
  /** Planner / UI. */
  description: string;
  /** workflows50 requires a process covering this handoff; must be an actorId. */
  handoffTo?: string;
}

export interface Ns5JourneyArtifact {
  /** Gate of journeys20. */
  schemaVersion: typeof NS5_JOURNEY_SCHEMA_VERSION;
  /** Index order, workflows50.journeyRef. */
  journeyId: string;
  business: {
    /** Must be an actorId from the pipeline (then access.defs.ts). */
    actorRef: string;
    /** Planner / UI. */
    title: string;
    /** Planner / UI. */
    goal: string;
    entry: {
      /** journeys20 gate; no screen meaning. */
      mode: 'coldStart' | 'contextOrLookup' | 'fromNotification';
    };
    /** ontology30 collects entity names; finalize80 is the oracle for act/decide. */
    steps: Ns5JourneyStep[];
    outcome: {
      /** Planner / UI. */
      statement: string;
      /** Planner / UI. */
      evidence: string[];
    };
  };
  /** Staleness: journeys20 rewrite vs finalize80. */
  businessHash: string;
}

export interface Ns5SystemDecision {
  /** dropInferredActor<Actor> after journeys20. */
  decisionId: string;
  /** Mechanical choice. */
  chosen: string;
  /** Visible alternative; not offered as a widget. */
  alternatives: string[];
  decidedBy: 'system';
}

export interface Ns5JourneyIndexEntry {
  /** File name under journeys/. */
  journeyId: string;
  /** Must be an actorId that survived inferred-actor drop. */
  actorRef: string;
  /** Planner / UI. */
  title: string;
}

export interface Ns5JourneyIndexArtifact {
  /** Gate of journeys20; same version as each journey file. */
  schemaVersion: typeof NS5_JOURNEY_SCHEMA_VERSION;
  /** Folder. */
  moduleName: string;
  /** Declaration order; ontology30 and access60 read this list. */
  journeys: Ns5JourneyIndexEntry[];
  /** journeys20 records dropInferredActor<Actor> here. */
  systemDecisions: Ns5SystemDecision[];
}

export interface Ns5OntologyDetail {
  /** Typed JSON column and screen formatting. */
  type: Ns5OntologyField['type'];
  /** Planner / UI; rules may cite details.<name>. */
  description: string;
}

export interface Ns5OntologyEnumValue {
  /** Stable English lowerCamel code; status.enum.value covers lifecycleStates[].state. */
  value: string;
  /** Screen select/badge label in userLanguage. */
  title: string;
}

export interface Ns5OntologyFieldConstraints {
  /** Inclusive lower bound; number, integer or money. */
  min?: number;
  /** Inclusive upper bound; number, integer or money. */
  max?: number;
  /** string or text only. */
  maxLength?: number;
  /** money or number only. */
  precision?: number;
}

export interface Ns5OntologyField {
  /** Grants and rules name Entidade.campo using this id. */
  fieldId: string;
  /** Planner / UI. */
  title: string;
  /** Backend storage and grant field resolution. */
  type: 'uuid' | 'string' | 'text' | 'number' | 'integer' | 'boolean' | 'money' | 'date' | 'datetime' | 'json';
  /** Backend required-on-write; ontology30 gate. */
  required: boolean;
  /** Simple uniqueness; DDL unique index. Never the identity field. */
  unique?: boolean;
  /** Closed domain; value is the code, title is the screen label. */
  enum?: Ns5OntologyEnumValue[];
  /** Intrinsic to the type (day 1..31, percent 0..100). Never a business policy. */
  constraints?: Ns5OntologyFieldConstraints;
  /** Planner / UI. */
  description: string;
}

export interface Ns5OntologyEntityArtifact {
  /** Gate of ontology30. */
  schemaVersion: typeof NS5_ONTOLOGY_SCHEMA_VERSION;
  /** Folder / storage.mdmType prefix. */
  moduleName: string;
  /** File name, relationship endpoints, grant entityRefs. */
  entityId: string;
  /** Planner / UI. */
  title: string;
  /** Planner / UI. */
  description: string;
  /** ontology30 gate vs storage.target; mdm has no lifecycle. */
  kind: 'core' | 'event' | 'supporting' | 'mdm' | 'valueObject';
  /** access60 own-anchor search; registry role inference. */
  party: 'person' | 'organization' | 'none';
  /** Required on kind mdm; must be a level-1 subtype. */
  mdmSubtype?: string;
  /** Resolvable field (own or level-1 identification/base). */
  displayField: string;
  /** Namespace-only on mdm; identity lives in storage.idField. */
  fields: Ns5OntologyField[];
  /** kind mdm only: level-1 fields this role uses (selection, tightened domain); stores nothing in the module. Readers: f2_04b screen, access60 (ns5_35), masters. */
  fieldsBase?: Ns5OntologyField[];
  /** Composite uniqueness; fieldIds of this entity, never idField. finalize80 I9. */
  uniqueKeys?: string[][];
  /** Calculated values; typed JSON column; rules may cite details.<name>. */
  details?: Record<string, Ns5OntologyDetail>;
  /** finalize80 reachability; a screen may only request a declared transition. */
  lifecycleStates: Array<{
    state: string;
    reachedBy: 'actor' | 'command' | 'time';
  }>;
  /** finalize80 maps journey act/decide onto these; ruleRefs cite rules.defs.ts. */
  transitions: Array<{
    transitionId: string;
    from: string[];
    to: string;
    by: string[] | 'system' | 'time';
    description: string;
    /** Optional citations; finalize80 I4 checks each id exists in rules.defs.ts. */
    ruleRefs?: string[];
  }>;
  storage: {
    /** Must match kind (mdm => mdm). */
    target: 'moduleDatabase' | 'mdm' | 'external';
    /** mdm is organization. */
    scope: string;
    /** Identity field; outside fields[] on mdm. */
    idField: string;
    /** '<mod>.<Entity>' on mdm, consumed by the registry. */
    mdmType?: string;
  };
  /** appendOnly entities have no lifecycle; E-like backends skip update/delete. */
  mutability?: 'appendOnly';
  /**
   * How this entity is written. Omitted = `journey` (an `act` writes it as `entity` or `affects`).
   * `crud` = reference catalog nobody creates in a journey (no lifecycle); master
   * frontend emits a data grid, master backend emits CRUD usecases.
   * `inbound` = created/updated by an integration inbound item; integration70 requires
   * a matching `inbound.writes` row. ontology30 normalize drops `crud`/`inbound` when
   * an act already writes the entity. ontology30 / access60 / finalize80 I10 I8.
   * Replaces `maintenance?: 'crud'` (ns5_31).
   */
  writer?: 'journey' | 'crud' | 'inbound';
}

export interface Ns5OntologyRelationship {
  /** Index identity. */
  relationshipId: string;
  /** Must be an entityId in this index. */
  fromEntity: string;
  /** Must be an entityId in this index. */
  toEntity: string;
  /** Structural type of the link. */
  type: string;
  /** Ontology screen edge label; master frontend. One sentence, userLanguage. */
  description: string;
  /** access60 own-anchor walk follows required edges. */
  required: boolean;
  persistence: {
    mode: 'moduleReference' | 'crossStoreReference' | 'mdmRelationship' | 'externalReference';
  };
  realization: {
    kind: string;
    ownerEntity: string;
    from: { entityId: string; fieldIds: string[] };
    to: { entityId: string; fieldIds: string[] };
  };
}

export interface Ns5OntologyIndexArtifact {
  /** Gate of ontology30 bindings. */
  schemaVersion: typeof NS5_ONTOLOGY_SCHEMA_VERSION;
  /** Folder / registry. */
  moduleName: string;
  /** Planner / UI. */
  businessDomain: string;
  /** Order of entity files; finalize80 coverage. */
  entities: string[];
  /** n15 field endpoints; access60 anchorPath. */
  relationships: Ns5OntologyRelationship[];
  /** ontology30: platform-service candidates (attachments/comments). Omitted when none. */
  systemDecisions?: Ns5SystemDecision[];
}

// ===========================================================================
// Ontology v3 (ns5_39). ADDITIVE: `Ns5OntologyEntityArtifact` above stays the
// v2 form the eleven other modules and `ontology30` still use. v3 is the form
// written by hand for `agendaClinica` — a module ontology written ON TOP of the
// platform ontology (`/_102034_/l4/ontology/mdm.defs.ts`) instead of beside it:
// a `role` is a papel over an MDM subtype, an `entity` is a table of the module.
//
// The field grammar is the platform's `MdmDefField`, reused rather than
// redeclared, so there is ONE field form on both sides. Three widenings, each
// because the module legitimately says something the platform cannot:
//   `to`     platform: `readonly MdmSubtypeName[]`; a module points at its own
//            entities too (`Consulta.defs.ts:33` — `to: ["Paciente"]`).
//   `values` platform: `readonly string[]`; a module labels its domain in the
//            user language (`Paciente.defs.ts:122-131` — `{value, title}`).
//   `fields` recurses into the widened field, not the platform one.
// `of` is NOT widened: it stays `MdmValueTypeName`, which is what makes the
// compiler check every reusable type a module cites.
// ===========================================================================

export const NS5_ONTOLOGY_SCHEMA_VERSION_V3 = '2026-09-15-ns5-ontology-v3' as const;

/** Closed-domain value of a v3 field: the bare code, or the code plus its label. */
export type Ns5OntologyValueV3 = string | { value: string; title?: string; description?: string };

/** One field of a v3 record. The platform grammar, widened where a module needs it (see above). */
export interface Ns5OntologyFieldV3 extends Omit<MdmDefField, 'to' | 'values' | 'fields' | 'groups'> {
  /** MDM subtypes AND entity ids of this module. */
  to?: readonly string[];
  values?: readonly Ns5OntologyValueV3[];
  fields?: Ns5OntologyFieldsV3;
  /**
   * Only on a branch of `details`: who writes it. `platform` = the MDM record,
   * `organization` = the promoted layer, `module` = `details.<moduleName>`.
   */
  owner?: 'platform' | 'organization' | 'module';
  /** Only on a branch: the key set is not closed here (declared elsewhere). */
  open?: true;
}

export type Ns5OntologyFieldsV3 = Readonly<Record<string, Ns5OntologyFieldV3>>;

/** One named link of an entity. `relationshipId` is the row of the module index that carries it. */
export interface Ns5OntologyRelationshipV3 {
  /** Must exist in `index.defs.ts`; that index is the source, this is the reading copy. */
  relationshipId: string;
  /** Entity id of this module, or an MDM subtype. */
  to: string;
  /**
   * `mode: 'fk'` — the column that holds it; `mode: 'throughTable'` — the table walked;
   * absent mode — the MDM relationship type of `mdm.relationships[].type`.
   */
  via: string;
  mode?: 'fk' | 'throughTable';
  /** Which end of the catalog link this entity sits on, when it is not the `from`. */
  direction?: 'from' | 'to';
  /** Role of `mdm_relationship.role`, single or many. */
  role?: string;
  roles?: readonly string[];
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:N';
  /** `true`, or the condition in the user language ("quando menor de 18 anos"). */
  required?: boolean | string;
  /** Walked, never stored. */
  derived?: true;
  /** Only on `throughTable`: the walk, as written. */
  path?: string;
  /** Planner / screen. */
  title: string;
  description?: string;
  /** Narrows the far end, field → accepted values. */
  target?: Readonly<Record<string, readonly string[]>>;
}

/** What a `role` and a table share. Exported so `nsArtifactFieldRatchet.test.ts` can reach its keys. */
export interface Ns5OntologyEntityV3Base<Cap extends string = string, Rule extends string = string> {
  /** Gate: the v3 form. */
  schemaVersion: typeof NS5_ONTOLOGY_SCHEMA_VERSION_V3;
  moduleName: string;
  /** File name, relationship endpoints, grant entityRefs. */
  entityId: string;
  title: string;
  description: string;
  /** Path a screen shows to recognise the record: `details.identification.name`, `scheduledAt`. */
  displayField: string;
  /** `{ id, version, details }` on a role; plus the indexed columns on an entity. */
  record: { fields: Ns5OntologyFieldsV3 };
  /** Composite uniqueness, by field id. */
  uniqueKeys?: readonly (readonly string[])[];
  lifecycleStates?: readonly { state: string; reachedBy: 'actor' | 'command' | 'time' }[];
  transitions?: readonly {
    transitionId: string;
    from: readonly string[];
    to: string;
    by: readonly string[] | 'system' | 'time';
    description: string;
    ruleRefs?: readonly string[];
  }[];
  relationships: Readonly<Record<string, Ns5OntologyRelationshipV3>>;
  /**
   * id → one sentence. A platform id of `mdm.capabilities`, or `<moduleName>.<id>`.
   * Optional per key because an entity picks from the catalog; that `Cap` is an upper bound and not a
   * requirement. Assigning a `const` here therefore does NOT reject an invented id (no excess-property
   * check off a fresh literal) — a reader that wants that proof asserts `Exclude<keyof …, Cap>` is
   * `never`, as `resolveMdmEntity.test.ts` does.
   */
  capabilities: { readonly [K in Cap]?: string };
  /** Ids of `mdm.rules` ∪ `ruleId` of the module `rules.defs.ts`. */
  rules: readonly Rule[];
  /** How the entity is written, when it is not a journey. */
  writer?: 'journey' | 'crud' | 'inbound';
}

/** A papel of this module over an MDM record. Stores nothing but `details.<moduleName>`. */
export interface Ns5OntologyRoleV3<Cap extends string = string, Rule extends string = string>
  extends Ns5OntologyEntityV3Base<Cap, Rule> {
  kind: 'role';
  /** The MDM subtype the papel sits on; must be a key of `mdm.subtypes`. */
  subtype: MdmSubtypeName;
  /** `<moduleName>.<entityId>`; what `attachRole` writes into `identification.tags`. */
  roleTag: string;
  /** The platform ontology this papel copies from. */
  source: string;
}

/** A table of the module. */
export interface Ns5OntologyTableV3<Cap extends string = string, Rule extends string = string>
  extends Ns5OntologyEntityV3Base<Cap, Rule> {
  kind: 'entity';
  class: 'core' | 'event' | 'supporting';
  /**
   * `kind` is the family's storage (ns5_46): `relational` is one Postgres table of the module,
   * `timeSeries` a series chunked by time. Optional because the hand-written v3 form predates it and a
   * table without it is read as `relational`.
   */
  storage: { target: 'moduleDatabase'; table: string; kind?: 'relational' | 'timeSeries' };
}

export type Ns5OntologyEntityV3<Cap extends string = string, Rule extends string = string> =
  | Ns5OntologyRoleV3<Cap, Rule>
  | Ns5OntologyTableV3<Cap, Rule>;

/** One row of the v3 index: the canonical list of entities. */
export interface Ns5OntologyIndexEntityV3 {
  entityId: string;
  kind: 'role' | 'entity';
  /** On `role` only. */
  subtype?: MdmSubtypeName;
  /** On `entity` only. */
  class?: 'core' | 'event' | 'supporting';
}

/** One row of the v3 index: the canonical list of links. The entities repeat these for reading. */
export interface Ns5OntologyIndexRelationshipV3 {
  relationshipId: string;
  from: string;
  to: string;
  type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  required: boolean;
  mode: 'fk' | 'mdmRelationship' | 'throughTable';
  /** `mode: 'fk'`: the column, as `Entity.field`. */
  field?: string;
  /** `mode: 'mdmRelationship'`: a `type` of `mdm.relationships`. */
  catalogType?: string;
  /** `mode: 'throughTable'`: the entity walked. */
  through?: string;
  roles?: readonly string[];
  path?: string;
  derived?: true;
  description: string;
}

export interface Ns5OntologyIndexV3 {
  schemaVersion: typeof NS5_ONTOLOGY_SCHEMA_VERSION_V3;
  moduleName: string;
  businessDomain: string;
  /** Path of the platform ontology this module is written on top of. */
  platformOntology: string;
  /** The branch of `details` only this module writes. */
  moduleNamespace: { key: string; description: string };
  entities: readonly Ns5OntologyIndexEntityV3[];
  relationships: readonly Ns5OntologyIndexRelationshipV3[];
}

/** What a reader gets from an ontology entity file, whichever form it is in. Discriminate on `schemaVersion`. */
export type Ns5OntologyAnyEntity = Ns5OntologyEntityArtifact | Ns5OntologyEntityV3;

export interface Ns5Rule {
  /** Cited by transitions.ruleRefs and later screens/endpoints. */
  ruleId: string;
  /** The only copy of the rule text. */
  description: string;
}

export interface Ns5RulesArtifact {
  /** Gate of rules40. */
  schemaVersion: typeof NS5_RULES_SCHEMA_VERSION;
  /** Folder. */
  moduleName: string;
  /** Catalog of {ruleId, description}; I4 checks cited ruleRefs exist. */
  rules: Ns5Rule[];
}

/**
 * The same catalog as a MAP, aligned with `mls-102034/l4/ontology/mdm.defs.ts`, whose `rules` and
 * `capabilities` are both `Record<id, sentence>` — one id, one sentence, no place to put a second.
 * `rules40` emits this form; the v1 array above stays valid and is still what the recorded runs hold.
 * Read either form through `solution/rulesView.ts`, never by branching on the field.
 *
 * The TOOL still asks for `[{ ruleId, description }]`: a strict tool schema must declare
 * `additionalProperties: false` on every object, so an open key set is not expressible
 * (`steps/ontology30/contractsV3.ts:175` says the same of `record.fields` and `capabilities`).
 * Array to map is the normalize's job.
 */
export interface Ns5RulesArtifactV2 {
  /** Discriminates the two forms. */
  schemaVersion: typeof NS5_RULES_SCHEMA_VERSION_V2;
  /** Folder. */
  moduleName: string;
  /** `ruleId` to the one business sentence; I4 checks cited ruleRefs exist. */
  rules: Readonly<Record<string, string>>;
}

/** What a reader gets from `rules.defs.ts`, whichever form it is in. Discriminate on `schemaVersion`. */
export type Ns5RulesAny = Ns5RulesArtifact | Ns5RulesArtifactV2;

export interface Ns5WorkflowTrigger {
  /** Gate: scheduled needs schedule, event needs event, manual needs actorRef. */
  kind: 'scheduled' | 'event' | 'manual';
  /** Required iff kind === 'scheduled'. Prose ("every month, day 1"). Backend job. */
  schedule?: string;
  /** Required iff kind === 'event'. '<Entity>.<transitionId>' of this module (inbound '<mod>.<eventId>' is ns5_31). */
  event?: string;
  /** Required iff kind === 'manual'. */
  actorRef?: string;
}

export interface Ns5WorkflowTask {
  /** Graph node id. Unique in the process. */
  taskId: string;
  /** Gate: no neutral value; every stage is one of these. */
  kind: 'human' | 'mechanical' | 'llm' | 'wait';
  /** Required on human. */
  actorRef?: string;
  /** Required on human. The journey the person runs, never a screen step. */
  journeyRef?: string;
  /** Required on mechanical|llm. Entity the stage acts on. */
  entityRef?: string;
  /** Required on mechanical|llm. Same form as act.effect (ns5_28). */
  effect?: 'create' | 'update' | 'transition';
  /** Required iff effect === 'transition'. Ontology transitionId; by is system or the actor. */
  transitionRef?: string;
  /** Acyclic unless a wait is on the cycle. */
  next: string[];
  /** Planner / UI. Wait: the pause (time or event) in prose. */
  description: string;
}

export interface Ns5WorkflowProcess {
  /** Index identity. */
  processId: string;
  /** Planner / UI. */
  title: string;
  /** Planner / UI. */
  description: string;
  /** How the process starts. Tela da Fase 2, harness, backend job. */
  trigger: Ns5WorkflowTrigger;
  /** finalize80 I6: every journey handoff appears as a human journeyRef. */
  tasks: Ns5WorkflowTask[];
}

export interface Ns5JourneyDecision {
  /** Must exist in the journey index. Tela da Fase 2 shows why a journey stayed out. */
  journeyId: string;
  /** One decision per journey in the same LLM call. */
  inProcess: boolean;
  /** Required iff inProcess. */
  processId?: string;
}

export interface Ns5WorkflowsArtifact {
  /** Gate of workflows50. Empty processes is valid. */
  schemaVersion: typeof NS5_WORKFLOWS_SCHEMA_VERSION;
  /** Folder. */
  moduleName: string;
  /** Orchestration only; not the entity FSM. */
  processes: Ns5WorkflowProcess[];
  /** One row per journey; the screen lists who is in a process. */
  journeyDecisions: Ns5JourneyDecision[];
  /** workflows50 normalize: dropped duplicate stages. */
  systemDecisions?: Ns5SystemDecision[];
}

export interface Ns5AccessDataScope {
  /** own|assigned|related require anchorEntity. Other modes drop it before the gate. */
  mode: 'own' | 'assigned' | 'related' | 'public' | 'organization' | 'custom';
  /** party:person entity reachable from each entityRef. The path is derived, not stored. */
  anchorEntity?: string;
  /** Prose for custom; backend does not parse it. */
  description: string;
}

export interface Ns5AccessDisclosure {
  /** fieldsOnly|summaryOnly require a proper (not the full resolvable set) allowedFields or deniedFields list. */
  mode: 'fullRecord' | 'fieldsOnly' | 'summaryOnly' | 'aggregateOnly';
  /** Entity.field the backend includes. */
  allowedFields?: string[];
  /** Entity.field the backend strips. */
  deniedFields?: string[];
  /** Prose; backend does not parse it. */
  description: string;
}

export interface Ns5AccessGrant {
  /** Index identity. Unique. */
  grantId: string;
  /** Must be an actorId from access.actors. */
  actorRef: string;
  /** Access matrix screen. */
  title: string;
  /** Access matrix screen. */
  description: string;
  /** Must be entityIds. */
  entityRefs: string[];
  dataScope: Ns5AccessDataScope;
  disclosure: Ns5AccessDisclosure;
}

export interface Ns5AccessArtifact {
  /** Gate of access60. */
  schemaVersion: typeof NS5_ACCESS_SCHEMA_VERSION;
  /** Folder. */
  moduleName: string;
  /** Copied from the pipeline (survivors of the journeys20 drop). The LLM does not rewrite this list. */
  actors: Ns5ModuleActor[];
  /** The grant is the capability. Backend applies scope and disclosure from these rows. */
  grants: Ns5AccessGrant[];
}

export interface Ns5IntegrationItem {
  /** Index identity. Unique across inbound and outbound. */
  id: string;
  /** Gate vs registry / plugin catalogue / platform events. */
  kind: 'moduleEndpoint' | 'event' | 'external';
  /** Inbound source: sibling module, `organization` (platform catalog), or external system. */
  from?: string;
  /** Outbound destination: sibling module, `any`, or external system. */
  to?: string;
  /** Event id this row receives (inbound) or publishes (outbound). Defaults to `id`. */
  event?: string;
  /**
   * Inbound: entities of this module the arrival creates/updates.
   * Counts as a writer (ontology30 WITHOUT_WRITER, access60, I10) and as `trigger.event`.
   */
  writes?: string[];
  /** Inbound: what the arrival does to `writes`. Required on inbound. */
  effect?: 'create' | 'update' | 'transition';
  /** Inbound, required iff `effect === 'transition'`. */
  transitionRef?: string;
  /**
   * Outbound: when this module publishes. `Entity.transitionId` or `Entity.create`.
   * Payload is the entity record at that moment (not declared in l4). I12 checks it exists.
   */
  on?: string;
  /** Planner / UI. Cites `inbound.id` when the rule maps a sibling payload. */
  description: string;
  /** Outbound (and inbound leftover): entity ids this row touches. */
  entityRefs: string[];
}

export interface Ns5IntegrationPlugin {
  /** Must be in the platform plugin catalogue. */
  pluginId: string;
  /** Planner / UI. */
  description: string;
  /** `journeyId.stepId` or `processId.taskId` that uses the plugin. I12. */
  usedBy: string[];
}

/** Queued request that a sibling (or a predicted module) publish an event. */
export interface Ns5IntegrationRequestArtifact {
  schemaVersion: typeof NS5_INTEGRATION_REQUEST_SCHEMA_VERSION;
  requestedBy: string;
  eventId: string;
  on?: string;
  entityRefs: string[];
  description: string;
  status: 'requested';
  /** Organization inbox: the predicted module that should publish. */
  to?: string;
}

export interface Ns5IntegrationArtifact {
  /** Gate of integration70. Empty lists are valid. */
  schemaVersion: typeof NS5_INTEGRATION_SCHEMA_VERSION;
  /** Folder. */
  moduleName: string;
  /** What this module receives. */
  inbound: Ns5IntegrationItem[];
  /** What this module publishes. */
  outbound: Ns5IntegrationItem[];
  /** Platform plugins this module uses. */
  plugins: Ns5IntegrationPlugin[];
}

export type Ns5PipelineStatus = 'inProgress' | 'awaitingStep' | 'complete' | 'failed';

/** Form change recorded on `pipeline.json` `steps.<step>`. Shape is step-specific. */
export interface Ns5PipelineNormalization {
  kind: string;
  detail: string;
  entityId?: string;
  grantId?: string;
  journeyId?: string;
  stepId?: string;
  inboundId?: string;
}

export interface Ns5PipelineLiftedField {
  entityId: string;
  detail: string;
}

export interface Ns5PipelineStepState {
  /** Monotonic: approved is never overwritten by running/failed. */
  status: 'running' | 'approved' | 'failed';
  updatedAt: string;
  artifactPaths?: string[];
  error?: string;
  /** Set when /fast auto-approves; later steps and the supervisor read this. */
  autoReason?: string;
  /** journeys20: count of decide steps in the module. Zero is valid. */
  decideStepCount?: number;
  /** ontology30: entityIds no journey cites. Supporting/valueObject may be legitimate. */
  uncitedEntities?: string[];
  /**
   * ontology30: entity ids `liftNs5AggregateOnlyEntities` absorbed into `module.details`.
   * finalize80 I1 accepts a journey `entity`/`affects` that names one of these when
   * `module.details` still has the corresponding aggregate keys.
   */
  liftedAggregateEntities?: string[];
  /**
   * Form changes this step applied (pt→pt-BR, dropCrud, liftedFields, …).
   * Same records as the step draft `normalizations[]`. Fase 2 reads this.
   */
  normalizations?: Ns5PipelineNormalization[];
  /**
   * ontology30: extra fields discarded when a panel entity was lifted
   * (`normalizations[].kind === 'liftedFields'`).
   */
  liftedFields?: Ns5PipelineLiftedField[];
  /**
   * ontology30 v3: rule ids the entities cited, platform and module together. `rules40` receives the
   * module ones as data and has to produce them (ns5_42 T7 records it; ns5_43 T2 wires the reading).
   */
  citedRules?: string[];
  /** ontology30 v3: capability ids the entities cited, catalog and module together. */
  citedCapabilities?: string[];
  /** module10: actors born by the step. Later steps read them via `readNs5Actors`. */
  actors?: Ns5ModuleActor[];
  /** journeys20: actorIds dropped as inferred-external without an exclusive step. */
  droppedActors?: string[];
  /** workflows50: true when processes is [] because no handoff, foreign-by, cross-actor decide, system/time transition or time/event phrase. */
  noProcessSignal?: boolean;
  /** integration70: true when inbound/outbound/plugins are [] because no system actor and no plugin-catalog term. */
  noIntegrationSignal?: boolean;
}

export interface Ns5Invocation {
  /** /fast skips reserved clarification anchors. */
  fast: boolean;
  /** /module value when given; module10 proposes lowerCamel otherwise. */
  module: string;
  /** /rebuild all of that module (l1/l2/l4/l5 trees plus l5 json / registry). */
  rebuildAll: boolean;
}

export interface Ns5RebuildAllReport {
  /** Display paths unlinked under l1/l2/l4/l5/<module>/. */
  deleted: string[];
  /** Display paths rewritten (l5 jsons and the organization registry). */
  edited: string[];
  at: string;
}

export interface Ns5PipelineState {
  /** Gate of the skeleton; later steps refuse a different version. */
  schemaVersion: typeof NS5_PIPELINE_SCHEMA_VERSION;
  /** Must be agentNewSolution5. */
  flowId: 'agentNewSolution5';
  /** Folder this pipeline belongs to. */
  moduleName: string;
  /** Supervisor reads awaitingStep when status is awaitingStep. */
  status: Ns5PipelineStatus;
  /** First unimplemented step id; supervisor proof for ns5_01. */
  awaitingStep?: Ns5StepId;
  /** Per-step checkpoint; empty at create. */
  steps: Partial<Record<Ns5StepId, Ns5PipelineStepState>>;
  /** Original user prompt after flags are stripped. */
  sourcePrompt: string;
  /** Flags used for this run. */
  invocation: Ns5Invocation;
  /** Set when this pipeline was created by /rebuild all. */
  rebuildAll?: Ns5RebuildAllReport;
  updatedAt: string;
}

export type {
  MdmPlatformCatalogArtifact,
  MdmPlatformService,
  Ns4Level1AllowedRelationship,
  Ns4Level1EntityArtifact,
  Ns4Level1Field,
  Ns4Level1IndexArtifact,
  Ns4Level1RelationshipRef,
  Ns4Level1Subtype,
} from '/_102034_/l1/mdm/defs/level1Types.js';
export {
  NS4_LEVEL1_SCHEMA_VERSION,
  NS4_LEVEL1_SUBTYPE_VALUES,
} from '/_102034_/l1/mdm/defs/level1Types.js';
