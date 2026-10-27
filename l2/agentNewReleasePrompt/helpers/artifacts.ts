/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/artifacts.ts" enhancement="_blank" />

import {
  accessFile,
  fileExists,
  integrationFile,
  journeyFile,
  journeyIndexFile,
  liveFiles,
  moduleFile,
  ontologyEntityFile,
  ontologyIndexFile,
  readDefsJson,
  readOntologyEntityAny,
  readSourceText,
  rulesFile,
  setModuleRoot,
  workflowsFile,
  writeSourceText,
  type Ns5FileInfo,
  type Ns5LiveFileRecord,
} from '/_102035_/l2/solution/fs.js';
import { ns5OntologyEntityIds, type Ns5OntologyAnyIndex } from '/_102035_/l2/solution/ontologyView.js';
import type {
  Ns5AccessArtifact,
  Ns5IntegrationArtifact,
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleArtifact,
  Ns5OntologyAnyEntity,
  Ns5RulesAny,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';
import { NRP_CANDIDATE_REL, type NrpInvocation } from '/_102035_/l2/agentNewReleasePrompt/helpers/invocation.js';
import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';

const SKIP = /\/(tobe|pipeline|pool)(\/|$)/;

function canonicalDefs(project: number, moduleName: string): Array<{ folder: string; shortName: string }> {
  const files = liveFiles(mls.stor.files as Ns5LiveFileRecord);
  const listed: Array<{ folder: string; shortName: string }> = [];
  for (const file of files) {
    if (file.project !== project || file.level !== 4 || file.extension !== '.defs.ts') continue;
    const folder = String(file.folder || '');
    if (folder !== moduleName && !folder.startsWith(`${moduleName}/`)) continue;
    if (SKIP.test(`/${folder}/`)) continue;
    listed.push({ folder, shortName: String(file.shortName || '') });
  }
  return listed;
}

function tobeInfo(project: number, moduleName: string, folder: string, shortName: string): Ns5FileInfo {
  const rest = folder === moduleName ? '' : folder.slice(moduleName.length + 1);
  const tobeFolder = rest ? `${moduleName}/${NRP_CANDIDATE_REL}/${rest}` : `${moduleName}/${NRP_CANDIDATE_REL}`;
  return { project, level: 4, folder: tobeFolder, shortName, extension: '.defs.ts' };
}

export async function ensureEditRoot(invocation: NrpInvocation): Promise<{ copied: number; root: string }> {
  setModuleRoot(invocation.moduleName, null);
  const canonical = moduleFile(invocation.moduleName);
  if (!fileExists(canonical)) throw new Error(`Module ${invocation.moduleName} is missing.`);
  const root = `${invocation.moduleName}/${NRP_CANDIDATE_REL}`;
  const existing = { project: invocation.project, level: 4, folder: root, shortName: 'module', extension: '.defs.ts' };
  if (fileExists(existing)) {
    setModuleRoot(invocation.moduleName, root);
    return { copied: 0, root };
  }
  const files = canonicalDefs(invocation.project, invocation.moduleName);
  if (!files.length) throw new Error(`Module ${invocation.moduleName} has no L4 artifacts.`);
  let copied = 0;
  for (const file of files) {
    const from: Ns5FileInfo = {
      project: invocation.project, level: 4, folder: file.folder, shortName: file.shortName, extension: '.defs.ts',
    };
    const to = tobeInfo(invocation.project, invocation.moduleName, file.folder, file.shortName);
    if (fileExists(to)) continue;
    await writeSourceText(to, await readSourceText(from));
    copied += 1;
  }
  setModuleRoot(invocation.moduleName, root);
  return { copied, root };
}

export async function loadNrpArtifacts(moduleName: string): Promise<NrpModuleArtifacts> {
  const module = await readDefsJson<Ns5ModuleArtifact>(moduleFile(moduleName));
  const journeyIndex = await readDefsJson<Ns5JourneyIndexArtifact>(journeyIndexFile(moduleName));
  const ontologyIndex = await readDefsJson<Ns5OntologyAnyIndex>(ontologyIndexFile(moduleName));
  const rules = await readDefsJson<Ns5RulesAny>(rulesFile(moduleName));
  const workflows = await readDefsJson<Ns5WorkflowsArtifact>(workflowsFile(moduleName));
  const access = await readDefsJson<Ns5AccessArtifact>(accessFile(moduleName));
  const integration = await readDefsJson<Ns5IntegrationArtifact>(integrationFile(moduleName));
  if (!module || !journeyIndex || !ontologyIndex || !rules || !workflows || !access || !integration) {
    throw new Error(`Incomplete L4 for ${moduleName}.`);
  }
  const journeys: Ns5JourneyArtifact[] = [];
  for (const entry of journeyIndex.journeys) {
    const journey = await readDefsJson<Ns5JourneyArtifact>(journeyFile(moduleName, entry.journeyId));
    if (!journey) throw new Error(`Missing journey ${entry.journeyId}.`);
    journeys.push(journey);
  }
  const entities: Ns5OntologyAnyEntity[] = [];
  for (const entityId of ns5OntologyEntityIds(ontologyIndex)) {
    const entity = await readOntologyEntityAny(ontologyEntityFile(moduleName, entityId));
    if (!entity) throw new Error(`Missing entity ${entityId}.`);
    entities.push(entity);
  }
  return { module, journeyIndex, journeys, ontologyIndex, entities, rules, workflows, access, integration };
}
