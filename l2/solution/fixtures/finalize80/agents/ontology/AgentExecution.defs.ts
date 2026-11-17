/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/ontology/AgentExecution.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityAgentExecution = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "AgentExecution",
  "title": "Agent execution",
  "description": "Summary of one finished execution of an agent sent by the cm: when, how long, cost, actions and results, whether a person took over, and the link to the conversation. The same execution is recorded only once.",
  "displayField": "startedAt",
  "relationships": {
    "agent": {
      "relationshipId": "executionAgent",
      "to": "Agent",
      "via": "AgentExecution.agentId",
      "cardinality": "N:1",
      "title": "Agent that performed the execution",
      "description": "Every execution belongs to exactly one agent of the cm.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "create": "Records the execution summary the cm sends when an execution finishes, as an upsert on the execution reference, with no screen open.",
    "uniqueKey": "Refuses a second row with the same execution reference, so the same execution sent twice by the cm is recorded only once.",
    "listByForeignKey": "Lists the executions of one agent on the activity scenario of the agent screen, for the company admin and every organization member.",
    "locate.byColumn": "Lists executions filtered by agent and ordered by when they started, newest first, paged, on the activity screen.",
    "read.byId": "Opens one execution with its actions, results, cost, duration and the link to the conversation when a person picks it from the activity list.",
    "count": "Counts the executions of an agent to show the total on the activity header.",
    "agents.openConversation": "Opens the conversation in the cm from the link the execution carries, for the admin or member reading the activity."
  },
  "rules": [
    "executionRecordedOnce",
    "activityNewestFirst",
    "noTechnicalIdsOnScreen"
  ],
  "writer": "inbound",
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "agents_agentexecution",
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
      "agentId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Agent"
        ],
        "title": "Agent",
        "description": "The agent that performed this execution, as known in the cm."
      },
      "executionKey": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "title": "Execution reference",
        "description": "The reference the cm gives to the finished execution. It is used only to record the same execution once and is never shown on a screen.",
        "maxLength": 200
      },
      "startedAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "title": "When",
        "description": "When the execution started. The activity list is ordered by it, newest first."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Execution summary",
        "description": "The summary of the finished execution as the cm sent it.",
        "fields": {
          "finishedAt": {
            "type": "timestamp",
            "title": "Finished at",
            "description": "When the execution finished."
          },
          "durationMs": {
            "type": "integer",
            "required": true,
            "title": "How long",
            "description": "How long the execution took, in milliseconds, shown to people in readable time.",
            "min": 0
          },
          "cost": {
            "type": "money",
            "title": "Cost",
            "description": "What the execution cost, as reported by the cm.",
            "min": 0
          },
          "personTookOver": {
            "type": "boolean",
            "required": true,
            "title": "A person took over",
            "description": "Whether a person took over the conversation during this execution."
          },
          "conversationLink": {
            "type": "string",
            "title": "Conversation",
            "description": "The link the cm gives to open the conversation this execution belongs to.",
            "maxLength": 1000
          },
          "summary": {
            "type": "text",
            "title": "Summary",
            "description": "A short plain-language summary of what the agent did."
          },
          "actions": {
            "type": "object",
            "collection": true,
            "title": "Actions and results",
            "description": "The actions the agent performed in this execution, in order, each with its result.",
            "fields": {
              "toolId": {
                "type": "record",
                "to": [
                  "Tool"
                ],
                "title": "Tool",
                "description": "The tool of the catalog the action used, when it is one of the catalog; shown by its readable name."
              },
              "actionName": {
                "type": "string",
                "required": true,
                "title": "Action",
                "description": "The readable name of the action as the cm reported it.",
                "maxLength": 200
              },
              "result": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "success",
                    "title": "Done"
                  },
                  {
                    "value": "failed",
                    "title": "Failed"
                  },
                  {
                    "value": "refused",
                    "title": "Not allowed"
                  }
                ],
                "title": "Result",
                "description": "How the action ended."
              },
              "resultText": {
                "type": "text",
                "title": "Result details",
                "description": "What the action returned or why it failed, in plain language."
              }
            }
          },
          "actionCount": {
            "type": "integer",
            "derived": true,
            "title": "Number of actions",
            "description": "How many actions the agent performed in this execution."
          },
          "hadFailure": {
            "type": "boolean",
            "derived": true,
            "title": "Had a failure",
            "description": "True when at least one action of this execution failed or was not allowed."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "executionKey"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityAgentExecutionType = typeof agentsEntityAgentExecution;

export default agentsEntityAgentExecution;
