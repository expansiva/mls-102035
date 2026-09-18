/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/ontology30/gateV3.ts" enhancement="_blank"/>

/**
 * The v3 gate of `ontology30` (ns5_42). Additive next to `gate.ts`, which stays the v2 gate the eleven
 * recorded modules are replayed through (`replayRealRuns.test.ts`); nothing here ever runs on a v2
 * artifact — every entry point refuses a `schemaVersion` that is not v3, so a v3 check cannot fire on a
 * module ns5_44 has not regenerated yet.
 *
 * PURE: no `node:*`, no `mls.stor`, no I/O.
 */

import type {
  DataFamilyOntology,
  MdmDefFields,
  MdmOntology,
  MdmSubtypeName,
} from '/_102034_/l1/mdm/defs/ontologyTypes.js';
import {
  isNs5OntologyV3Version,
  type Ns5OntologyEntityV3,
  type Ns5OntologyFieldV3,
  type Ns5OntologyFieldsV3,
  type Ns5OntologyIndexV3,
  type Ns5OntologyValueV3,
} from '/_102035_/l2/solution/types.js';
import {
  collectNs5CitedProcessStages,
  collectNs5LifecycleSignal,
  ns5LifecycleHasBranchingOrigin,
  type Ns5LifecycleJourneyView,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';
import {
  NS5_NAMESPACE_EMPTY_DESCRIPTION,
  NS5_ONTOLOGY_V3_CLASSES,
  NS5_ONTOLOGY_V3_MODES,
  NS5_ONTOLOGY_V3_RELATIONSHIP_TYPES,
  collectNs5CitedEntitiesV3,
  ns5ColumnIdsV3,
  ns5FamilyOfV3,
  ns5ResolvableFieldIdsV3,
  type Ns5OntologyV3Family,
  type Ns5OntologyV3PlanDraft,
  type Ns5OntologyV3PlanRelationship,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/contractsV3.js';

const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;

export interface Ns5OntologyV3Issue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path: string;
}

export interface Ns5OntologyV3GateResult {
  ok: boolean;
  issues: Ns5OntologyV3Issue[];
}

export interface Ns5OntologyV3GateContext {
  moduleName: string;
  mdm: MdmOntology;
  /** The catalog of a transactional table — the capabilities a `tdm` entity may name (ns5_46). */
  tdm: DataFamilyOntology;
  /** The catalog of a derived table. */
  ddm: DataFamilyOntology;
  /**
   * Journeys, for the cited-entity check, for the namespace evidence and for the `decide` branch
   * (ns5_57). The element is the view the lifecycle walk already understands — `kind`, `effect` and
   * `stepId` were always in the data (`readJourneys()` returns `Ns5JourneyArtifact[]`); only this
   * declaration was narrower than the value it receives.
   */
  journeys?: ReadonlyArray<Ns5LifecycleJourneyView & { journeyId?: string }>;
  /** ns5_49: workflows50 runs first; a mechanical/llm stage names an entity the plan must declare. */
  workflows?: { processes: ReadonlyArray<{ processId?: string; tasks: ReadonlyArray<{ taskId?: string; kind: string; entityRef?: string; effect?: 'create' | 'update' | 'transition'; transitionRef?: string }> }> } | null;
  /** Source prompt plus journey prose: where a module field has to have a trace. */
  evidenceText?: string;
  /** Actor ids, for `transitions[].by`. */
  actors?: readonly string[];
}

function ok(issues: Ns5OntologyV3Issue[]): Ns5OntologyV3GateResult {
  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

/** One line per issue, the shape the repair prompt is fed. */
export function formatNs5OntologyV3Gate(issues: readonly Ns5OntologyV3Issue[]): string {
  return issues.map(issue => `${issue.severity.toUpperCase()} ${issue.code} ${issue.path}: ${issue.message}`).join('\n');
}

// ---------------------------------------------------------------------------
// the plan
// ---------------------------------------------------------------------------

export function validateNs5OntologyPlanV3(
  plan: Ns5OntologyV3PlanDraft,
  context: Ns5OntologyV3GateContext,
): Ns5OntologyV3GateResult {
  const issues: Ns5OntologyV3Issue[] = [];
  const subtypes = new Set(Object.keys(context.mdm.subtypes));
  const catalog = new Map(context.mdm.relationships.map(entry => [entry.type, entry]));
  const seen = new Set<string>();

  if (!plan.entities.length) {
    issues.push({ severity: 'error', code: 'NS5_ONTOLOGY_PLAN_EMPTY', message: 'The plan declares no entity.', path: 'entities' });
  }
  for (const entity of plan.entities) {
    const path = `entities.${entity.entityId}`;
    if (!ENTITY_ID.test(entity.entityId)) {
      issues.push({ severity: 'error', code: 'NS5_ONTOLOGY_ENTITY_ID', message: `'${entity.entityId}' is not a PascalCase noun.`, path });
    }
    if (seen.has(entity.entityId)) {
      issues.push({ severity: 'error', code: 'NS5_ONTOLOGY_ENTITY_DUPLICATE', message: `${entity.entityId} is declared twice.`, path });
    }
    seen.add(entity.entityId);
    if (!entity.description) {
      issues.push({ severity: 'error', code: 'NS5_ONTOLOGY_ENTITY_DESCRIPTION', message: `${entity.entityId} has no description.`, path });
    }
    if (!entity.displayField) {
      issues.push({ severity: 'error', code: 'NS5_ONTOLOGY_DISPLAY_FIELD_MISSING', message: `${entity.entityId} has no displayField.`, path });
    }
    /*
     * The family and the kind say the same thing from two sides, and only one pair is coherent: a papel
     * over a master record is `mdm`, and a table of the module is `tdm` or `ddm` — the module cannot
     * declare a master record of its own, and a role cannot be a movement. `ns5FamilyOfV3` derives the
     * family from the kind only when the draft has none, so what the model DID write still reaches here.
     */
    const family = ns5FamilyOfV3(entity);
    if (entity.kind === 'role' && family !== 'mdm') {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_FAMILY_INCOHERENT',
        message: `${entity.entityId} is a role over a master record, so its family is 'mdm', not '${family}'.`,
        path: `${path}.family`,
      });
    }
    if (entity.kind !== 'role' && family === 'mdm') {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_FAMILY_INCOHERENT',
        message: `${entity.entityId} is a table of this module; 'mdm' is the family of the master record, which only a role carries. Use 'tdm' for a movement or 'ddm' for something recalculated.`,
        path: `${path}.family`,
      });
    }
    if (family === 'ddm' && entity.writer) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_DDM_HAS_WRITER',
        message: `${entity.entityId} is derived data: nobody writes it, so it declares no writer ('${entity.writer}').`,
        path: `${path}.writer`,
      });
    }
    if (entity.kind === 'role') {
      if (!entity.subtype || !subtypes.has(entity.subtype)) {
        issues.push({
          severity: 'error',
          code: 'NS5_ONTOLOGY_SUBTYPE_UNKNOWN',
          message: `'${entity.subtype || ''}' is not a subtype of the platform (${[...subtypes].join(', ')}).`,
          path: `${path}.subtype`,
        });
      }
    } else if (!entity.class || !(NS5_ONTOLOGY_V3_CLASSES as readonly string[]).includes(entity.class)) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_CLASS_UNKNOWN',
        message: `'${entity.class || ''}' is not core, event or supporting.`,
        path: `${path}.class`,
      });
    }
  }

  const relationshipIds = new Set<string>();
  for (const row of plan.relationships) {
    const path = `relationships.${row.relationshipId}`;
    if (!MEMBER_ID.test(row.relationshipId)) {
      issues.push({ severity: 'error', code: 'NS5_ONTOLOGY_RELATIONSHIP_ID', message: `'${row.relationshipId}' is not lowerCamel.`, path });
    }
    if (relationshipIds.has(row.relationshipId)) {
      issues.push({ severity: 'error', code: 'NS5_ONTOLOGY_RELATIONSHIP_DUPLICATE', message: `${row.relationshipId} is declared twice.`, path });
    }
    relationshipIds.add(row.relationshipId);
    if (!(NS5_ONTOLOGY_V3_RELATIONSHIP_TYPES as readonly string[]).includes(row.type)) {
      issues.push({ severity: 'error', code: 'NS5_ONTOLOGY_RELATIONSHIP_TYPE', message: `'${row.type}' is not a structural type.`, path: `${path}.type` });
    }
    if (!(NS5_ONTOLOGY_V3_MODES as readonly string[]).includes(row.mode)) {
      issues.push({ severity: 'error', code: 'NS5_ONTOLOGY_RELATIONSHIP_MODE', message: `'${row.mode}' is not a mode.`, path: `${path}.mode` });
    }
    for (const [side, endpoint] of [['from', row.from], ['to', row.to]] as const) {
      if (!seen.has(endpoint) && !subtypes.has(endpoint)) {
        issues.push({
          severity: 'error',
          code: 'NS5_ONTOLOGY_RELATIONSHIP_ENDPOINT',
          message: `${endpoint || '(empty)'} is neither an entity of this module nor a platform subtype.`,
          path: `${path}.${side}`,
        });
      }
    }
    if (row.mode === 'mdmRelationship') {
      const entry = row.catalogType ? catalog.get(row.catalogType) : undefined;
      if (!entry) {
        issues.push({
          severity: 'error',
          code: 'NS5_ONTOLOGY_CATALOG_TYPE_UNKNOWN',
          message: `'${row.catalogType || ''}' is not a relationship type of the platform catalog.`,
          path: `${path}.catalogType`,
        });
      } else {
        issues.push(...checkCatalogEndpoints(row, entry, plan, path));
        const allowed = new Set(entry.roles);
        for (const role of row.roles ?? []) {
          if (!allowed.has(role)) {
            issues.push({
              severity: 'error',
              code: 'NS5_ONTOLOGY_CATALOG_ROLE_UNKNOWN',
              message: `'${role}' is not a role of ${entry.type} (${entry.roles.join('|') || 'none'}).`,
              path: `${path}.roles`,
            });
          }
        }
      }
    }
    if (row.mode === 'throughTable' && !row.through) {
      issues.push({ severity: 'error', code: 'NS5_ONTOLOGY_THROUGH_MISSING', message: 'A throughTable link must name the table walked.', path: `${path}.through` });
    }
    if (row.mode === 'composition') issues.push(...checkComposition(row, plan, path));
  }

  for (const cited of collectNs5CitedEntitiesV3(context.journeys ?? [])) {
    if (!seen.has(cited)) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_JOURNEY_ENTITY',
        message: `A journey writes '${cited}' and the ontology does not declare it.`,
        path: `entities.${cited}`,
      });
    }
  }
  // ns5_49: the second writer. A process stage cites the entity forward; the plan has to declare it.
  const stageSeen = new Set<string>();
  for (const stage of collectNs5CitedProcessStages(context.workflows)) {
    if (seen.has(stage.entityId) || stageSeen.has(stage.entityId)) continue;
    stageSeen.add(stage.entityId);
    issues.push({
      severity: 'error',
      code: 'NS5_ONTOLOGY_JOURNEY_ENTITY',
      message: `Process stage ${stage.processId}.${stage.taskId} writes '${stage.entityId}' and the ontology does not declare it.`,
      path: `entities.${stage.entityId}`,
    });
  }
  return ok(issues);
}

