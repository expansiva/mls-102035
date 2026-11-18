/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/ontology/ExecutionSummary.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityExecutionSummary = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "ExecutionSummary",
  "title": "Execution summary",
  "description": "The summary the cm sends for each finished execution of an agent: when, how long, cost, actions and results, whether a person took over, and the conversation link. The same execution is never recorded twice.",
  "displayField": "startedAt",
  "relationships": {
    "agent": {
      "relationshipId": "executionSummaryAgent",
      "to": "Agent",
      "via": "ExecutionSummary.agentId",
      "cardinality": "N:1",
      "title": "Agent",
      "description": "The agent that ran the execution; many summaries belong to one agent.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Reads one execution summary when the activity screen already holds its id, to show the full list of actions and results.",
    "locate.byColumn": "Lists the executions of one agent ordered by start moment, newest first and paged, for the activity scenario used by the company admin.",
    "listByForeignKey": "Lists the executions that point at an agent, or at many agents at once, to fill the activity scenario of each agent screen.",
    "count": "Counts the executions of an agent for the header of the activity scenario.",
    "create": "Writes the summary of a finished execution when the cm sends it, with no screen open; it is the only way a row is born.",
    "uniqueKey": "Refuses a second row with the same execution key, so the same execution is never recorded twice even if the cm resends it.",
    "agents.recordExecution": "Receives the cm's summary of a finished execution, checks the execution key and records it once, ignoring repeats; run by the executionRecording process."
  },
  "rules": [
    "executionRecordedOnce",
    "executionSummaryIsImmutable"
  ],
  "writer": "inbound",
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "agents_executionsummary",
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
        "description": "The agent that ran this execution. The agent itself lives in the cm; this column only points at it so the activity list can be filtered by agent."
      },
      "executionId": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "title": "Execution key",
        "description": "The key the cm gives to the finished execution. It makes the recording idempotent: the same execution arriving twice is recognised and never recorded a second time. It is never shown on a screen.",
        "maxLength": 120
      },
      "startedAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "title": "Started at",
        "description": "When the execution started, as the cm reports it. The activity scenario orders executions by this moment, newest first."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "Everything the cm summarises about the finished execution.",
        "fields": {
          "durationMs": {
            "type": "integer",
            "required": true,
            "title": "Duration (ms)",
            "description": "How long the execution took, in milliseconds. The screen shows it in a readable form such as seconds.",
            "min": 0
          },
          "cost": {
            "type": "money",
            "required": true,
            "title": "Cost",
            "description": "What the execution cost, as the cm reports it. Only displayed.",
            "min": 0
          },
          "actions": {
            "type": "object",
            "collection": true,
            "title": "Actions and results",
            "description": "The actions the agent performed in this execution, in the order they happened, each with its result. Empty when the agent only answered.",
            "fields": {
              "actionName": {
                "type": "string",
                "required": true,
                "title": "Action",
                "description": "Readable name of the action the agent used, in the words of the tool catalog (module, subject and action).",
                "maxLength": 200
              },
              "result": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "succeeded",
                    "title": "Succeeded"
                  },
                  {
                    "value": "failed",
                    "title": "Failed"
                  },
                  {
                    "value": "refused",
                    "title": "Refused"
                  }
                ],
                "title": "Result",
                "description": "How the action ended."
              },
              "resultSummary": {
                "type": "text",
                "title": "Result summary",
                "description": "One short sentence of what the action returned or why it failed or was refused.",
                "maxLength": 1000
              }
            }
          },
          "tookOver": {
            "type": "boolean",
            "required": true,
            "title": "A person took over",
            "description": "Whether a person took over the conversation during or after this execution."
          },
          "conversationLink": {
            "type": "string",
            "title": "Conversation link",
            "description": "The address that opens the conversation of this execution in the cm, so the admin can read it in context.",
            "maxLength": 500
          },
          "hadFailure": {
            "type": "boolean",
            "derived": true,
            "title": "Had a failed action",
            "description": "True when at least one of the actions of this execution ended failed or refused; read from the results of its actions list."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "executionId"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityExecutionSummaryType = typeof agentsEntityExecutionSummary;

export default agentsEntityExecutionSummary;
