/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/ontology/BehaviorChange.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityBehaviorChange = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "BehaviorChange",
  "title": "Behavior change",
  "description": "One change of an agent's behavior in the cm history, with who, when and a one-line summary; can be undone.",
  "displayField": "summary",
  "relationships": {},
  "capabilities": {},
  "rules": [
    "onlyAdminChangesAgentBehavior",
    "undoRestoresPreviousBehavior",
    "behaviorChangeRecordedByCm"
  ],
  "kind": "external",
  "source": "/_102034_/l4/ontology/connections/cm.defs.ts",
  "record": {
    "fields": {
      "agent": {
        "type": "record",
        "required": true,
        "to": [
          "Agent"
        ],
        "title": "Agent",
        "description": "The agent whose behavior was changed, as the cm keeps it."
      },
      "changedAt": {
        "type": "timestamp",
        "required": true,
        "title": "When",
        "description": "When the cm applied the change to the agent behavior; the history is shown newest first."
      },
      "changedBy": {
        "type": "record",
        "required": true,
        "to": [
          "OrganizationMember"
        ],
        "title": "Who",
        "description": "The person who asked for the change, shown by name in the history."
      },
      "summary": {
        "type": "string",
        "required": true,
        "title": "Summary",
        "description": "One-line summary of the change, written by the cm and shown in the history.",
        "maxLength": 200
      },
      "requestText": {
        "type": "text",
        "required": true,
        "title": "What was asked",
        "description": "What the admin wrote in the box \"what do you want to change\"."
      },
      "undone": {
        "type": "boolean",
        "required": true,
        "title": "Undone",
        "description": "Whether this change was undone and the behavior it replaced was restored, as the cm reports it."
      },
      "undoneAt": {
        "type": "timestamp",
        "title": "Undone at",
        "description": "When the change was undone and the previous behavior restored."
      },
      "undoneBy": {
        "type": "record",
        "to": [
          "OrganizationMember"
        ],
        "title": "Undone by",
        "description": "The admin who undid the change, shown by name."
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityBehaviorChangeType = typeof agentsEntityBehaviorChange;

export default agentsEntityBehaviorChange;
