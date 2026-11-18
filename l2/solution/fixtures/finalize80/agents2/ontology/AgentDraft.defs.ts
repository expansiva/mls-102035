/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/ontology/AgentDraft.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityAgentDraft = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "AgentDraft",
  "title": "Agent draft",
  "description": "The request to create a virtual employee from a prompt and the situation of its draft (preparing, ready, or refused with the reason). It is applied when the cm announces the result, never twice for the same notice, and ends activated or discarded.",
  "displayField": "title",
  "relationships": {
    "agent": {
      "relationshipId": "agentDraftAgent",
      "to": "Agent",
      "via": "AgentDraft.agentId",
      "cardinality": "N:1",
      "title": "Agent the draft became",
      "mode": "fk",
      "required": "when the draft is activated"
    },
    "suggestedTools": {
      "relationshipId": "agentToolDraft",
      "to": "AgentTool",
      "via": "AgentTool.draftId",
      "cardinality": "1:N",
      "title": "Tools suggested for the draft",
      "mode": "fk",
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Opens one draft for review or to read its refusal reason, when the admin picks its card.",
    "locate.byColumn": "Lists drafts by situation, newest first, on the first screen next to the agents and when opening ready or refused drafts.",
    "locate.byText": "Finds a draft by its title in the search box of the first screen.",
    "count": "Counts drafts by situation for the badges of the first screen.",
    "listByForeignKey": "Lists the suggested tools of a draft and finds the draft an agent came from.",
    "create": "Records the request when the admin sends a prompt describing a new virtual employee, or describes a refused one again.",
    "update": "Applies the proposal or refusal the cm announces, used by the draft-notice process.",
    "transition": "Moves the draft to ready or refused by the cm notice, and to activated or discarded by the company admin.",
    "uniqueKey": "Refuses a second draft for the same cm reference and a second application of the same notice.",
    "transaction": "Applies a ready notice together with the suggested tools, all or nothing.",
    "agents.sendDraftRequest": "Sends the admin's prompt to the cm so it prepares a draft with tools suggested from the catalog.",
    "agents.activateThroughCm": "Asks the cm to activate or discard the draft and shows the cm answer, such as a name already used by another active agent."
  },
  "rules": [
    "draftNoticeAppliedOnce",
    "refusalCarriesReason",
    "activateOnlyReadyDraft",
    "agentNameUniqueAmongActive",
    "adminToolChoiceNeverOverridden",
    "onlyCompanyAdminManagesDrafts"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "agents_agentdraft",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "title": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Title",
        "description": "Short name of the draft shown on its card: the name the cm proposed, or a title taken from the prompt while it is still being prepared. The list orders and searches by it.",
        "maxLength": 120
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "preparing",
            "title": "Preparing"
          },
          {
            "value": "ready",
            "title": "Ready"
          },
          {
            "value": "refused",
            "title": "Refused"
          },
          {
            "value": "activated",
            "title": "Activated"
          },
          {
            "value": "discarded",
            "title": "Discarded"
          }
        ],
        "title": "Situation",
        "description": "Where the draft stands: being prepared by the cm, ready for review, refused with a reason, activated as an agent, or discarded."
      },
      "cmDraftRef": {
        "type": "string",
        "unique": true,
        "indexed": true,
        "derived": true,
        "title": "Draft reference in the cm",
        "description": "Reference the cm gives to this draft when it accepts the request; the draft notices from the cm are matched by it. Never shown on screen."
      },
      "lastNoticeRef": {
        "type": "string",
        "unique": true,
        "indexed": true,
        "derived": true,
        "title": "Last applied notice",
        "description": "Reference of the cm notice (ready or refused) already applied to this draft, so the same notice is never applied twice. Never shown on screen."
      },
      "agentId": {
        "type": "record",
        "indexed": true,
        "to": [
          "Agent"
        ],
        "title": "Agent created",
        "description": "The agent in force that this draft became once the admin activated it."
      },
      "requestedAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Requested at",
        "description": "When the admin sent the prompt to the cm; the list shows newest drafts first."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Draft details",
        "description": "The prompt, what the cm proposed and the outcome of the draft.",
        "fields": {
          "prompt": {
            "type": "text",
            "required": true,
            "title": "Description of the new agent",
            "description": "What the admin wrote about the new virtual employee and its functions, sent to the cm to prepare the draft.",
            "maxLength": 8000
          },
          "previousDraft": {
            "type": "record",
            "to": [
              "AgentDraft"
            ],
            "title": "Draft described again",
            "description": "The refused draft this one corrects, when the admin described the agent again after a refusal."
          },
          "refusalReason": {
            "type": "text",
            "title": "Reason for refusal",
            "description": "The reason the cm gave for refusing the draft, shown on the refused card.",
            "maxLength": 2000
          },
          "proposal": {
            "type": "object",
            "title": "Proposal of the cm",
            "description": "What the cm prepared when the draft became ready, shown for review.",
            "fields": {
              "proposedName": {
                "type": "string",
                "title": "Proposed name",
                "description": "The name people would use to call the agent in a chat, shown as @name.",
                "maxLength": 60
              },
              "behaviorSummary": {
                "type": "text",
                "title": "Proposed behavior",
                "description": "The behavior the cm proposes, in plain language.",
                "maxLength": 4000
              },
              "talksTo": {
                "type": "string",
                "title": "Talks to",
                "description": "Who the proposed agent would talk to, in plain words.",
                "maxLength": 300
              },
              "actsOnBehalfOf": {
                "type": "string",
                "title": "Acts on behalf of",
                "description": "On whose behalf the proposed agent would act, in plain words.",
                "maxLength": 300
              }
            }
          },
          "activationProblem": {
            "type": "text",
            "title": "Activation problem",
            "description": "What the cm answered when it did not activate the draft, such as the name being already used by another active agent; shown to the admin.",
            "maxLength": 1000
          },
          "closedAt": {
            "type": "timestamp",
            "title": "Closed at",
            "description": "When the draft was activated or discarded."
          },
          "suggestedToolCount": {
            "type": "integer",
            "derived": true,
            "title": "Tools on",
            "description": "How many of the tools suggested for this draft are currently turned on."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "cmDraftRef"
    ],
    [
      "lastNoticeRef"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "preparing",
      "reachedBy": "actor"
    },
    {
      "state": "ready",
      "reachedBy": "command"
    },
    {
      "state": "refused",
      "reachedBy": "command"
    },
    {
      "state": "activated",
      "reachedBy": "actor"
    },
    {
      "state": "discarded",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "markDraftReady",
      "from": [
        "preparing"
      ],
      "to": "ready",
      "by": [],
      "description": "The cm announces the draft is ready; the proposal and suggested tools are applied once for that notice.",
      "payload": [
        "lastNoticeRef",
        "title",
        "details.proposal"
      ],
      "ruleRefs": [
        "draftNoticeAppliedOnce"
      ]
    },
    {
      "transitionId": "markDraftRefused",
      "from": [
        "preparing"
      ],
      "to": "refused",
      "by": [],
      "description": "The cm announces the draft is refused, with the reason; applied once for that notice.",
      "payload": [
        "lastNoticeRef",
        "details.refusalReason"
      ],
      "ruleRefs": [
        "draftNoticeAppliedOnce",
        "refusalCarriesReason"
      ]
    },
    {
      "transitionId": "activateDraft",
      "from": [
        "ready"
      ],
      "to": "activated",
      "by": [
        "companyAdmin"
      ],
      "description": "The admin activates the ready draft through the cm; if the name is already used by another active agent the cm refuses and the screen says so.",
      "payload": [
        "agentId"
      ],
      "ruleRefs": [
        "activateOnlyReadyDraft",
        "agentNameUniqueAmongActive"
      ]
    },
    {
      "transitionId": "discardDraft",
      "from": [
        "ready",
        "refused"
      ],
      "to": "discarded",
      "by": [
        "companyAdmin"
      ],
      "description": "The admin discards the draft through the cm.",
      "payload": []
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityAgentDraftType = typeof agentsEntityAgentDraft;

export default agentsEntityAgentDraft;
