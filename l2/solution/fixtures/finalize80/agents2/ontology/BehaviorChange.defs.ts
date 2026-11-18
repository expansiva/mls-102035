/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/ontology/BehaviorChange.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityBehaviorChange = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "BehaviorChange",
  "title": "Behavior change",
  "description": "One change of an agent's behavior in the cm history, with who, when and a one-line summary. Requested by a prompt and undone through the cm.",
  "displayField": "summary",
  "relationships": {},
  "capabilities": {},
  "rules": [
    "memberChangesOwnConductOnly",
    "memberUndoesOwnChangesOnly",
    "behaviorChangedThroughCm"
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
      "summary": {
        "type": "string",
        "required": true,
        "title": "Summary",
        "description": "One-line summary of the change, written by the cm and shown in the change history.",
        "maxLength": 200
      },
      "changedAt": {
        "type": "timestamp",
        "required": true,
        "title": "When",
        "description": "When the cm applied the change."
      },
      "changedBy": {
        "type": "record",
        "required": true,
        "to": [
          "Person"
        ],
        "title": "Who",
        "description": "The person who asked for the change: the company admin, or the member changing their own conduct."
      },
      "request": {
        "type": "text",
        "required": true,
        "title": "What you want to change",
        "description": "What the person wrote in the box \"what do you want to change\", in plain language."
      },
      "scope": {
        "type": "enum",
        "required": true,
        "values": [
          {
            "value": "agent",
            "title": "The whole agent"
          },
          {
            "value": "personal",
            "title": "Only for me"
          }
        ],
        "title": "Applies to",
        "description": "Whether the change applies to the agent's behavior for everyone or only to the conduct with the person on whose behalf it acts."
      },
      "onBehalfOf": {
        "type": "record",
        "to": [
          "Person"
        ],
        "title": "For whom",
        "description": "The person whose own conduct with the agent this change adjusts; filled only when the change applies only for that person."
      },
      "situation": {
        "type": "enum",
        "required": true,
        "values": [
          {
            "value": "applied",
            "title": "Applied"
          },
          {
            "value": "undone",
            "title": "Undone"
          }
        ],
        "title": "Situation",
        "description": "Whether the change is in force or was undone, as the cm reports it."
      },
      "undoneAt": {
        "type": "timestamp",
        "title": "Undone at",
        "description": "When the change was undone and the earlier behavior restored by the cm."
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityBehaviorChangeType = typeof agentsEntityBehaviorChange;

export default agentsEntityBehaviorChange;
