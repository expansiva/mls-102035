/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/ontology/Person.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityPerson = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "Person",
  "title": "Person",
  "description": "An organization user, chosen from the platform user list. Used to pick the person whose tools are restricted, the person to simulate as, and the responsible person of an agent. The module never registers her; it keeps nothing of its own in her namespace.",
  "displayField": "details.identification.name",
  "relationships": {
    "toolRestrictions": {
      "relationshipId": "toolRestrictionPerson",
      "to": "ToolRestriction",
      "via": "ToolRestriction.personId",
      "cardinality": "1:N",
      "title": "Tools this person may not use",
      "description": "The tools this person may not use through any agent.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "locate.users": "Lists the organization users with a platform login so the company admin can pick the person whose tools are restricted, members and admins can pick whom to simulate as, and the responsible person of an agent can be chosen.",
    "read.byId": "Reads the person's name by id to show it on tool restrictions, agent cards (responsible person), simulations and activity, for every organization member.",
    "locate.byName": "Finds a person by part of her name in the user picker of the restrictions and simulation screens, used by the company admin and members.",
    "locate.byLogin": "Resolves the person behind the login e-mail when the cm asks which tools the person calling an agent may use now, with no screen open.",
    "listLinks": "Shows the person's relationships, such as MemberOf and ReportsTo, so simulation by role and on-whose-behalf views can read them, for the company admin."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "organizationUsersChosenNotRegistered"
  ],
  "writer": "inbound",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "agents.Person",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "indexed": true,
        "derived": true,
        "description": "mdmId; stable through promotion and merge."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true,
        "writePrecondition": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "An organization user picked from the platform user list.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "subtype": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Person",
                    "title": "Person"
                  }
                ],
                "description": "Always a person here.",
                "title": "Kind of record"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "The person's name, shown when the admin picks whose tools to restrict, whom to simulate as, or who is responsible for an agent.",
                "title": "Name"
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Active"
                  },
                  {
                    "value": "Inactive",
                    "title": "Inactive"
                  },
                  {
                    "value": "Merged",
                    "title": "Merged"
                  },
                  {
                    "value": "Blocked",
                    "title": "Blocked"
                  }
                ],
                "title": "Status",
                "description": "Whether the user is active in the platform; only active users are offered in the picker."
              }
            },
            "description": "How the organization user is recognised in the agents screens."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Platform base data; this module uses none of it."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Platform person data; this module uses none of it."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Fields promoted by the organization; read only here."
          },
          "agents": {
            "type": "object",
            "owner": "module",
            "fields": {
              "loginEmail": {
                "type": "string",
                "derived": true,
                "title": "Login e-mail",
                "description": "The person's login e-mail, read from the platform login; never typed nor stored by this module."
              }
            },
            "description": "This module keeps nothing of its own about the person; the tools she may not use are kept in tool restrictions."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityPersonType = typeof agentsEntityPerson;

export default agentsEntityPerson;
