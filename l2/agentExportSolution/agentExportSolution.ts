/// <mls fileReference="_102035_/l2/agentExportSolution/agentExportSolution.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readAgentProvenance } from '/_102035_/l2/agentNewSolution/helpers/ns4BuildStamp.js';
import { NS4_LEVEL1_SCHEMA_VERSION } from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';
import {
  listNs4ModuleFolders,
  ns4FileExists,
  ns4ModuleFile,
  readNs4Pipeline,
  readNs4SolutionRegistry,
  readNs4Text,
} from '/_102035_/l2/agentNewSolution/helpers/ns4Fs.js';
import {
  packSolution,
  packSolutionZip,
  parseArtifact,
  parseExportInvocation,
  type SolutionModuleInput,
} from '/_102035_/l2/agentExportSolution/helpers/packSolution.js';
import { zipBytesToBinaryString } from '/_102035_/l2/agentExportSolution/helpers/storedZip.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentExportSolution',
    agentProject: 102035,
    agentFolder: 'agentExportSolution',
    agentDescription: 'Pack l4 modules into a portable solution.zip for the catalog',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const modules = parseExportInvocation(userPrompt || '');
  if (!modules.length) {
    return [statusTask(agent, context, 'Provide one or more module names after @@exportSolution.', true)];
  }
  const existing = listNs4ModuleFolders();
  const missing = modules.filter(name => !existing.has(name) || !ns4FileExists(ns4ModuleFile(name)));
  if (missing.length) {
    return [statusTask(agent, context, `Module not found: ${missing.join(', ')}.`, true)];
  }
  const catalogPrompt = await readExportPrompt();
  return [{
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [{ type: 'system', content: catalogPrompt }],
      taskTitle: `export ${modules.join(' ')}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'exportSolution',
        modules: modules.join(','),
      },
    },
  }];
}

async function beforePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  _step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const modules = memoryModules(context);
  const summaries = await Promise.all(modules.map(summarizeModule));
  return [{
    type: 'prompt_ready',
    args: '',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    humanPrompt: summaries.join('\n\n'),
  }];
}

async function afterPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const modules = memoryModules(context);
  const description = catalogDescriptionOf(step) || modules.join(', ');
  const packed = await buildPackedSolution(modules, description);
  const zip = packSolutionZip(packed);
  await writeExportText({ project: mls.actualProject || 0, level: 4, folder: 'organization', shortName: 'solution', extension: '.json' }, `${JSON.stringify(packed.manifest, null, 2)}\n`);
  await writeExportText({ project: mls.actualProject || 0, level: 4, folder: 'organization', shortName: 'solution', extension: '.zip' }, zipBytesToBinaryString(zip));
  return [{
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status: 'completed',
    cleaner: 'input_output',
    traceMsg: `Exported ${modules.join(', ')} to l4/organization/solution.zip`,
  }];
}

export { parseExportInvocation };

async function buildPackedSolution(modules: string[], catalogDescription: string) {
  const registry = await readNs4SolutionRegistry();
  const inputs: SolutionModuleInput[] = [];
  const actors: Array<{ moduleName: string; actorId: string; kind: string }> = [];
  const roles: Array<{ mdmSubtype: string; role: string; namespace: string }> = [];
  for (const moduleName of modules) {
    const files = await readModuleL4Files(moduleName);
    const pipeline = await readNs4Pipeline(moduleName);
    const moduleArtifact = parseArtifact(files.find(file => file.relativePath === 'module.defs.ts')?.content || '');
    const sourceLanguage = languageOf(moduleArtifact) || pipeline?.presentation.userLanguage || 'en';
    inputs.push({
      moduleName,
      sourceLanguage,
      sourcePrompt: pipeline?.sourcePrompt || '',
      files,
    });
    const block = registry?.modules.find(item => item.moduleName === moduleName);
    if (block) {
      actors.push(...block.actors.map(actor => ({ moduleName, actorId: actor.actorId, kind: actor.kind })));
      roles.push(...block.roles);
    }
  }
  const provenance = await readAgentProvenance().catch(() => ({ buildRef: '' }));
  return packSolution({
    modules: inputs,
    sourceProjectId: mls.actualProject || 0,
    level1SchemaVersion: registry?.level1SchemaVersion || NS4_LEVEL1_SCHEMA_VERSION,
    level1Roles: uniqueRoles(roles),
    actors,
    platformCommit: provenance.buildRef || '',
    catalogDescription,
  });
}

async function readModuleL4Files(moduleName: string): Promise<Array<{ relativePath: string; content: string }>> {
  const project = mls.actualProject || 0;
  const prefix = `${moduleName}/`;
  const files: Array<{ relativePath: string; content: string }> = [];
  for (const file of Object.values(mls.stor.files) as Array<{
    project?: number; level?: number; folder?: string; shortName?: string; extension?: string; status?: string;
  }>) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    const folder = String(file.folder || '');
    if (folder !== moduleName && !folder.startsWith(prefix)) continue;
    const relative = folder === moduleName
      ? `${file.shortName}${file.extension}`
      : `${folder.slice(prefix.length)}/${file.shortName}${file.extension}`;
    const content = await readNs4Text({
      project, level: 4, folder, shortName: String(file.shortName), extension: String(file.extension),
    }, false);
    if (content) files.push({ relativePath: relative, content });
  }
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

async function summarizeModule(moduleName: string): Promise<string> {
  const raw = await readNs4Text(ns4ModuleFile(moduleName), false);
  const artifact = parseArtifact(raw);
  const title = stringAt(artifact, ['module', 'title']) || moduleName;
  const purpose = stringAt(artifact, ['module', 'purpose']);
  const actors = Array.isArray((artifact as { businessScope?: { actors?: unknown } } | null)?.businessScope?.actors)
    ? ((artifact as { businessScope: { actors: Array<{ actorId?: string; title?: string; kind?: string }> } }).businessScope.actors)
      .map(actor => `${actor.title || actor.actorId} (${actor.kind || ''})`).join(', ')
    : '';
  return [`Module: ${moduleName}`, `Title: ${title}`, purpose ? `Purpose: ${purpose}` : '', actors ? `Actors: ${actors}` : '']
    .filter(Boolean).join('\n');
}

function catalogDescriptionOf(step: mls.msg.AIAgentStep): string {
  const payload = step.interaction?.payload?.[0] as { type?: string; result?: { description?: unknown } } | undefined;
  const fromFlexible = payload?.result && typeof payload.result.description === 'string' ? payload.result.description.trim() : '';
  if (fromFlexible) return fromFlexible;
  const raw = typeof payload === 'object' && payload && 'description' in payload
    ? String((payload as { description?: unknown }).description || '').trim()
    : '';
  return raw;
}

function languageOf(artifact: Record<string, unknown> | null): string {
  if (!artifact) return '';
  const presentation = artifact.presentation as { userLanguage?: unknown } | undefined;
  if (typeof presentation?.userLanguage === 'string' && presentation.userLanguage) return presentation.userLanguage;
  if (typeof artifact.userLanguage === 'string') return artifact.userLanguage;
  return '';
}

function stringAt(value: unknown, path: string[]): string {
  let cursor: unknown = value;
  for (const key of path) {
    if (!cursor || typeof cursor !== 'object') return '';
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return typeof cursor === 'string' ? cursor : '';
}

function uniqueRoles(roles: Array<{ mdmSubtype: string; role: string; namespace: string }>) {
  const seen = new Set<string>();
  return roles.filter(role => {
    const key = `${role.namespace}|${role.role}|${role.mdmSubtype}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function memoryModules(context: mls.msg.ExecutionContext): string[] {
  const raw = context.task?.iaCompressed?.longMemory?.modules;
  const text = typeof raw === 'string' ? raw : '';
  return text.split(',').map(item => item.trim()).filter(Boolean);
}

async function readExportPrompt(): Promise<string> {
  return readNs4Text({ project: 102035, level: 2, folder: 'agentExportSolution', shortName: 'promptCatalog', extension: '.md' }, true);
}

async function writeExportText(
  fileInfo: { project: number; level: number; folder: string; shortName: string; extension: string },
  content: string,
): Promise<void> {
  const { createStorFile } = await import('/_102027_/l2/libStor.js');
  const key = mls.stor.getKeyToFile(fileInfo);
  let file = mls.stor.files[key];
  if (!file) file = await createStorFile({ ...fileInfo, source: content }, false, false, false);
  else if (file.status === 'deleted') {
    file.status = 'changed';
    file.updatedAt = new Date().toISOString();
  }
  await mls.stor.localStor.setContent(file, { contentType: 'string', content });
}

function statusTask(agent: IAgentMeta, context: mls.msg.ExecutionContext, message: string, isError: boolean): mls.msg.AgentIntentAddMessageAI {
  return {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: `<!-- modelType: general -->\n${message}` },
        { type: 'human', content: message },
      ],
      taskTitle: 'export Solution',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'exportSolution',
        statusOnly: 'true',
        statusOutcome: isError ? 'error' : 'info',
      },
    },
  };
}
