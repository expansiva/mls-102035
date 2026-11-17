/// <mls fileReference="_102035_/l2/solution/fixtures/connections/cm.defs.ts" enhancement="_blank"/>

import type {
  Ns5ConnectionCatalog,
} from '/_102035_/l2/solution/helpers/connectionCatalog.js';

export interface CmListAgentsInput {
  status?: string;
}
export interface CmListAgentsOutput {
  agents: { agentId: string; status: string }[];
}

export interface CmReadAgentInput {
  agentId: string;
}
export interface CmReadAgentOutput {
  agentId: string;
  version: string;
}

export interface CmUpdateAgentInput {
  agentId: string;
  expectVersion: string;
}
export interface CmUpdateAgentOutput {
  agentId: string;
  version: string;
}

export interface CmListAgentHistoryInput {
  agentId: string;
}
export interface CmListAgentHistoryOutput {
  entries: { at: string; author: string }[];
}

export interface CmUndoAgentChangeInput {
  agentId: string;
  expectVersion: string;
}
export interface CmUndoAgentChangeOutput {
  agentId: string;
  version: string;
}

export interface CmSimulateAgentInput {
  agentId: string;
  prompt: string;
}
export interface CmSimulateAgentOutput {
  result: string;
}

export interface CmCreateAgentInput {
  prompt: string;
}
export interface CmCreateAgentOutput {
  draftId: string;
}

export interface CmActivateAgentInput {
  draftId: string;
}
export interface CmActivateAgentOutput {
  agentId: string;
}

export interface CmDiscardAgentDraftInput {
  draftId: string;
}
export interface CmDiscardAgentDraftOutput {
  discarded: boolean;
}

export interface CmListCmToolsInput {
  agentId?: string;
}
export interface CmListCmToolsOutput {
  tools: { toolId: string }[];
}

export interface CmRunAiPromptInput {
  prompt: string;
  outputFormat: string;
}
export interface CmRunAiPromptOutput {
  text: string;
}

export interface CmAgentDraftReadyInput {
  draftId: string;
  refused?: string;
}
export interface CmAgentDraftReadyOutput {
  received: boolean;
}

export interface CmDescribeInput {
  agentId: string;
}
export interface CmDescribeOutput {
  version: string;
  toolsMode: string;
  tools: string[];
  allowed: string[];
}

export interface CmRecordInput {
  executionId: string;
  summary: string;
}
export interface CmRecordOutput {
  recorded: boolean;
}

const catalog: Ns5ConnectionCatalog = {
  schemaVersion: 'connection-catalog-v1',
  connectionId: 'cm',
  title: 'collab.messages',
  description: 'Closed catalog of collab.messages operations a module may call or serve.',
  operations: [
    {
      operationId: 'listAgents',
      direction: 'call',
      kind: 'query',
      description: 'List agents, including drafts and their status.',
      inputType: 'CmListAgentsInput',
      outputType: 'CmListAgentsOutput',
      reply: 'now',
    },
    {
      operationId: 'readAgent',
      direction: 'call',
      kind: 'query',
      description: 'Read definition, ROLE, STATE, enabled flag, owner, limits and version.',
      inputType: 'CmReadAgentInput',
      outputType: 'CmReadAgentOutput',
      reply: 'now',
    },
    {
      operationId: 'updateAgent',
      direction: 'call',
      kind: 'command',
      description: 'Change by prompt or field, with expectVersion and author; also enable, owner and limits.',
      inputType: 'CmUpdateAgentInput',
      outputType: 'CmUpdateAgentOutput',
      reply: 'now',
    },
    {
      operationId: 'listAgentHistory',
      direction: 'call',
      kind: 'query',
      description: 'List change history with author and date.',
      inputType: 'CmListAgentHistoryInput',
      outputType: 'CmListAgentHistoryOutput',
      reply: 'now',
    },
    {
      operationId: 'undoAgentChange',
      direction: 'call',
      kind: 'command',
      description: 'Undo one change, with expectVersion.',
      inputType: 'CmUndoAgentChangeInput',
      outputType: 'CmUndoAgentChangeOutput',
      reply: 'now',
    },
    {
      operationId: 'simulateAgent',
      direction: 'call',
      kind: 'command',
      description: 'Simulate what the agent can do and what it understands; nothing is stored.',
      inputType: 'CmSimulateAgentInput',
      outputType: 'CmSimulateAgentOutput',
      reply: 'now',
    },
    {
      operationId: 'createAgent',
      direction: 'call',
      kind: 'command',
      description: 'Create from prompt plus tool catalog; returns draftId.',
      inputType: 'CmCreateAgentInput',
      outputType: 'CmCreateAgentOutput',
      reply: 'later',
      resultOperation: 'agentDraftReady',
    },
    {
      operationId: 'activateAgent',
      direction: 'call',
      kind: 'command',
      description: 'Make the draft the live agent.',
      inputType: 'CmActivateAgentInput',
      outputType: 'CmActivateAgentOutput',
      reply: 'now',
    },
    {
      operationId: 'discardAgentDraft',
      direction: 'call',
      kind: 'command',
      description: 'Discard the draft.',
      inputType: 'CmDiscardAgentDraftInput',
      outputType: 'CmDiscardAgentDraftOutput',
      reply: 'now',
    },
    {
      operationId: 'listCmTools',
      direction: 'call',
      kind: 'query',
      description: 'List tools of the collab.messages itself.',
      inputType: 'CmListCmToolsInput',
      outputType: 'CmListCmToolsOutput',
      reply: 'now',
    },
    {
      operationId: 'runAiPrompt',
      direction: 'call',
      kind: 'command',
      description: 'One-off AI prompt plus output format, without a process Task.',
      inputType: 'CmRunAiPromptInput',
      outputType: 'CmRunAiPromptOutput',
      reply: 'now',
      timeoutMs: 120000,
    },
    {
      operationId: 'agentDraftReady',
      direction: 'serve',
      kind: 'command',
      description: 'Draft preparation finished: ready with suggested tools, or refused with a reason.',
      inputType: 'CmAgentDraftReadyInput',
      outputType: 'CmAgentDraftReadyOutput',
      reply: 'now',
    },
    {
      operationId: 'describe',
      direction: 'serve',
      kind: 'query',
      description: 'Only the agent tools: version, toolsMode, tools, allowed.',
      inputType: 'CmDescribeInput',
      outputType: 'CmDescribeOutput',
      reply: 'now',
      hiddenFromAgents: true,
      noRowLimit: true,
    },
    {
      operationId: 'record',
      direction: 'serve',
      kind: 'command',
      description: 'Summary of one execution, idempotent by executionId.',
      inputType: 'CmRecordInput',
      outputType: 'CmRecordOutput',
      reply: 'now',
      hiddenFromAgents: true,
    },
  ],
};

export default catalog;
