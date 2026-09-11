/// <mls fileReference="_102035_/l2/agentNewSolution5/helpers/ns5Skills.ts" enhancement="_blank"/>

import { readAgentText } from '/_102035_/l2/solution/fs.js';

/** First heading of `skills/mdm.md`; injected system prompts start with this line. */
export const NS5_MDM_SKILL_HEADING =
  '# MDM — how the platform keeps people, companies, products and places';

export async function readNs5MdmSkill(): Promise<string> {
  return readAgentText('skills', 'mdm', '.md');
}

/** Prepends the MDM skill as the first block of a step system prompt. */
export function composeNs5SystemPrompt(skillText: string, stepPrompt: string): string {
  const skill = skillText.replace(/^(?:\s*<!--[\s\S]*?-->\s*)+/, '').trim();
  return `${skill}\n\n${stepPrompt}`;
}
