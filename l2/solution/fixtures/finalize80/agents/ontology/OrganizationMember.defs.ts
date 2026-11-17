/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/ontology/OrganizationMember.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityOrganizationMember = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "OrganizationMember",
  "title": "Organization member",
  "description": "A person of the organization who signs in to the app, chosen from the platform user list; tools can be blocked for them and they can simulate agents and change their own conduct.",
  "displayField": "details.identification.name",
  "relationships": {
    "toolRestrictions": {
      "relationshipId": "restrictionPerson",
      "to": "PersonToolRestriction",
      "via": "PersonToolRestriction.personId",
      "cardinality": "1:N",
      "title": "Tools this person may not use",
      "description": "The tools the company admin marked as not usable by this person through any agent.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "locate.users": "Lists the organization users with a platform login so the company admin picks a person to restrict tools for or to simulate, and shows each member's login e-mail; used by the company admin and by members simulating as themselves.",
    "read.byId": "Reads the member by id to show the name of the restricted person, of the person responsible for an agent and of the person simulated; used by every screen of the module and by the cm tool query.",
    "locate.byName": "Finds members whose name contains the typed text in the people restrictions screen and the simulation person picker; used by the company admin.",
    "locate.byLogin": "Resolves the person behind the login of whoever called an agent, so the module answers the cm which tools that person may use now; used by the cm request, with no screen open.",
    "listLinks": "Shows the member's tool restrictions alongside the record on the people restrictions screen; used by the company admin.",
    "edit.moduleNamespace": "Keeps the agents.OrganizationMember role tag on the member when the admin first restricts a tool for them; the namespace itself stays empty; used by the company admin.",
    "agents.restrictTools": "Marks, as a checkbox list, the tools this member may not use through any agent, writing person tool restrictions; used by the company admin.",
    "agents.simulateAsSelf": "Shows which tools of an agent this member can or cannot use and why, simulated for the signed-in member; used by every organization member for themselves and by the company admin for anyone."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "memberChosenNotRegistered",
    "restrictedToolsUnavailableInRequest"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "agents.OrganizationMember",
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
        "description": "The platform record of a person of the organization who signs in to the app, as this module reads it.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "The member's name, shown in the people restrictions list, in the simulation person picker and as the person responsible for an agent.",
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
                "description": "Whether the member is active in the organization; only active members are offered for restrictions and simulation."
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Module roles of the record; agents.OrganizationMember marks that this module has data about the member.",
                "title": "Module roles"
              }
            },
            "description": "How the member is recognised on the agents screens."
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
                "description": "The member's login e-mail, read from the platform login; it is never typed nor stored by this module."
              }
            },
            "description": "This module's namespace for the member. Empty: the tools a member may not use are kept as person tool restrictions, and the member's conduct with an agent lives in the cm."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityOrganizationMemberType = typeof agentsEntityOrganizationMember;

export default agentsEntityOrganizationMember;
