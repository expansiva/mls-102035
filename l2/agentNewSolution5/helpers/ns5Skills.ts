/// <mls fileReference="_102035_/l2/agentNewSolution5/helpers/ns5Skills.ts" enhancement="_blank"/>

import { readAgentText } from '/_102035_/l2/solution/fs.js';

/** First heading of `skills/mdm.md`; injected system prompts start with this line. */
export const NS5_MDM_SKILL_HEADING =
  '# MDM — how the platform keeps people, companies, products and places';

/** First heading of `skills/ontologyTable.md`; the second block of the ontology30 system prompt. */
export const NS5_ONTOLOGY_TABLE_SKILL_HEADING =
  '# How to define a table (an entity of the ontology)';

export async function readNs5MdmSkill(): Promise<string> {
  return readAgentText('skills', 'mdm', '.md');
}

/**
 * The form of a v3 entity, in prose. Injected alongside `mdm.md` in the three ontology30 passes
 * (ns5_42 T1), so the step prompts stay short and the form lives in one place.
 */
export async function readNs5OntologyTableSkill(): Promise<string> {
  return readAgentText('skills', 'ontologyTable', '.md');
}

/**
 * Prepends one or more skills as the first blocks of a step system prompt. A single string is still
 * accepted, so the callers that inject only `mdm.md` do not change.
 */
export function composeNs5SystemPrompt(skillText: string | readonly string[], stepPrompt: string): string {
  const skills = (typeof skillText === 'string' ? [skillText] : skillText)
    .map(text => text.replace(/^(?:\s*<!--[\s\S]*?-->\s*)+/, '').trim())
    .filter(Boolean);
  return [...skills, stepPrompt].join('\n\n');
}
