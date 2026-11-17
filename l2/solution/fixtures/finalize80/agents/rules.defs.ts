/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "agents",
  "rules": {
    "toolNeverDeleted": "A tool in the catalog is never deleted; when it leaves the release it is only marked removed.",
    "removedToolNeverDeleted": "A tool marked removed keeps its record in the catalog, along with every choice and restriction that refers to it.",
    "agentNameUniqueAmongActive": "An agent's name cannot be one that another active agent already uses; the cm refuses it and the screen tells the admin.",
    "agentNameUniqueAmongActiveAgents": "When a draft is activated or an agent is renamed, the cm refuses a name that another active agent already uses, and the screen shows the refusal.",
    "draftActivateOnlyWhenReady": "A draft can be reviewed, simulated and activated only when the cm says it is ready; a draft that is still preparing or was refused cannot be activated.",
    "draftNoticeAppliedOnce": "A notice from the cm that a draft is ready or refused is applied only once, even if the same notice arrives again.",
    "refusedNoticeHasReason": "A notice that a draft was refused always includes the reason, and the draft card shows it.",
    "suggestedToolsFromCatalog": "The tools suggested for a draft must come from the tool catalog and must not be marked removed.",
    "adminToolChoiceKeptOverAutomatic": "When the admin turns a tool on or off for an agent or draft, that choice is kept, and the automatic choice made from the agent description cannot replace it.",
    "adminChoiceNeverOverridden": "When the catalog is rebuilt or tools are suggested again, only choices made automatically can change; choices the admin made stay as they are.",
    "onlyAdminChangesAgentBehavior": "Only the company admin can create, activate, discard or configure an agent, change its behavior, adjust its tools or simulate it by role.",
    "behaviorChangeRecordedByCm": "Every behavior change is made through the cm and is added to the agent's history with who made it, when, and a one-line summary.",
    "undoRestoresPreviousBehavior": "Undoing a behavior change brings back, through the cm, the behavior the agent had before that change, and records who undid it and when.",
    "memberChangesOnlyOwnConduct": "An organization member can change only their own conduct with an agent that acts on their behalf, never anyone else's conduct and never the agent's general behavior.",
    "conductChangedOnlyThroughCm": "A member's conduct with an agent is changed only by asking the cm, which applies the change to that member's conduct alone.",
    "simulationIsNotSaved": "Nothing from a simulation is saved, and a simulation never changes an agent, a draft or a tool.",
    "simulationRespectsPersonRestrictions": "A simulation for a person treats a tool as unusable if it is off for the agent, blocked for that person or removed from the release, and gives that reason.",
    "memberSimulatesOnlyAsSelf": "An organization member can simulate an agent only as themselves; only the company admin can simulate for another person or for a role.",
    "simulationShowsNoTechnicalIds": "Simulation results show only readable names and plain-language reasons, never technical ids.",
    "noTechnicalIdsOnScreen": "Screens show readable names and plain language only, never technical ids or keys.",
    "toolKeyUnique": "Each combination of module, subject and action identifies exactly one tool in the catalog.",
    "removedToolCannotBeTurnedOn": "A tool marked removed cannot be turned on for any agent or draft.",
    "catalogRebuildIdempotent": "Rebuilding the catalog more than once for the same release gives the same catalog, with no duplicate tools; a tool that returns to a release becomes available again.",
    "belongsToAgentOrDraft": "Each tool choice belongs to exactly one agent or exactly one draft, never to both and never to neither.",
    "oneChoicePerToolAndAgent": "An agent or draft has at most one on-or-off choice for each tool.",
    "onlyEnabledToolsSent": "When the cm asks for an agent's tools for a person, only tools that are on for that agent are sent.",
    "removedToolNeverSent": "A tool marked removed is never sent to the cm, even if it is still turned on for an agent.",
    "restrictionUniquePerPersonTool": "A given tool can be blocked only once for the same person.",
    "restrictedToolUnavailableOnCall": "When a person calls an agent by name, any tool blocked for that person is not available to the agent.",
    "restrictedToolsUnavailableInRequest": "The tools sent to the cm for an agent and a person leave out every tool blocked for that person, and this applies only to that request.",
    "onlyAdminRestrictsTools": "Only the company admin can mark or unmark the tools a person may not use through any agent.",
    "restrictionPersonIsOrganizationUser": "A tool restriction can be set only for an active organization user chosen from the platform user list.",
    "memberChosenNotRegistered": "People are chosen from the platform user list and are never registered or typed in by this module.",
    "executionRecordedOnce": "A finished execution summary sent by the cm is recorded only once, even if the same execution arrives again.",
    "activityNewestFirst": "An agent's activity is listed newest first, by the time each execution started."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type AgentsRulesType = typeof agentsRules;

export default agentsRules;