/** The subtype on each end has to be one the catalog accepts on that end. A role stands for its subtype. */
function checkCatalogEndpoints(
  row: Ns5OntologyV3PlanRelationship,
  entry: MdmOntology['relationships'][number],
  plan: Ns5OntologyV3PlanDraft,
  path: string,
): Ns5OntologyV3Issue[] {
  const issues: Ns5OntologyV3Issue[] = [];
  const subtypeOf = (endpoint: string): string | undefined => {
    const entity = plan.entities.find(item => item.entityId === endpoint);
    if (entity) return entity.kind === 'role' ? entity.subtype : undefined;
    return endpoint;
  };
  const from = subtypeOf(row.from);
  const to = subtypeOf(row.to);
  if (from && !(entry.from as readonly string[]).includes(from)) {
    issues.push({
      severity: 'error',
      code: 'NS5_ONTOLOGY_CATALOG_ENDPOINT',
      message: `${entry.type} goes from ${entry.from.join('|')}; ${row.from} is ${from}.`,
      path: `${path}.from`,
    });
  }
  if (to && !(entry.to as readonly string[]).includes(to)) {
    issues.push({
      severity: 'error',
      code: 'NS5_ONTOLOGY_CATALOG_ENDPOINT',
      message: `${entry.type} goes to ${entry.to.join('|')}; ${row.to} is ${to}.`,
      path: `${path}.to`,
    });
  }
  return issues;
}

