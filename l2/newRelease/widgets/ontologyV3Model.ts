/// <mls fileReference="_102035_/l2/newRelease/widgets/ontologyV3Model.ts" enhancement="_blank" />

import type {
  Ns5OntologyEntityV3,
  Ns5OntologyIndexV3,
} from '/_102035_/l2/solution/types.js';
import { NEW_RELEASE_ONTOLOGY_V3_SCHEMA_VERSION } from '/_102035_/l2/newRelease/ontologyV3Contract.js';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type {
  OntologyNode,
  OntologyTreeView,
} from '/_102034_/l2/mdm/resolveMdmEntity.js';

export function isOntologyV3Index(value: unknown): value is Ns5OntologyIndexV3 {
  return !!value
    && typeof value === 'object'
    && (value as { schemaVersion?: string }).schemaVersion === NEW_RELEASE_ONTOLOGY_V3_SCHEMA_VERSION;
}

export function isOntologyV3Entity(value: unknown): value is Ns5OntologyEntityV3 {
  return !!value
    && typeof value === 'object'
    && (value as { schemaVersion?: string }).schemaVersion === NEW_RELEASE_ONTOLOGY_V3_SCHEMA_VERSION;
}

export function ontologyPlatformFile(path: string): Ns5FileInfo {
  const match = /^\/_([0-9]+)_\/l([1-4])\/(.+)\/([^/]+)\.defs\.ts$/u.exec(path);
  if (!match) throw new Error(`Invalid platform ontology path: ${path}`);
  return {
    project: Number(match[1]),
    level: Number(match[2]) as mls.Level,
    folder: match[3],
    shortName: match[4],
    extension: '.defs.ts',
  };
}

export function ontologyNodeLeafCount(nodes: readonly OntologyNode[]): number {
  return nodes.reduce((count, node) => {
    if (node.children?.length) return count + ontologyNodeLeafCount(node.children);
    return count + 1;
  }, 0);
}

export function ontologyV3FieldCount(view: OntologyTreeView): number {
  return view.columns.length + ontologyNodeLeafCount(view.details);
}

export interface OntologyV3GraphNode {
  id: string;
  title: string;
  value: string;
  category: number;
  symbolSize: number;
  itemStyle?: { color?: string; borderColor?: string; borderType?: 'dashed'; borderWidth?: number; opacity?: number };
  detailBranches: string[];
  ghost?: true;
}

export interface OntologyV3GraphLink {
  source: string;
  target: string;
  name: string;
  value: string;
  lineStyle: { type: 'solid' | 'dashed' | 'dotted'; width: number; opacity: number };
}

export interface OntologyV3Graph {
  nodes: OntologyV3GraphNode[];
  links: OntologyV3GraphLink[];
  categories: Array<{ name: 'role' | 'entity' | 'platform'; itemStyle: { color: string } }>;
}

export function buildOntologyV3Graph(
  index: Ns5OntologyIndexV3,
  views: readonly OntologyTreeView[],
  colors: readonly string[],
): OntologyV3Graph {
  const moduleIds = new Set(index.entities.map(entity => entity.entityId));
  const platformIds = new Set<string>();
  for (const link of index.relationships) {
    if (!moduleIds.has(link.from)) platformIds.add(link.from);
    if (!moduleIds.has(link.to)) platformIds.add(link.to);
  }
  const viewById = new Map(views.map(view => [view.entityId, view]));
  const roleColor = colors[0] || '#1677c8';
  const entityColor = colors[1] || '#008f77';
  const platformColor = colors[3] || '#7b61a8';
  const categories: OntologyV3Graph['categories'] = [
    { name: 'role', itemStyle: { color: roleColor } },
    { name: 'entity', itemStyle: { color: entityColor } },
    { name: 'platform', itemStyle: { color: platformColor } },
  ];
  const nodes: OntologyV3GraphNode[] = index.entities.map(entity => {
    const view = viewById.get(entity.entityId);
    return {
      id: entity.entityId,
      title: view?.title || entity.entityId,
      value: view?.description || '',
      category: entity.kind === 'role' ? 0 : 1,
      symbolSize: entity.kind === 'role' ? 62 : 70,
      detailBranches: view?.details.map(branch => branch.id) || [],
    };
  });
  for (const id of platformIds) {
    nodes.push({
      id,
      title: id,
      value: 'platform',
      category: 2,
      symbolSize: 54,
      detailBranches: [],
      ghost: true,
      itemStyle: { color: 'transparent', borderColor: platformColor, borderType: 'dashed', borderWidth: 2, opacity: .9 },
    });
  }
  const links: OntologyV3GraphLink[] = index.relationships.map(link => ({
    source: link.from,
    target: link.to,
    name: link.relationshipId,
    value: link.mode === 'mdmRelationship' ? (link.catalogType || link.relationshipId) : link.mode === 'throughTable' ? (link.through || link.relationshipId) : (link.field || link.relationshipId),
    lineStyle: {
      type: link.mode === 'mdmRelationship' ? 'dashed' : link.mode === 'throughTable' ? 'dotted' : 'solid',
      width: link.mode === 'fk' ? 2.2 : 1.8,
      opacity: link.derived ? .62 : .86,
    },
  }));
  return { nodes, links, categories };
}
