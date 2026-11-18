/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/ontology/AgentSimulation.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityAgentSimulation = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "AgentSimulation",
  "title": "Agent simulation",
  "description": "A simulation run by the cm at two levels: what the agent can do for a person or role, and what it understands from a sentence. Nothing is saved.",
  "displayField": "summary",
  "relationships": {},
  "capabilities": {},
  "rules": [
    "simulationIsNotSaved",
    "simulationRespectsPersonRestrictions",
    "memberSimulatesOnlyAsSelf",
    "simulationShowsNoTechnicalIds"
  ],
  "kind": "external",
  "connectionId": "cm",
  "record": {
    "fields": {
      "summary": {
        "type": "string",
        "required": true,
        "title": "Summary",
        "description": "One-line plain-language result of the simulation, as the cm returns it."
      },
      "level": {
        "type": "enum",
        "required": true,
        "values": [
          {
            "value": "whatItCan",
            "title": "What it can"
          },
          {
            "value": "whatItUnderstands",
            "title": "What it understands"
          }
        ],
        "title": "Simulation level",
        "description": "Which question the simulation answers."
      },
      "agent": {
        "type": "record",
        "to": [
          "Agent"
        ],
        "title": "Agent",
        "description": "The active agent being simulated."
      },
      "draft": {
        "type": "record",
        "to": [
          "AgentDraft"
        ],
        "title": "Draft",
        "description": "The draft being simulated before activation."
      },
      "person": {
        "type": "record",
        "to": [
          "OrganizationMember"
        ],
        "title": "Person",
        "description": "The person the agent would act for; the session member when simulating as myself."
      },
      "roleName": {
        "type": "string",
        "title": "Role",
        "description": "The role chosen by the admin when simulating by role, shown by its readable name."
      },
      "sentence": {
        "type": "text",
        "title": "Sentence",
        "description": "The sample sentence written to see what the agent understands."
      },
      "toolResults": {
        "type": "object",
        "collection": true,
        "title": "Tools and whether they can be used",
        "description": "For 'what it can': each tool of the agent with whether it can be used for this person or role and why.",
        "fields": {
          "tool": {
            "type": "record",
            "required": true,
            "to": [
              "Tool"
            ],
            "title": "Tool",
            "description": "The catalog tool evaluated."
          },
          "modulePath": {
            "type": "string",
            "required": true,
            "title": "Module / subject / action",
            "description": "Readable path of the tool in the tree."
          },
          "canUse": {
            "type": "boolean",
            "required": true,
            "title": "Can use",
            "description": "Whether the agent may use this tool for the person or role now."
          },
          "reason": {
            "type": "string",
            "title": "Why",
            "description": "Plain-language reason: tool turned off for the agent, restricted for this person, removed from the release, or allowed."
          }
        }
      },
      "asksForAction": {
        "type": "boolean",
        "title": "Asks for an action",
        "description": "For 'what it understands': whether the sentence asks the agent to do something."
      },
      "treePath": {
        "type": "string",
        "title": "Path of the tree",
        "description": "For 'what it understands': the module / subject the sentence was matched to, in readable names."
      },
      "matchedActions": {
        "type": "object",
        "collection": true,
        "title": "Actions understood",
        "description": "For 'what it understands': the actions the agent would take for the sentence.",
        "fields": {
          "tool": {
            "type": "record",
            "required": true,
            "to": [
              "Tool"
            ],
            "title": "Tool",
            "description": "The catalog action the sentence maps to."
          },
          "actionName": {
            "type": "string",
            "required": true,
            "title": "Action",
            "description": "Readable name of the action."
          },
          "available": {
            "type": "boolean",
            "title": "Available",
            "description": "Whether this action is on and allowed for the person in this simulation."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityAgentSimulationType = typeof agentsEntityAgentSimulation;

export default agentsEntityAgentSimulation;