/**
 * D2: a child is embedded in the parent document only when it has no life of its own — no lifecycle,
 * and nobody outside the parent points at it. Otherwise it is a table.
 */
function checkComposition(
  row: Ns5OntologyV3PlanRelationship,
  plan: Ns5OntologyV3PlanDraft,
  path: string,
): Ns5OntologyV3Issue[] {
  const issues: Ns5OntologyV3Issue[] = [];
  if (plan.entities.some(entity => entity.entityId === row.to)) {
    issues.push({
      severity: 'error',
      code: 'NS5_ONTOLOGY_COMPOSITION_IS_ENTITY',
      message: `${row.to} is embedded in ${row.from} by composition and must not also be an entity; declare it as an object collection inside ${row.from}.details.`,
      path: `${path}.to`,
    });
  }
  const others = plan.relationships.filter(item => item.relationshipId !== row.relationshipId
    && (item.from === row.to || item.to === row.to));
  if (others.length) {
    issues.push({
      severity: 'error',
      code: 'NS5_ONTOLOGY_COMPOSITION_REFERENCED',
      message: `${row.to} is referenced by ${others.map(item => item.relationshipId).join(', ')}, so it has a life of its own and is a table, not a composition.`,
      path,
    });
  }
  return issues;
}

// ---------------------------------------------------------------------------
// one entity
// ---------------------------------------------------------------------------

/**
 * A module field that pretends to be a platform service, and the capability that already does it.
 *
 * The four families are the ones ns5_42 names, in BOTH languages. The spec wrote three of them in
 * Portuguese (`fotos*`, `comprovante*`, `telefone*`) while `promptEntity.md` requires every field id to
 * be an English code, so a pt-only list would be a detector that never fires on the modules it is
 * meant to protect. Recorded as a decision of this task.
 *
 * The patterns are built from strings, not written as regex literals: `ns5CreateAgentGraph.test.ts`
 * strips strings and comments before looking for DOM globals, and a literal carrying the word
 * `document` reads to that guard as `window.document`.
 */
const SERVICE_IMITATIONS: ReadonlyArray<{ code: RegExp; capability: string; what: string }> = [
  { code: new RegExp('(url|uri)$', 'i'), capability: 'attach.document', what: 'a link to a file' },
  {
    code: new RegExp('^(photo|photos|picture|pictures|image|images|foto|fotos|imagem|imagens)', 'i'),
    capability: 'attach.document',
    what: 'a photo',
  },
  {
    code: new RegExp('^(receipt|receipts|proof|attachment|attachments|file|files|doc|docs|documento|documentos|comprovante|comprovantes|anexo|anexos|arquivo|arquivos)', 'i'),
    capability: 'attach.document',
    what: 'an attached file',
  },
  {
    code: new RegExp('^(phone|phones|mobile|cell|cellphone|whatsapp|email|mail|telefone|telefones|celular|contato|contatos)', 'i'),
    capability: 'link.contact',
    what: 'a contact channel',
  },
];

