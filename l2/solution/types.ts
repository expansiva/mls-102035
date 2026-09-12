/// <mls fileReference="_102035_/l2/solution/types.ts" enhancement="_blank"/>

/** Schema ids for NS5 source artifacts. Bumped when a field is added or removed. */
export const NS5_MODULE_SCHEMA_VERSION = '2026-09-10-ns5-module-v2' as const;
export const NS5_JOURNEY_SCHEMA_VERSION = '2026-09-10-ns5-journey-v1' as const;
export const NS5_ONTOLOGY_SCHEMA_VERSION = '2026-09-11-ns5-ontology-v2' as const;
export const NS5_RULES_SCHEMA_VERSION = '2026-09-10-ns5-rules-v1' as const;
export const NS5_WORKFLOWS_SCHEMA_VERSION = '2026-09-10-ns5-workflows-v1' as const;
export const NS5_ACCESS_SCHEMA_VERSION = '2026-09-10-ns5-access-v2' as const;
export const NS5_INTEGRATION_SCHEMA_VERSION = '2026-09-10-ns5-integration-v1' as const;
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
  /** workflows50 may point a task at this id. */
  stepId: string;
  /** journeys20 gate; finalize80 maps act/decide onto ontology transitions. */
  kind: 'locate' | 'inspect' | 'act' | 'decide' | 'handoff';
  /** ontology30 must declare this UpperCamel id; finalize80 checks it exists. */
  entity: string;
  /** ontology30 must declare each extra entity the step also changes. */
  affects?: string[];
  /**
   * This act creates the `entity` record (or attaches, when the entity is mdm).
   * At most one of `creates` / `transitionRef`. Readers: I2, master backend, master frontend.
   */
  creates?: true;
  /**
   * This act applies this ontology `transitionId` of `entity` (lowerCamel).
   * At most one of `creates` / `transitionRef`. Readers: I2, master backend, master frontend.
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
   * How this entity is written. Absent = an `act` writes it (`entity` or `affects`).
   * `crud` = reference catalog nobody creates in a journey (no lifecycle); master
   * frontend emits a data grid, master backend emits CRUD usecases.
   * ontology30 normalize drops crud when an act already writes it.
   * ontology30 / access60 / finalize80 I10.
   */
  maintenance?: 'crud';
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

export interface Ns5WorkflowTask {
  /** Graph node id. */
  taskId: string;
  /** Gate: human requires actorRef. */
  kind: 'human' | 'system' | 'wait';
  /** Actor of a human task. */
  actorRef?: string;
  /** Must exist in the journey index. */
  journeyRef?: string;
  /** Must exist on that journey. */
  stepRef?: string;
  /** Acyclic unless a wait is on the cycle. */
  next: string[];
  /** Planner / UI. */
  description: string;
}

export interface Ns5WorkflowProcess {
  /** Index identity. */
  processId: string;
  /** Planner / UI. */
  title: string;
  /** Planner / UI. */
  description: string;
  /** finalize80 I6: every journey handoff appears in some process. */
  tasks: Ns5WorkflowTask[];
}

export interface Ns5WorkflowsArtifact {
  /** Gate of workflows50. Empty list is valid. */
  schemaVersion: typeof NS5_WORKFLOWS_SCHEMA_VERSION;
  /** Folder. */
  moduleName: string;
  /** Orchestration only; not the entity FSM. */
  processes: Ns5WorkflowProcess[];
}

export interface Ns5AccessAuthority {
  /** grants.authorityRef. */
  authorityId: string;
  /** Planner / UI. */
  title: string;
  /** Planner / UI. */
  description: string;
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
  /** Index identity. */
  grantId: string;
  /** Must be an actorId from access.actors. */
  actorRef: string;
  /** Must be an authorityId. */
  authorityRef: string;
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
  /** grants.authorityRef. */
  authorities: Ns5AccessAuthority[];
  /** Backend applies scope and disclosure from these rows. */
  grants: Ns5AccessGrant[];
}

export interface Ns5IntegrationItem {
  /** Index identity. */
  id: string;
  /** Gate vs registry / plugin catalogue. */
  kind: 'moduleEndpoint' | 'event' | 'external';
  /** For inbound: source module or system. */
  from?: string;
  /** For outbound: destination module or system. */
  to?: string;
  /** Planner / UI. */
  description: string;
  /** Must be entityIds. */
  entityRefs: string[];
}

export interface Ns5IntegrationPlugin {
  /** Must be in the platform plugin catalogue. */
  pluginId: string;
  /** Planner / UI. */
  description: string;
  /** Must be entityIds. */
  entityRefs: string[];
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
  /** module10: actors born by the step. Later steps read them via `readNs5Actors`. */
  actors?: Ns5ModuleActor[];
  /** journeys20: actorIds dropped as inferred-external without an exclusive step. */
  droppedActors?: string[];
  /** workflows50: true when processes is [] because no handoff, foreign-by transition or cross-actor decide. */
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
