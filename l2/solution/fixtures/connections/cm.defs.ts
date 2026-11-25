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

export type CmAgentAudience = 'member' | 'room' | 'external';

/** A text a person wrote in a conversation of a channel (Telegram, WhatsApp…), delivered to the cm. The agent that answers goes in `context.agentId`; the repeat key in the call options. */
export interface CmChannelMessageReceivedInput {
  /** The reference of the conversation in the channel, as the channel module names it. */
  conversationRef: string;
  audience: CmAgentAudience;
  conversationKind: 'person' | 'group';
  /** Who wrote the text. */
  author: { channelAccountId: string; name: string };
  /** When the person wrote it, ISO 8601. */
  writtenAt: string;
  text: string;
}
export interface CmChannelMessageReceivedOutput {
  /** The room of the conversation in the cm. */
  threadId: string;
  /** The reference the cm gave to the message. */
  messageRef: string;
}

/** The cm asks the channel module to send a text. A refusal is the error `refused` (e.g. the Telegram accepts no `address`). */
export interface CmSendChannelMessageInput {
  /** An existing conversation, or an address of the channel with the bot that sends it. */
  to: { conversationRef: string } | { address: string; botRef: string };
  text: string;
}
export interface CmSendChannelMessageOutput {
  /** The id the channel gave to the message sent. */
  channelMessageId: string;
}

/** The cm tells the channel module who the person of a conversation is. No `identity` clears it (back to anonymous). */
export interface CmSetChannelConversationIdentityInput {
  conversationRef: string;
  /** The person, by e-mail or by the mdm id; absent clears it. */
  identity?: { email: string } | { mdmId: string };
  displayName?: string;
  /** Since when the identity holds, ISO 8601. */
  since?: string;
}
export interface CmSetChannelConversationIdentityOutput {}

/** The cm asks to block a conversation or to pause a bot of the channel. */
export interface CmDisableChannelInput {
  target: { conversationRef: string } | { botRef: string };
  /** Why it is disabled. */
  reason: string;
}
export interface CmDisableChannelOutput {}

/** A module asks the cm to tell a person something. A refusal is the error `refused`. */
export interface CmNotifyPersonInput {
  /** How to reach the person (e-mail, phone, handle of a channel). */
  contact: string;
  /** The person in the mdm, when the module knows it. */
  mdmId?: string;
  text: string;
}
export interface CmNotifyPersonOutput {
  /** `no_channel`: the cm found no channel to reach the person. */
  status: 'sent' | 'no_channel';
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
    {
      operationId: 'channelMessageReceived',
      direction: 'call',
      kind: 'command',
      description: 'Deliver to the cm a text message a person wrote in a conversation of a channel (Telegram, WhatsApp…): the conversation reference, the audience, the agent that answers, the author, when and the text. The cm answers with its room and its reference for the message.',
      inputType: 'CmChannelMessageReceivedInput',
      outputType: 'CmChannelMessageReceivedOutput',
      reply: 'now',
    },
    {
      operationId: 'sendChannelMessage',
      direction: 'serve',
      kind: 'command',
      description: 'The cm asks the channel module to send a text to a conversation of the channel, as an answer or at any time.',
      inputType: 'CmSendChannelMessageInput',
      outputType: 'CmSendChannelMessageOutput',
      reply: 'now',
      hiddenFromAgents: true,
    },
    {
      operationId: 'setChannelConversationIdentity',
      direction: 'serve',
      kind: 'command',
      description: 'The cm tells the channel module who the person of a conversation is, or clears it.',
      inputType: 'CmSetChannelConversationIdentityInput',
      outputType: 'CmSetChannelConversationIdentityOutput',
      reply: 'now',
      hiddenFromAgents: true,
    },
    {
      operationId: 'disableChannel',
      direction: 'serve',
      kind: 'command',
      description: 'The cm asks, in an extreme case, to block a conversation or to pause a bot of the channel, with the reason.',
      inputType: 'CmDisableChannelInput',
      outputType: 'CmDisableChannelOutput',
      reply: 'now',
      hiddenFromAgents: true,
    },
    {
      operationId: 'notifyPerson',
      direction: 'call',
      kind: 'command',
      description: 'A module asks the cm to tell a person something: the text and the contact. The cm records it in the room of that person and sends it through a channel. No AI.',
      inputType: 'CmNotifyPersonInput',
      outputType: 'CmNotifyPersonOutput',
      reply: 'now',
    },
  ],
};

export default catalog;