export function validateNs5OntologyEntityV3(
  entity: Ns5OntologyEntityV3,
  plan: Ns5OntologyV3PlanDraft,
  context: Ns5OntologyV3GateContext,
): Ns5OntologyV3GateResult {
  const issues: Ns5OntologyV3Issue[] = [];
  if (!isNs5OntologyV3Version(entity.schemaVersion)) {
    // A v2 artifact never enters a v3 check: the eleven recorded modules are not this gate's business.
    return { ok: true, issues };
  }
  const path = `entities.${entity.entityId}`;
  const paths = new Set(ns5ResolvableFieldIdsV3(entity));
  if (!paths.has(entity.displayField)) {
    issues.push({
      severity: 'error',
      code: 'NS5_ONTOLOGY_DISPLAY_FIELD_UNRESOLVED',
      message: `displayField '${entity.displayField}' is not a path of record.fields.`,
      path: `${path}.displayField`,
    });
  }
  const family = familyOf(entity, plan);
  issues.push(...checkCapabilities(entity, family, context, path));
  issues.push(...checkRules(entity, context, path));
  issues.push(...checkDecideBranching(entity, context, path));
  issues.push(...checkEntityRelationships(entity, plan, path));
  if (entity.kind === 'role') {
    issues.push(...checkRoleRecord(entity, context, path));
  } else {
    issues.push(...checkTableRecord(entity, plan, path));
    if (family === 'ddm') issues.push(...checkDerivedTable(entity, path));
  }
  return ok(issues);
}

/**
 * ns5_57: a `decide` a journey cites on this entity needs a real branch — at least two transitions
 * leaving the same state, one per outcome. The v2 gate charges this in `gate.ts` (`validateLifecycle`)
 * and repairs it; the v3 gate did not, so the first reader of the defect was the `finalize80` I2, where
 * there is no repair left. `compras` (leva v4) is the measured case: the model collapsed approve and
 * reject into one `submitted → approvalResolved`.
 *
 * The verdict comes from the same pair the v2 gate and the I2 oracle use, so the three cannot diverge;
 * only the citation coordinates are looked up here, and a lookup is not a second check.
 *
 * No `kind` is skipped: the I2 oracle does not skip one either (a `decide` on a role is as much of a
 * defect there). An entity with NO lifecycle is a warning, not an error — the ontology would have to
 * invent a lifecycle for a catalog nobody moves, and the defect is in the journey.
 */
function checkDecideBranching(
  entity: Ns5OntologyEntityV3,
  context: Ns5OntologyV3GateContext,
  path: string,
): Ns5OntologyV3Issue[] {
  const journeys = context.journeys;
  if (!journeys) return [];
  if (!collectNs5LifecycleSignal(journeys, entity.entityId).requiresBranching) return [];
  const where = decideCitation(journeys, entity.entityId);
  if (!entity.lifecycleStates?.length) {
    return [{
      severity: 'warning',
      code: 'NS5_ONTOLOGY_DECIDE_NEEDS_BRANCH',
      message: `${entity.entityId} has a decide step in ${where}, and this record has no lifecycle: a decide on a record nobody moves is a journey defect, not an ontology one.`,
      path: `${path}.lifecycleStates`,
    }];
  }
  if (ns5LifecycleHasBranchingOrigin({ transitions: entity.transitions ?? [] })) return [];
  return [{
    severity: 'error',
    code: 'NS5_ONTOLOGY_DECIDE_NEEDS_BRANCH',
    message: `${entity.entityId} has a decide step in ${where}: declare at least two transitions leaving the same state (for example approve and reject from 'submitted'), each with the deciding actor in 'by'.`,
    path: `${path}.transitions`,
  }];
}

/** Where the decide was cited, for the message only: `journey X (stepId)`, or `a journey` if unnamed. */
function decideCitation(
  journeys: ReadonlyArray<Ns5LifecycleJourneyView & { journeyId?: string }>,
  entityId: string,
): string {
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.kind !== 'decide' || step.entity !== entityId) continue;
      const stepId = step.stepId ? ` (${step.stepId})` : '';
      return journey.journeyId ? `journey ${journey.journeyId}${stepId}` : `a journey${stepId}`;
    }
  }
  return 'a journey';
}

/** The family of an entity is a decision of the PLAN; the fan-out never re-decides it. */
function familyOf(entity: Ns5OntologyEntityV3, plan: Ns5OntologyV3PlanDraft): Ns5OntologyV3Family {
  const frozen = plan.entities.find(item => item.entityId === entity.entityId);
  return ns5FamilyOfV3(frozen ?? { kind: entity.kind });
}

function catalogIdsOf(family: Ns5OntologyV3Family, context: Ns5OntologyV3GateContext): string[] {
  if (family === 'mdm') return Object.keys(context.mdm.capabilities);
  return Object.keys((family === 'ddm' ? context.ddm : context.tdm).capabilities);
}

/**
 * A capability id is either one of the catalog OF THIS ENTITY'S FAMILY, or one of this module, prefixed.
 *
 * Before ns5_46 only the `mdm` catalog was ever consulted, and only for ids with no dot-prefix, so
 * `<module>.anything` on a TABLE passed unchecked and the fan-out invented one capability per journey.
 * The other half of the same hole was `next.sequenceNumber` on `ordenServicio`: the model knew it needed
 * a sequence, had no catalog to pick from, and guessed a name — which is why an unknown id now carries
 * the nearest id of the catalog it should have come from.
 */
