/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/organizationContext.ts" enhancement="_blank"/>

import type {
  MdmPlatformCatalogArtifact,
  Ns4Level1EntityArtifact,
  Ns4Level1IndexArtifact,
  Ns4SolutionRegistryArtifact,
} from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';

export function formatNs4E1OrganizationContext(registry: Ns4SolutionRegistryArtifact | null): string {
  if (!registry || registry.modules.length === 0) return '';
  const lines = ['## Modules already in this organization'];
  for (const block of registry.modules) {
    const actors = block.actors.map(actor => `${actor.actorId} (${actor.kind})`).join(', ') || '(none)';
    lines.push(`- ${block.moduleName}: actors ${actors}`);
  }
  return lines.join('\n');
}

export function formatNs4E6OrganizationContext(registry: Ns4SolutionRegistryArtifact | null): string {
  if (!registry || registry.modules.length === 0) return '';
  return [
    '## Sibling modules already in this organization',
    JSON.stringify({
      roles: registry.modules.flatMap(block => block.roles),
      generalFields: registry.modules.flatMap(block => block.generalFields),
    }, null, 2),
  ].join('\n');
}

export function formatNs4E4OrganizationContext(registry: Ns4SolutionRegistryArtifact | null): string {
  const fields = registry?.modules.flatMap(block => block.generalFields) || [];
  if (!fields.length) return '';
  return [
    '## Organization general fields already in the registry (placeholders — reuse, do not redeclare)',
    ...fields.map(field => `- <${field.fieldId}> (${field.type})`),
  ].join('\n');
}

export function formatPlatformCatalogPrompt(platform: MdmPlatformCatalogArtifact): string {
  const lines = ['## Platform services (already provided — do not model as module entities)'];
  for (const service of platform.services) {
    const bits: string[] = [];
    if (service.useFor?.length) bits.push(`use for ${service.useFor.join('; ')}`);
    if (service.notFor?.length) bits.push(`not for ${service.notFor.join('; ')}`);
    if (service.rule) bits.push(service.rule);
    lines.push(bits.length ? `- ${service.service}: ${bits.join('; ')}` : `- ${service.service}`);
  }
  lines.push('## Role rules');
  lines.push(`- ${platform.roles.meaning}`);
  lines.push(`- tag: ${platform.roles.tag}`);
  for (const rule of platform.roles.ontologyRules) {
    lines.push(`- ${rule}`);
  }
  lines.push(`- ${platform.roles.actorsAreNotRoles}`);
  return lines.join('\n');
}

export function formatNs4Level1CatalogPrompt(catalog: {
  index: Ns4Level1IndexArtifact;
  entities: readonly Ns4Level1EntityArtifact[];
  platform?: MdmPlatformCatalogArtifact;
}): string {
  const placeholder = (value: string) => `<${value}>`;
  const join = (values: readonly string[]) => values.map(placeholder).join(', ');
  const lines = [
    '## Platform level-1 catalog (placeholders — not module entities)',
    `Subtypes: ${join(catalog.index.subtypes)}`,
    `Identification fields (every subtype): ${join(catalog.index.subtypes.length ? catalog.entities[0]?.identification.map(field => field.fieldId) || [] : [])}`,
  ];
  for (const entity of catalog.entities) {
    lines.push(`${placeholder(entity.subtype)} base fields: ${join(entity.baseFields.map(field => field.fieldId))}`);
  }
  lines.push('Relationship types:');
  for (const rel of catalog.index.relationshipTypes) {
    lines.push(
      `- ${placeholder(rel.type)} from ${rel.from.map(placeholder).join('|')} to ${rel.to.map(placeholder).join('|')}`,
    );
  }
  lines.push(`Statuses: ${join(catalog.index.mdmStatuses)}`);
  lines.push(`Doc types: ${join(catalog.index.docTypes)}`);
  const structure = lines.join('\n');
  if (!catalog.platform) return structure;
  return `${structure}\n${formatPlatformCatalogPrompt(catalog.platform)}`;
}
