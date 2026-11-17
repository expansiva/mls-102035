/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/access.defs.ts" enhancement="_blank"/>

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
      "description": "Creates virtual employees from a prompt, reviews and activates or discards drafts, changes agent behavior, adjusts each agent's tools, configures agents, simulates by role and marks per person the tools that person may not use through any agent.",
      "personEntity": ""
    },
    {
      "actorId": "organizationMember",
      "kind": "internal",
      "origin": "named",
      "title": "Organization member",
      "description": "Sees the agents, simulates what an agent can do for themselves, and changes only their own conduct with an agent that acts on their behalf.",
      "personEntity": "OrganizationMember"
    }
  ],
  "grants": [
    {
      "grantId": "adminManageAgents",
      "actorRef": "companyAdmin",
      "title": "Manage agents and drafts",
      "description": "The company admin sees every agent and draft of the company, creates virtual employees from a prompt, activates or discards drafts, changes and undoes behavior, configures agents and simulates them by person or role.",
      "entityRefs": [
        "Agent",
        "AgentDraft",
        "BehaviorChange",
        "AgentSimulation"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All agents, drafts, behavior changes and simulations of the organization."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The admin reads the whole agent, draft, behavior history and simulation results."
      }
    },
    {
      "grantId": "adminManageTools",
      "actorRef": "companyAdmin",
      "title": "Manage the tool catalog, agent tools and people restrictions",
      "description": "The company admin browses the tool tree, turns tools on or off per agent or draft, marks the tools each person may not use through any agent, and sees draft notices from the cm.",
      "entityRefs": [
        "Tool",
        "AgentTool",
        "PersonToolRestriction",
        "DraftNotice"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "The whole tool catalog, every agent tool choice, every person restriction and every draft notice of the organization."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Everything except the technical keys of the tree and of the notices, which are never shown to people.",
        "deniedFields": [
          "Tool.moduleKey",
          "Tool.subjectKey",
          "Tool.actionKey",
          "DraftNotice.noticeKey"
        ]
      }
    },
    {
      "grantId": "adminReadActivity",
      "actorRef": "companyAdmin",
      "title": "Review agent activity",
      "description": "The company admin reads what each agent did: when, how long, cost, actions and results, whether a person took over and the link to the conversation.",
      "entityRefs": [
        "AgentExecution"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Every execution summary of every agent of the organization."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "The whole execution summary except the cm execution reference, which is never shown.",
        "deniedFields": [
          "AgentExecution.executionKey"
        ]
      }
    },
    {
      "grantId": "adminChooseMembers",
      "actorRef": "companyAdmin",
      "title": "Choose organization members",
      "description": "The company admin picks people from the organization users to restrict tools, simulate as them or make them responsible for an agent.",
      "entityRefs": [
        "OrganizationMember"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Every member of the organization."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "The member's name, whether they are active and their login e-mail.",
        "allowedFields": [
          "OrganizationMember.details.identification.name",
          "OrganizationMember.details.identification.status",
          "OrganizationMember.details.agents.loginEmail"
        ]
      }
    },
    {
      "grantId": "memberSeeAgents",
      "actorRef": "organizationMember",
      "title": "See the company's agents",
      "description": "Every organization member sees the list of agents and their overview: name, what the agent is, who it talks to, on whose behalf it acts, whether it is on and who is responsible.",
      "entityRefs": [
        "Agent"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All agents of the organization."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "The card and overview fields only; behavior, limits and version are for the admin.",
        "allowedFields": [
          "Agent.name",
          "Agent.description",
          "Agent.talksTo",
          "Agent.actsOnBehalfOf",
          "Agent.isOn",
          "Agent.responsible"
        ]
      }
    },
    {
      "grantId": "memberReadActivity",
      "actorRef": "organizationMember",
      "title": "Read agent activity",
      "description": "The member reads what an agent did, newest first.",
      "entityRefs": [
        "AgentExecution"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Execution summaries of the organization's agents."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "The execution summary without the cm execution reference.",
        "deniedFields": [
          "AgentExecution.executionKey"
        ]
      }
    },
    {
      "grantId": "memberToolNames",
      "actorRef": "organizationMember",
      "title": "Read tool names",
      "description": "The member reads the readable names and descriptions of tools shown in simulation results.",
      "entityRefs": [
        "Tool"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "The organization's tool catalog."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Readable names, descriptions and whether the tool is still available; never the technical keys.",
        "allowedFields": [
          "Tool.title",
          "Tool.status",
          "Tool.details.description",
          "Tool.details.moduleTitle",
          "Tool.details.subjectTitle"
        ]
      }
    },
    {
      "grantId": "memberSimulateSelf",
      "actorRef": "organizationMember",
      "title": "Simulate an agent for myself",
      "description": "The member checks what an agent can do for them and what it understands from their sentence.",
      "entityRefs": [
        "AgentSimulation"
      ],
      "dataScope": {
        "mode": "custom",
        "description": "Only simulations whose person is the signed-in member; the member cannot simulate as another person or by role."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "The simulation result for themselves, without role choice or drafts.",
        "deniedFields": [
          "AgentSimulation.roleName",
          "AgentSimulation.draft"
        ]
      }
    },
    {
      "grantId": "memberOwnConduct",
      "actorRef": "organizationMember",
      "title": "Change my conduct with an agent",
      "description": "The member reads and changes only how an agent that acts on their behalf behaves for them.",
      "entityRefs": [
        "MemberConduct"
      ],
      "dataScope": {
        "mode": "custom",
        "description": "Only the conduct whose member is the signed-in person."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The member reads and writes their whole conduct record."
      }
    },
    {
      "grantId": "memberSelfRecord",
      "actorRef": "organizationMember",
      "title": "My own member record",
      "description": "The member sees their own name and login e-mail as the agents module shows them.",
      "entityRefs": [
        "OrganizationMember"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Only the member record of the signed-in person.",
        "anchorEntity": "OrganizationMember"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Name, status and login e-mail.",
        "allowedFields": [
          "OrganizationMember.details.identification.name",
          "OrganizationMember.details.identification.status",
          "OrganizationMember.details.agents.loginEmail"
        ]
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type AgentsAccessType = typeof agentsAccess;

export default agentsAccess;