function checkCapabilities(
  entity: Ns5OntologyEntityV3,
  family: Ns5OntologyV3Family,
  context: Ns5OntologyV3GateContext,
  path: string,
): Ns5OntologyV3Issue[] {
  const issues: Ns5OntologyV3Issue[] = [];
  const prefix = `${entity.moduleName}.`;
  const catalog = catalogIdsOf(family, context);
  const known = new Set(catalog);
  for (const [id, sentence] of Object.entries(entity.capabilities)) {
    const where = `${path}.capabilities.${id}`;
    if (!sentence || !String(sentence).trim()) {
      issues.push({ severity: 'error', code: 'NS5_ONTOLOGY_CAPABILITY_EMPTY', message: `${id} has no sentence.`, path: where });
      continue;
    }
    if (id.startsWith(prefix)) {
      if (!MEMBER_ID.test(id.slice(prefix.length))) {
        issues.push({
          severity: 'error',
          code: 'NS5_ONTOLOGY_CAPABILITY_ID',
          message: `'${id}' must be ${prefix}<lowerCamel>.`,
          path: where,
        });
      }
      continue;
    }
    if (!known.has(id)) {
      const nearest = nearestCapabilityId(id, catalog);
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_CAPABILITY_UNKNOWN',
        message: `'${id}' is in no catalog: this entity is ${family}, so a catalog id must exist in the ${family} catalog and a capability of this module must start with ${prefix}.`
          + (nearest ? ` Did you mean '${nearest}'?` : ''),
        path: where,
      });
    }
  }
  return issues;
}

/**
 * The nearest id of a catalog, by the WORDS both carry. Edit distance is the wrong measure here: the
 * case that has to work is `next.sequenceNumber` against `sequence.next` — the same two words in the
 * other order, which Levenshtein scores as far apart while a short unrelated id scores as near. Split on
 * the dots and on camelCase, fold the plural, and compare the sets; a single word in common is not
 * enough (half the catalog would "mean" `read.byId`), two words or one exact word are.
 */
export function nearestCapabilityId(id: string, catalog: readonly string[]): string | undefined {
  const mine = capabilityWords(id);
  if (!mine.size) return undefined;
  let best: { id: string; score: number } | undefined;
  for (const candidate of catalog) {
    const theirs = capabilityWords(candidate);
    let shared = 0;
    for (const word of theirs) if (mine.has(word)) shared += 1;
    if (!shared) continue;
    const score = (2 * shared) / (mine.size + theirs.size);
    const decisive = shared >= 2 || (shared === 1 && mine.size === theirs.size && theirs.size === 1);
    if (!decisive) continue;
    if (!best || score > best.score) best = { id: candidate, score };
  }
  return best?.id;
}

function capabilityWords(id: string): Set<string> {
  const words = id
    .split(/[.\-_]/u)
    .flatMap(part => part.split(/(?=[A-Z])/u))
    .map(word => word.toLowerCase().replace(/s$/u, ''))
    .filter(word => word.length >= 2);
  return new Set(words);
}

/**
 * A `ddm` entity is a summary: nobody writes it, so it has no state to move through and no key of its
 * own. `normalizeTableRecord` already marks every field derived, which is why `derived` is not checked
 * here — a check that can never fire is no check.
 */
function checkDerivedTable(entity: Ns5OntologyEntityV3, path: string): Ns5OntologyV3Issue[] {
  const issues: Ns5OntologyV3Issue[] = [];
  if (entity.lifecycleStates?.length || entity.transitions?.length) {
    issues.push({
      severity: 'error',
      code: 'NS5_ONTOLOGY_DDM_HAS_STATE',
      message: `${entity.entityId} is derived data: it is recalculated, never moved from one state to the next. A record with a lifecycle is 'tdm'.`,
      path: `${path}.lifecycleStates`,
    });
  }
  if (entity.uniqueKeys?.length) {
    issues.push({
      severity: 'error',
      code: 'NS5_ONTOLOGY_DDM_UNIQUE_KEY',
      message: `${entity.entityId} is derived data: the window and the group keys already identify a row, and the recalculation rewrites it, so there is no unique key to enforce.`,
      path: `${path}.uniqueKeys`,
    });
  }
  return issues;
}

function checkRules(
  entity: Ns5OntologyEntityV3,
  context: Ns5OntologyV3GateContext,
  path: string,
): Ns5OntologyV3Issue[] {
  const issues: Ns5OntologyV3Issue[] = [];
  for (const id of entity.rules) {
    const where = `${path}.rules.${id}`;
    if (id in context.mdm.rules) continue;
    if (id.startsWith('rule-')) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_RULE_UNKNOWN',
        message: `'${id}' reads as a platform rule and is not in mdm.rules.`,
        path: where,
      });
      continue;
    }
    if (!MEMBER_ID.test(id)) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_RULE_ID',
        message: `A rule of this module is lowerCamel; '${id}' is not.`,
        path: where,
      });
    }
  }
  return issues;
}

/** Cardinality seen from this entity, given the index row. */
function expectedCardinality(type: string, side: 'from' | 'to'): string {
  if (type === 'oneToOne') return '1:1';
  if (type === 'manyToMany') return 'N:N';
  if (type === 'oneToMany') return side === 'from' ? '1:N' : 'N:1';
  return side === 'from' ? 'N:1' : '1:N';
}

function checkEntityRelationships(
  entity: Ns5OntologyEntityV3,
  plan: Ns5OntologyV3PlanDraft,
  path: string,
): Ns5OntologyV3Issue[] {
  const issues: Ns5OntologyV3Issue[] = [];
  const rows = new Map(plan.relationships.map(row => [row.relationshipId, row]));
  for (const [name, link] of Object.entries(entity.relationships)) {
    const where = `${path}.relationships.${name}`;
    const row = rows.get(link.relationshipId);
    if (!row) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_RELATIONSHIP_UNKNOWN',
        message: `relationshipId '${link.relationshipId}' is in no row of the module index.`,
        path: where,
      });
      continue;
    }
    const side = row.from === entity.entityId ? 'from' : row.to === entity.entityId ? 'to' : undefined;
    if (!side) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_RELATIONSHIP_SIDE',
        message: `${row.relationshipId} links ${row.from} to ${row.to}; neither is ${entity.entityId}.`,
        path: where,
      });
      continue;
    }
    const expected = expectedCardinality(row.type, side);
    if (link.cardinality !== expected) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_CARDINALITY_INCOHERENT',
        message: `${row.relationshipId} is ${row.type} and ${entity.entityId} is the ${side}; seen from here the cardinality is ${expected}, not ${link.cardinality}.`,
        path: `${where}.cardinality`,
      });
    }
  }
  return issues;
}

