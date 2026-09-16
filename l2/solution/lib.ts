/// <mls fileReference="_102035_/l2/solution/lib.ts" enhancement="_blank"/>

/**
 * Neutral re-exports of pure NS4 helpers. The NS4 files stay in place; NS5 steps import from here.
 */

export {
  ns4ResolvableFields as resolvableFields,
  ns4ResolvableFieldIds as resolvableFieldIds,
  ns4ResolvableFieldOf as resolvableFieldOf,
  ns4EntityIdField as entityIdField,
  ns4BindingPromptEntity as bindingPromptEntity,
  NS4_IDENTITY_FIELD_DESCRIPTION as IDENTITY_FIELD_DESCRIPTION,
} from '/_102035_/l2/agentNewSolution/helpers/ns4EntityFields.js';
export type { Ns4EntityFieldsSource as EntityFieldsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4EntityFields.js';

export {
  ns4Level1Catalog as level1Catalog,
  ns4Level1PlatformCatalog as level1PlatformCatalog,
  ns4Level1Subtypes as level1Subtypes,
  ns4Level1IsSubtype as level1IsSubtype,
  ns4Level1Entity as level1Entity,
  ns4Level1FieldIds as level1FieldIds,
  ns4Level1FieldSlot as level1FieldSlot,
} from '/_102035_/l2/agentNewSolution/helpers/level1Catalog.js';

export {
  NS4_LEVEL1_SCHEMA_VERSION as LEVEL1_SCHEMA_VERSION,
  NS4_SOLUTION_REGISTRY_SCHEMA_VERSION as SOLUTION_REGISTRY_SCHEMA_VERSION,
  NS4_LEVEL1_SUBTYPE_VALUES as LEVEL1_SUBTYPE_VALUES,
} from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';
export type {
  Ns4Level1Subtype as Level1Subtype,
  Ns4Level1Field as Level1Field,
  Ns4Level1EntityArtifact as Level1EntityArtifact,
  Ns4Level1IndexArtifact as Level1IndexArtifact,
  MdmPlatformCatalogArtifact as PlatformCatalogArtifact,
  Ns4SolutionRegistryActor as SolutionRegistryActor,
  Ns4SolutionRegistryRole as SolutionRegistryRole,
  Ns4SolutionRegistryEntity as SolutionRegistryEntity,
  Ns4SolutionRegistryEvent as SolutionRegistryEvent,
  Ns4SolutionRegistryModule as SolutionRegistryModule,
  Ns4SolutionRegistryArtifact as SolutionRegistryArtifact,
} from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';

export {
  emptyNs4SolutionRegistry as emptySolutionRegistry,
  upsertNs4SolutionRegistryModule as upsertSolutionRegistryModule,
  inferNs4RegistryMdmSubtype as inferRegistryMdmSubtype,
  buildNs4SolutionRegistryModuleBlock as buildSolutionRegistryModuleBlock,
  serializeNs4SolutionRegistry as serializeSolutionRegistry,
} from '/_102035_/l2/agentNewSolution/helpers/organizationRegistry.js';

export {
  validateNs4SolutionRegistry as validateSolutionRegistry,
} from '/_102035_/l2/agentNewSolution/helpers/registryGate.js';
export type {
  Ns4RegistryGateIssue as SolutionRegistryGateIssue,
  Ns4RegistryGateResult as SolutionRegistryGateResult,
} from '/_102035_/l2/agentNewSolution/helpers/registryGate.js';

export {
  NS4_PHRASES as phrases,
  NS4_PHRASE_MAX_LENGTH as PHRASE_MAX_LENGTH,
  isNs4PhraseKey as isPhraseKey,
  ns4Text as text,
  ns4WidgetLabels as widgetLabels,
  normalizeNs4Phrases as normalizePhrases,
  ns4PlannerPhrasesAppendix as plannerPhrasesAppendix,
} from '/_102035_/l2/agentNewSolution/helpers/ns4Text.js';
export type {
  Ns4PhraseKey as PhraseKey,
  Ns4PhraseHolder as PhraseHolder,
  Ns4PhrasesNormalization as PhrasesNormalization,
} from '/_102035_/l2/agentNewSolution/helpers/ns4Text.js';

export {
  createNs4FlexibleWorkerTool as createStrictArtifactTool,
  unwrapNs4FlexibleWorkerPayload as unwrapArtifactPayload,
} from '/_102035_/l2/agentNewSolution/helpers/ns4WorkerTools.js';

export {
  readNs4L5Config as readL5Config,
  writeNs4L5Config as writeL5Config,
  readNs4L5Project as readL5Project,
  writeNs4L5Project as writeL5Project,
  writeNs4SolutionRegistry as writeSolutionRegistry,
} from '/_102035_/l2/agentNewSolution/helpers/ns4Fs.js';

export {
  applyPlatformBlockDefaults,
  buildProjectsBlock,
  buildWorkspaceDependencies,
  collectProjectJsonIssues,
  collectPublishableConfigIssues,
  ensureProjectAppEnv,
  ensureProjectModule,
  ensureProjectType,
  readProjectTypeFromProjectJson,
} from '/_102035_/l2/agentNewSolution/steps/e10/publishable.js';
export type { PublishableIssue, PublishableProjectType } from '/_102035_/l2/agentNewSolution/steps/e10/publishable.js';

export { resolvableFieldPaths } from '/_102035_/l2/solution/ontologyPaths.js';

export {
  removeModule,
  stripModuleFromJson,
  stripModuleFromRegistry,
} from '/_102035_/l2/solution/removeModule.js';
export type { RemoveModuleOpts, RemoveModuleResult } from '/_102035_/l2/solution/removeModule.js';
