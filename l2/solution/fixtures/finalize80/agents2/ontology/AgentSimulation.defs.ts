/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/ontology/AgentSimulation.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityAgentSimulation = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "AgentSimulation",
  "title": "Agent simulation",
  "description": "A simulation run by the cm for an agent, at two levels: what it can do for a person or role, and what it understands from a sentence. Nothing is saved.",
  "displayField": "summary",
  "relationships": {},
  "capabilities": {},
  "rules": [
    "simulationSavesNothing",
    "memberSimulatesOnlyAsThemselves",
    "restrictedToolsUnavailableForPerson",
    "onlyEnabledToolsConsidered"
  ],
  "kind": "external",
  "connectionId": "cm",
  "record": {
    "fields": {
      "summary": {
        "type": "string",
        "required": true,
        "title": "Summary",
        "description": "A one-line plain-language summary of the simulation result, shown as the title of the result."
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
        "required": true,
        "to": [
          "Agent"
        ],
        "title": "Agent",
        "description": "The agent or draft being simulated, shown by its name."
      },
      "draft": {
        "type": "record",
        "to": [
          "AgentDraft"
        ],
        "title": "Draft",
        "description": "The draft being simulated, when the admin simulates a draft before activating it."
      },
      "person": {
        "type": "record",
        "to": [
          "Person"
        ],
        "title": "Person",
        "description": "The person the simulation is run for; for an organization member it is always themselves."
      },
      "roleName": {
        "type": "string",
        "title": "Role",
        "description": "The role the admin simulates for, when simulating by role instead of by person.",
        "maxLength": 120
      },
      "sentence": {
        "type": "text",
        "title": "Sentence",
        "description": "The sample sentence typed to see what the agent understands.",
        "maxLength": 2000
      },
      "toolResults": {
        "type": "object",
        "collection": true,
        "title": "Tools for this person or role",
        "description": "For each tool the agent has, whether it can be used for the chosen person or role and why.",
        "fields": {
          "tool": {
            "type": "record",
            "required": true,
            "to": [
              "Tool"
            ],
            "title": "Tool",
            "description": "The tool, shown by its readable module / subject / action name."
          },
          "canUse": {
            "type": "boolean",
            "required": true,
            "title": "Can use",
            "description": "Whether the agent can use this tool for the chosen person or role."
          },
          "reason": {
            "type": "string",
            "title": "Why",
            "description": "Plain-language reason, such as the tool is off for the agent or the person may not use it.",
            "maxLength": 300
          }
        }
      },
      "understanding": {
        "type": "object",
        "title": "What it understands",
        "description": "How the agent reads the sample sentence.",
        "fields": {
          "asksForAction": {
            "type": "boolean",
            "required": true,
            "title": "Asks for an action",
            "description": "Whether the sentence asks the agent to do something."
          },
          "treePath": {
            "type": "string",
            "title": "Path in the tree",
            "description": "The module / subject path the sentence points to, in readable names.",
            "maxLength": 300
          },
          "actions": {
            "type": "record",
            "collection": true,
            "to": [
              "Tool"
            ],
            "title": "Actions",
            "description": "The actions of the tree the agent would use for this sentence."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityAgentSimulationType = typeof agentsEntityAgentSimulation;

export default agentsEntityAgentSimulation;