// --- a table ---------------------------------------------------------------

/**
 * A column exists because something filters, sorts or deduplicates by it. `NS5_ONTOLOGY_COLUMN_WITHOUT_INDEX`
 * is the whole point of the v3 table: anything else belongs in `details`.
 */
function checkTableRecord(
  entity: Ns5OntologyEntityV3,
  plan: Ns5OntologyV3PlanDraft,
  path: string,
): Ns5OntologyV3Issue[] {
  const issues: Ns5OntologyV3Issue[] = [];
  const fields = entity.record.fields;
  const known = new Set(plan.entities.map(item => item.entityId));
  for (const [id, field] of Object.entries(fields)) {
    if (id === 'details') continue;
    const where = `${path}.record.fields.${id}`;
    // `version` is the optimistic-concurrency counter the engine bumps; nothing ever filters by it,
    // and it is a column because the row has to carry it (`Consulta.defs.ts:26-30`).
    if (id === 'version') continue;
    if (field.indexed !== true) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_COLUMN_WITHOUT_INDEX',
        message: `Column '${id}' has no index. A field nothing filters, sorts or deduplicates by belongs inside details.`,
        path: where,
      });
    }
    if (field.type === 'object') {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_COLUMN_IS_OBJECT',
        message: `Column '${id}' is an object; a nested object lives inside details.`,
        path: where,
      });
    }
    for (const target of field.to ?? []) {
      if (!known.has(target)) {
        issues.push({
          severity: 'error',
          code: 'NS5_ONTOLOGY_RECORD_TARGET_UNKNOWN',
          message: `'${id}' points at '${target}', which is not an entity of this module.`,
          path: `${where}.to`,
        });
      }
    }
  }
  if (!fields.details || fields.details.type !== 'object') {
    issues.push({
      severity: 'error',
      code: 'NS5_ONTOLOGY_DETAILS_MISSING',
      message: 'A table declares one details document, even when it is empty.',
      path: `${path}.record.fields.details`,
    });
  }
  const columns = new Set(ns5ColumnIdsV3(entity));
  for (const key of entity.uniqueKeys ?? []) {
    for (const id of key) {
      if (!columns.has(id)) {
        issues.push({
          severity: 'error',
          code: 'NS5_ONTOLOGY_UNIQUE_KEY_NOT_COLUMN',
          message: `uniqueKeys names '${id}', which is not a column. Uniqueness is enforced on columns.`,
          path: `${path}.uniqueKeys`,
        });
      }
    }
  }
  issues.push(...checkComposedChildren(entity, plan, path));
  return issues;
}

/** The far end of a `composition` row has to be an object collection inside this entity's document. */
function checkComposedChildren(
  entity: Ns5OntologyEntityV3,
  plan: Ns5OntologyV3PlanDraft,
  path: string,
): Ns5OntologyV3Issue[] {
  const issues: Ns5OntologyV3Issue[] = [];
  const mine = plan.relationships.filter(row => row.mode === 'composition' && row.from === entity.entityId);
  if (!mine.length) return issues;
  const collections = new Set<string>();
  for (const [id, field] of Object.entries(entity.record.fields.details?.fields ?? {})) {
    if (field.type === 'object' && field.collection === true) collections.add(id.toLowerCase());
  }
  for (const row of mine) {
    if (!collections.size) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_COMPOSITION_NOT_EMBEDDED',
        message: `${row.relationshipId} embeds ${row.to} in ${entity.entityId}, and details holds no object collection to embed it in.`,
        path: `${path}.record.fields.details`,
      });
    }
  }
  return issues;
}

// --- a role ----------------------------------------------------------------

function valueCodes(values: readonly Ns5OntologyValueV3[] | undefined): string[] {
  return (values ?? []).map(item => (typeof item === 'string' ? item : item.value));
}

/**
 * The papel copies and tightens. Three errors, in the order they cost the most:
 *  - a field on a platform branch the platform does not declare (`PLATFORM_FIELD_UNKNOWN`);
 *  - a domain, a `required` or a structural flag that is WIDER than the platform (`LOOSENED`);
 *  - the module namespace redeclaring what the platform owns (`NAMESPACE_CONFLICT`), or faking a
 *    platform service with a field (`NAMESPACE_IMITATES_SERVICE`).
 */
