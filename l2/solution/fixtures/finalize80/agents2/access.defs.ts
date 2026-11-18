/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "agents",
  "actors": [
    {
      "actorId": "companyAdmin",
      "kind": "internal",
      "origin": "named",
      "title": "Company admin",
      "description": "Creates virtual employees from a prompt, reviews and activates or discards drafts, changes agent behavior, adjusts each agent's tools, marks the tools each person may not use, and simulates agents by person or role.",
      "personEntity": "Person"
    },
    {
      "actorId": "organizationMember",
      "kind": "internal",
      "origin": "named",
      "title": "Organization member",
      "description": "Sees the agents, simulates them as themselves and changes only their own conduct with an agent that acts on their behalf.",
      "personEntity": "Person"
    }
  ],
  "grants": [
    {
      "grantId": "adminAgentsInCm",
      "actorRef": "companyAdmin",
      "title": "Manage agents through the cm",
      "description": "The company admin sees every agent kept in the cm, changes its configuration and behavior, undoes changes and runs simulations by person or role.",
      "entityRefs": [
        "Agent",
        "BehaviorChange",
        "AgentSimulation"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All agents of the organization, their whole change history and any simulation."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Everything the cm shows about the agent, its changes and the simulation results."
      }
    },
    {
      "grantId": "adminDrafts",
      "actorRef": "companyAdmin",
      "title": "Create and review virtual employee drafts",
      "description": "The company admin describes new virtual employees, follows the draft situation, reads refusal reasons, and activates or discards ready drafts.",
      "entityRefs": [
        "AgentDraft"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All drafts of the organization."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "The whole draft except the internal cm references, which are never shown.",
        "deniedFields": [
          "AgentDraft.cmDraftRef",
          "AgentDraft.lastNoticeRef"
        ]
      }
    },
    {
      "grantId": "adminToolCatalog",
      "actorRef": "companyAdmin",
      "title": "Browse the tool catalog",
      "description": "The company admin browses the module / subject / action tree with readable names, descriptions and removed marks.",
      "entityRefs": [
        "Tool"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "The whole tool catalog, removed tools included."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Readable names, descriptions and release marks; internal codes are not shown.",
        "deniedFields": [
          "Tool.moduleKey",
          "Tool.subjectKey",
          "Tool.actionKey"
        ]
      }
    },
    {
      "grantId": "adminAgentTools",
      "actorRef": "companyAdmin",
      "title": "Turn tools on or off per agent",
      "description": "The company admin checks or unchecks the tools of each agent or draft; the admin choice is kept over the automatic choice.",
      "entityRefs": [
        "AgentTool"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Tool choices of every agent and draft."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The whole tool choice, including who made it and the automatic reason."
      }
    },
    {
      "grantId": "adminToolRestrictions",
      "actorRef": "companyAdmin",
      "title": "Restrict tools per person",
      "description": "The company admin marks, per person, the tools that person may not use through any agent.",
      "entityRefs": [
        "ToolRestriction"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Restrictions of every person in the organization."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The whole restriction: person, tool and when it was marked."
      }
    },
    {
      "grantId": "adminPeoplePicker",
      "actorRef": "companyAdmin",
      "title": "Pick organization users",
      "description": "The company admin picks people from the organization users to restrict tools, simulate as them or make them responsible for an agent.",
      "entityRefs": [
        "Person"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All organization users."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Name, status and login e-mail of the user.",
        "allowedFields": [
          "Person.details.identification.name",
          "Person.details.identification.status",
          "Person.details.agents.loginEmail"
        ]
      }
    },
    {
      "grantId": "adminActivity",
      "actorRef": "companyAdmin",
      "title": "Review agent activity",
      "description": "The company admin reads what each agent did, newest first, with time, duration, cost, actions, results, takeover and conversation link.",
      "entityRefs": [
        "ExecutionSummary"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Execution summaries of all agents."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Everything about the execution except the internal cm execution key.",
        "deniedFields": [
          "ExecutionSummary.executionId"
        ]
      }
    },
    {
      "grantId": "memberAgents",
      "actorRef": "organizationMember",
      "title": "See the agents",
      "description": "Every organization member sees the agent cards and overview: name, who it talks to, on whose behalf it acts, whether it is on and who is responsible.",
      "entityRefs": [
        "Agent"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All agents of the organization."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Card, overview and behavior; the limits are for the admin.",
        "allowedFields": [
          "Agent.name",
          "Agent.definition",
          "Agent.talksTo",
          "Agent.actsOnBehalfOf",
          "Agent.behavior",
          "Agent.isOn",
          "Agent.responsiblePerson"
        ]
      }
    },
    {
      "grantId": "memberPeopleNames",
      "actorRef": "organizationMember",
      "title": "See responsible people",
      "description": "The member sees the name of the person responsible for each agent.",
      "entityRefs": [
        "Person"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Organization users shown as responsible persons."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Only the name and login e-mail.",
        "allowedFields": [
          "Person.details.identification.name",
          "Person.details.agents.loginEmail"
        ]
      }
    },
    {
      "grantId": "memberToolNames",
      "actorRef": "organizationMember",
      "title": "Read tool names in simulations",
      "description": "The member reads the readable names and descriptions of tools shown in the simulation results.",
      "entityRefs": [
        "Tool"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "The tool catalog."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Readable names, description and path only.",
        "allowedFields": [
          "Tool.name",
          "Tool.status",
          "Tool.details.description",
          "Tool.details.moduleTitle",
          "Tool.details.subjectTitle",
          "Tool.details.treePath"
        ]
      }
    },
    {
      "grantId": "memberSimulateMyself",
      "actorRef": "organizationMember",
      "title": "Simulate an agent for me",
      "description": "The member sees what an agent can do for them and what it understands from a sentence they type.",
      "entityRefs": [
        "AgentSimulation"
      ],
      "dataScope": {
        "mode": "custom",
        "description": "Only simulations whose person is the session person; the member cannot simulate for another person or a role."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "The simulation result for themselves, without role or draft simulation.",
        "deniedFields": [
          "AgentSimulation.roleName",
          "AgentSimulation.draft"
        ]
      }
    },
    {
      "grantId": "memberMyConduct",
      "actorRef": "organizationMember",
      "title": "Change my agent's conduct",
      "description": "The member asks for and undoes changes to the conduct of an agent that acts on their behalf, only for themselves.",
      "entityRefs": [
        "BehaviorChange"
      ],
      "dataScope": {
        "mode": "custom",
        "description": "Only changes whose on-behalf-of person is the session person, on agents acting on their behalf."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The whole record of their own changes."
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type AgentsAccessType = typeof agentsAccess;

export default agentsAccess;
