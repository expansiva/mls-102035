/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents2/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "agents",
  "rules": {
    "draftNoticeAppliedOnce": "A ready or refused notice from the cm for a draft is applied only once, and the same notice arriving again changes nothing.",
    "refusalCarriesReason": "A draft refused by the cm always shows the reason the cm gave for the refusal.",
    "activateOnlyReadyDraft": "Only a draft that is ready can be activated; a draft that is preparing, refused, activated or discarded cannot.",
    "agentNameUniqueAmongActive": "An agent's chat name cannot be one already used by another active agent; the cm refuses it and the screen tells the person so.",
    "uniqueActiveAgentName": "When a draft is activated or an agent is renamed, its name must not match the name of any other active agent, and the cm's refusal is shown to the admin.",
    "removedToolNeverDeleted": "A tool that leaves the release is marked as removed and is never deleted, so past choices and restrictions keep their meaning.",
    "removedToolCannotBeEnabled": "A tool marked as removed cannot be turned on for an agent or a draft.",
    "toolKeyUnique": "Each catalog tool is identified by one combination of module, subject and action, and that combination appears only once in the catalog.",
    "organizationUsersChosenNotRegistered": "People are always chosen from the organization's existing users and are never registered by this module.",
    "agentChangedOnlyThroughCm": "An agent's name, on or off state, responsible person, behavior and drafts are changed only through the cm and are never stored by this module.",
    "behaviorChangedThroughCm": "An agent's behavior is changed only by asking the cm for a change in plain language, and an undo asks the cm to restore the earlier behavior.",
    "memberChangesOwnConductOnly": "An organization member may change only their own conduct with an agent that acts on their behalf, and that change applies only to them.",
    "memberUndoesOwnChangesOnly": "An organization member may undo only behavior changes they asked for themselves.",
    "simulationSavesNothing": "A simulation only shows what the agent can do or understands and saves nothing.",
    "memberSimulatesOnlyAsThemselves": "An organization member can simulate an agent only for themselves; only the company admin can simulate for another person or a role.",
    "restrictedToolsUnavailableForPerson": "A tool a person may not use is never available to any agent in a request made by or for that person.",
    "onlyEnabledToolsConsidered": "Only tools that are on for an agent count as tools the agent can use, in requests and in simulations.",
    "onlyEnabledToolsSent": "When the cm asks for an agent's tools for a person, only tools that are on for that agent are sent.",
    "removedToolNeverSent": "A tool marked as removed is never sent to the cm, even if it is still on for the agent.",
    "adminToolChoiceNeverOverridden": "A tool choice made by the admin for an agent or draft is never changed by the automatic choice.",
    "adminChoiceNeverOverriddenByAutomatic": "When the automatic choice proposes tools from an agent description, it changes only choices it made itself and leaves every admin choice as it is.",
    "onlyCompanyAdminManagesDrafts": "Only the company admin creates, describes again, activates or discards drafts of virtual employees.",
    "toolCatalogRebuiltOnReleaseOrNewModule": "The tool catalog is rebuilt whenever a module is created or a new release arrives, and new tools are then chosen per agent from its description.",
    "agentToolBelongsToAgentOrDraft": "Each tool choice belongs either to one active agent or to one draft, never to both and never to neither.",
    "personRestrictionAppliesOnCall": "When someone calls an agent by its name in a chat, the tools that person may not use are left out for that request.",
    "blockedToolsWithheldFromRequest": "Tools blocked for the person a request is made for are withheld from the tools sent to the cm for that request.",
    "oneRestrictionPerPersonAndTool": "A person has at most one restriction for the same tool.",
    "restrictionAppliesToEveryAgent": "A tool blocked for a person applies to every agent, not just one.",
    "onlyCompanyAdminRestrictsTools": "Only the company admin marks or unmarks the tools a person may not use.",
    "executionRecordedOnce": "Each finished execution sent by the cm is recorded only once, and the same execution arriving again is ignored.",
    "executionSummaryIsImmutable": "A recorded execution summary is never changed after it is recorded."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type AgentsRulesType = typeof agentsRules;

export default agentsRules;