function checkRoleRecord(
  entity: Ns5OntologyEntityV3 & { kind: 'role' },
  context: Ns5OntologyV3GateContext,
  path: string,
): Ns5OntologyV3Issue[] {
  const issues: Ns5OntologyV3Issue[] = [];
  const { mdm } = context;
  const subtype = entity.subtype as MdmSubtypeName;
  const definition = mdm.subtypes[subtype];
  if (!definition) {
    return [{
      severity: 'error',
      code: 'NS5_ONTOLOGY_SUBTYPE_UNKNOWN',
      message: `'${subtype}' is not a subtype of the platform.`,
      path: `${path}.subtype`,
    }];
  }
  const subtypeKey = subtype[0].toLowerCase() + subtype.slice(1);
  const namespaceKey = entity.moduleName;
  const ownedByPlatform = platformFieldIds(mdm, subtype);
  const branches = entity.record.fields.details?.fields ?? {};

  for (const [key, branch] of Object.entries(branches)) {
    const where = `${path}.record.fields.details.${key}`;
    if (key === namespaceKey) {
      issues.push(...checkNamespace(branch, ownedByPlatform, context, where));
      continue;
    }
    const platformFields: MdmDefFields | undefined = key === subtypeKey
      ? definition.fields
      : mdm.groups[key]?.fields;
    if (!platformFields && !mdm.groups[key]?.open) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_BRANCH_UNKNOWN',
        message: `'${key}' is not a branch of the platform record (${Object.keys(mdm.groups).join(', ')}, ${subtypeKey}) nor the namespace '${namespaceKey}'.`,
        path: where,
      });
      continue;
    }
    for (const [id, field] of Object.entries(branch.fields ?? {})) {
      const platformField = platformFields?.[id];
      if (!platformField) {
        issues.push({
          severity: 'error',
          code: 'NS5_ONTOLOGY_PLATFORM_FIELD_UNKNOWN',
          message: `The platform branch '${key}' has no field '${id}'; a module never invents a field on a platform layer. Its own data goes in details.${namespaceKey}.`,
          path: `${where}.${id}`,
        });
        continue;
      }
      issues.push(...checkTightening(field, platformField, `${where}.${id}`));
    }
  }
  return issues;
}

function checkTightening(
  mine: Ns5OntologyFieldV3,
  platform: MdmDefFields[string],
  where: string,
): Ns5OntologyV3Issue[] {
  const issues: Ns5OntologyV3Issue[] = [];
  if (mine.type !== platform.type) {
    issues.push({
      severity: 'error',
      code: 'NS5_ONTOLOGY_PLATFORM_FIELD_LOOSENED',
      message: `The platform declares this field as ${platform.type}; a module never changes the type (${mine.type}).`,
      path: `${where}.type`,
    });
  }
  // NOT checked: `required` dropped by the module. The platform marks a field required when the
  // ENGINE always writes the key (`base.aliases`, `addresses`, `contacts`, `relationshipRefs` --
  // `mdm.defs.ts:77-80`), which is not the same as forcing a person to fill it; the hand-written
  // gabarito omits it on exactly those four (`Paciente.defs.ts:106-189`). Making it an error would
  // refuse the very form this task has to produce. `normalizeRoleRecord` restores the platform flag
  // anyway, so generated output never diverges here. Recorded as a decision of ns5_42.
  if (platform.values?.length) {
    const wider = new Set(platform.values.map(String));
    const extra = valueCodes(mine.values).filter(code => !wider.has(code));
    if (extra.length) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_PLATFORM_FIELD_LOOSENED',
        message: `'${extra.join(', ')}' is outside the platform domain (${platform.values.join('|')}); a module may only keep a subset.`,
        path: `${where}.values`,
      });
    }
  }
  if (platform.derived === true && mine.derived !== true) {
    issues.push({
      severity: 'error',
      code: 'NS5_ONTOLOGY_PLATFORM_FIELD_LOOSENED',
      message: 'The engine writes this field; a module cannot make it writable.',
      path: `${where}.derived`,
    });
  }
  return issues;
}

function checkNamespace(
  branch: Ns5OntologyFieldV3,
  ownedByPlatform: ReadonlySet<string>,
  context: Ns5OntologyV3GateContext,
  where: string,
): Ns5OntologyV3Issue[] {
  const issues: Ns5OntologyV3Issue[] = [];
  const fields = branch.fields ?? {};
  if (!Object.keys(fields).length) {
    if (branch.description !== NS5_NAMESPACE_EMPTY_DESCRIPTION) {
      issues.push({
        severity: 'warning',
        code: 'NS5_ONTOLOGY_NAMESPACE_EMPTY_TEXT',
        message: 'An empty namespace carries the fixed description, never an example.',
        path: `${where}.description`,
      });
    }
    return issues;
  }
  const evidence = fold(context.evidenceText ?? '');
  for (const [id, field] of Object.entries(fields)) {
    const at = `${where}.${id}`;
    if (ownedByPlatform.has(id)) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_NAMESPACE_CONFLICT',
        message: `'${id}' is a field the platform owns; the module namespace never redeclares identity, document, contact or login (rule-identity-never-in-namespace).`,
        path: at,
      });
      continue;
    }
    const imitation = SERVICE_IMITATIONS.find(entry => entry.code.test(id));
    if (imitation) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_NAMESPACE_IMITATES_SERVICE',
        message: `'${id}' stores ${imitation.what} as a field; the platform already does it — declare the capability '${imitation.capability}' instead.`,
        path: at,
      });
      continue;
    }
    if (evidence && !hasTrace(id, field, evidence)) {
      issues.push({
        severity: 'warning',
        code: 'NS5_ONTOLOGY_NAMESPACE_WITHOUT_TRACE',
        message: `Nothing in the request or the journeys asks for '${id}'. The namespace carries what was asked for, nothing else.`,
        path: at,
      });
    }
  }
  return issues;
}

/**
 * A module field has a trace when its id, its title or one of its codes appears in what was asked for.
 *
 * Accents are folded on BOTH sides. Field ids are stable English-shaped codes (`promptEntity.md`) while
 * the request is in the user language, so the code `medico` has to find the word `medicos` inside
 * "medicos e terapeutas"; without folding the match is a coin flip on which of a field's words happens
 * to be unaccented, which is a detector that reports by luck.
 */
