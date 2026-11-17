/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/ontology/MemberConduct.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityMemberConduct = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "MemberConduct",
  "title": "My conduct with an agent",
  "description": "How an agent that acts on a member's behalf behaves for that member, kept in the cm and changed only by that member.",
  "displayField": "summary",
  "relationships": {},
  "capabilities": {},
  "rules": [
    "memberChangesOnlyOwnConduct",
    "conductChangedOnlyThroughCm"
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
        "description": "The agent that acts on this member's behalf."
      },
      "member": {
        "type": "record",
        "required": true,
        "to": [
          "OrganizationMember"
        ],
        "title": "Member",
        "description": "The organization member this conduct applies to; always the person signed in."
      },
      "summary": {
        "type": "string",
        "required": true,
        "title": "Conduct summary",
        "description": "One line saying how the agent behaves for this member."
      },
      "conductText": {
        "type": "text",
        "title": "How the agent behaves for me",
        "description": "The agent's current conduct with this member, in plain language, as the cm keeps it."
      },
      "changeRequest": {
        "type": "text",
        "title": "What do you want to change",
        "description": "What the member writes should change in the agent's conduct with them; the cm applies it only to this member's conduct."
      },
      "updatedAt": {
        "type": "timestamp",
        "title": "Last changed",
        "description": "When the cm last changed this conduct."
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityMemberConductType = typeof agentsEntityMemberConduct;

export default agentsEntityMemberConduct;