function fold(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function hasTrace(id: string, field: Ns5OntologyFieldV3, evidence: string): boolean {
  const words = [
    id,
    ...id.split(/(?=[A-Z])/),
    ...(field.title ? field.title.split(/\s+/) : []),
    ...valueCodes(field.values),
  ]
    .map(word => fold(word).trim())
    .filter(word => word.length >= 4);
  return words.some(word => evidence.includes(word));
}

/** Every field id the platform owns on this record: what the namespace must never redeclare. */
function platformFieldIds(mdm: MdmOntology, subtype: MdmSubtypeName): Set<string> {
  const ids = new Set<string>();
  for (const group of Object.values(mdm.groups)) {
    for (const id of Object.keys(group.fields ?? {})) ids.add(id);
  }
  for (const id of Object.keys(mdm.subtypes[subtype].fields)) ids.add(id);
  for (const id of Object.keys(mdm.record.fields)) ids.add(id);
  return ids;
}

// ---------------------------------------------------------------------------
// the assembly
// ---------------------------------------------------------------------------

/**
 * What only holds once every entity is on the table: the index and the entities agree, and every entity
 * of the plan was written.
 */
export function validateNs5OntologyAssemblyV3(
  index: Ns5OntologyIndexV3,
  entities: ReadonlyArray<Ns5OntologyEntityV3>,
  context: Ns5OntologyV3GateContext,
): Ns5OntologyV3GateResult {
  const issues: Ns5OntologyV3Issue[] = [];
  const written = new Set(entities.map(entity => entity.entityId));
  for (const row of index.entities) {
    if (!written.has(row.entityId)) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_ENTITY_MISSING',
        message: `${row.entityId} is in the index and was not written.`,
        path: `entities.${row.entityId}`,
      });
    }
  }
  const declared = new Set(index.entities.map(row => row.entityId));
  const subtypes = new Set(Object.keys(context.mdm.subtypes));
  for (const row of index.relationships) {
    for (const [side, endpoint] of [['from', row.from], ['to', row.to]] as const) {
      if (!declared.has(endpoint) && !subtypes.has(endpoint)) {
        issues.push({
          severity: 'error',
          code: 'NS5_ONTOLOGY_RELATIONSHIP_ENDPOINT',
          message: `${endpoint} is neither an entity of the index nor a platform subtype.`,
          path: `relationships.${row.relationshipId}.${side}`,
        });
      }
    }
  }
  for (const entity of entities) {
    if (entity.kind !== 'entity') continue;
    if (!entity.lifecycleStates?.length && (entity.transitions?.length ?? 0) > 0) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_LIFECYCLE_REQUIRED',
        message: `${entity.entityId} declares transitions and no lifecycle state.`,
        path: `entities.${entity.entityId}.lifecycleStates`,
      });
    }
    const states = new Set((entity.lifecycleStates ?? []).map(item => item.state));
    for (const transition of entity.transitions ?? []) {
      const where = `entities.${entity.entityId}.transitions.${transition.transitionId}`;
      if (!states.has(transition.to)) {
        issues.push({
          severity: 'error',
          code: 'NS5_ONTOLOGY_TRANSITION_REF_MISSING',
          message: `${transition.transitionId} arrives at '${transition.to}', which is not a declared state.`,
          path: `${where}.to`,
        });
      }
      for (const origin of transition.from) {
        if (!states.has(origin)) {
          issues.push({
            severity: 'error',
            code: 'NS5_ONTOLOGY_TRANSITION_REF_MISSING',
            message: `${transition.transitionId} starts at '${origin}', which is not a declared state.`,
            path: `${where}.from`,
          });
        }
      }
      for (const actor of transition.by) {
        // ns5_47: `time` used to be a way of saying "nobody moves it, the clock does". It is not a
        // transition at all, and the message has to name the place that now holds it.
        if (actor === 'time') {
          issues.push({
            severity: 'error',
            code: 'NS5_ONTOLOGY_TRANSITION_ACTOR_UNKNOWN',
            message: `'${transition.transitionId}' is moved by 'time', which is not an actor. A condition over time is not a state somebody reaches: declare it in derived[] (a field computed on read, with 'from' naming the dates it uses) and leave status for what an actor or a command writes.`,
            path: `${where}.by`,
          });
          continue;
        }
        if (context.actors?.length && !context.actors.includes(actor)) {
          issues.push({
            severity: 'error',
            code: 'NS5_ONTOLOGY_TRANSITION_ACTOR_UNKNOWN',
            message: `'${actor}' is not an actor of this module.`,
            path: `${where}.by`,
          });
        }
      }
    }
    if (entity.lifecycleStates?.length && !statusColumn(entity.record.fields, states)) {
      issues.push({
        severity: 'error',
        code: 'NS5_ONTOLOGY_LIFECYCLE_STATUS_COLUMN',
        message: `${entity.entityId} has a lifecycle and no indexed 'status' column covering ${[...states].join('|')}.`,
        path: `entities.${entity.entityId}.record.fields.status`,
      });
    }
  }
  return ok(issues);
}

function statusColumn(fields: Ns5OntologyFieldsV3, states: ReadonlySet<string>): boolean {
  const status = fields.status;
  if (!status || status.indexed !== true) return false;
  const codes = new Set(valueCodes(status.values));
  for (const state of states) if (!codes.has(state)) return false;
  return true;
}
