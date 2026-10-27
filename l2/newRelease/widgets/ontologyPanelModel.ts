/// <mls fileReference="_102035_/l2/newRelease/widgets/ontologyPanelModel.ts" enhancement="_blank" />
import type { Ns5OntologyAnyEntity, Ns5OntologyFieldV3, Ns5OntologyField, Ns5OntologyEntityArtifact, Ns5OntologyRelationshipV3, Ns5OntologyEntityV3 } from '../../solution/types.js';
import type { OntologyNode, OntologyTreeView } from '/_102034_/l2/mdm/resolveMdmEntity.js';
import { isOntologyV3Entity } from './ontologyV3Model.js';
export const ONTOLOGY_V3_FIELD_TYPES: Ns5OntologyFieldV3['type'][] = ['string','text','integer','number','money','boolean','date','timestamp','uuid','enum','object','record'];
export interface OntologyPanelField { entityId: string; path: string; parent: string; title: string; type: string; readOnly: boolean; value: Ns5OntologyFieldV3 | Ns5OntologyField; }
export interface OntologyPanelPatch { title?: string; description?: string; type?: Ns5OntologyFieldV3['type'] | Ns5OntologyField['type']; required?: boolean; nullable?: boolean; collection?: boolean; unique?: boolean; indexed?: boolean; min?: number; max?: number; maxLength?: number; }
export function ontologyPanelFields(entity: Ns5OntologyAnyEntity, view?: OntologyTreeView): OntologyPanelField[] {
 const out: OntologyPanelField[] = [];
 if (!isOntologyV3Entity(entity)) return [...(entity.fieldsBase || []), ...entity.fields].map(field => ({entityId: entity.entityId, path: field.fieldId, parent: '', title: field.title || field.fieldId, type: field.type, readOnly: !!entity.fieldsBase?.includes(field), value: field}));
 const walk = (fields: Readonly<Record<string,Ns5OntologyFieldV3>>, parent: string, inherited: boolean) => {
  for (const [key,value] of Object.entries(fields)) { const path = parent ? `${parent}.${key}` : key; const readOnly = inherited || value.owner === 'platform' || value.owner === 'organization' || value.derived === true;
   out.push({entityId: entity.entityId,path,parent,title:value.title || key,type:value.type,readOnly,value}); if(value.fields) walk(value.fields,path,readOnly);
  }
 }; walk(entity.record.fields,'',entity.kind === 'role' && !view);
 const resolved = (nodes: readonly OntologyNode[]) => { for(const node of nodes) {
  const existing = out.find(field => field.path === node.path); const readOnly = node.origin === 'platform' || node.owner === 'platform' || node.owner === 'organization' || node.derived || !!node.conflict;
  if(existing) existing.readOnly ||= readOnly;
  else out.push({entityId:entity.entityId,path:node.path,parent:node.path.includes('.') ? node.path.slice(0,node.path.lastIndexOf('.')) : '',title:node.title,type:node.type,readOnly:true,value:{type:node.type as Ns5OntologyFieldV3['type'],title:node.title,description:node.description,...(node.derived ? {derived:true} : {})}});
  if(node.children) resolved(node.children);
 }}; if(view) resolved([...view.columns,...view.details]); return out;
}
export function patchOntologyPanelField(entity: Ns5OntologyAnyEntity,path: string,patch: OntologyPanelPatch,view?: OntologyTreeView): Ns5OntologyAnyEntity {
 const row=ontologyPanelFields(entity,view).find(field=>field.path===path); if(!row || row.readOnly) return entity;
 const next=structuredClone(entity);
 if(isOntologyV3Entity(next)) { let fields=next.record.fields; const keys=path.split('.'); for(const key of keys.slice(0,-1)){if(!fields[key]?.fields)return entity;fields=fields[key].fields!;}
  const field=fields[keys.at(-1)!];
  if(patch.type && ONTOLOGY_V3_FIELD_TYPES.includes(patch.type as Ns5OntologyFieldV3['type'])) field.type=patch.type as Ns5OntologyFieldV3['type'];
  for(const key of ['title','description','min','max','maxLength'] as const) if(key in patch) Object.assign(field,{[key]:patch[key]});
  for(const key of ['required','nullable','collection','unique','indexed'] as const) if(key in patch){if(patch[key]) field[key]=true;else delete field[key];}
 } else { const field=next.fields.find(field=>field.fieldId===path);if(!field)return entity;
  for(const key of ['title','description','required','unique'] as const) if(key in patch)Object.assign(field,{[key]:patch[key]});
  if(patch.type && ['uuid','string','text','number','integer','boolean','money','date','datetime','json'].includes(patch.type))field.type=patch.type as Ns5OntologyField['type'];
  for(const key of ['min','max','maxLength'] as const)if(key in patch)field.constraints={...field.constraints,[key]:patch[key]};
 } return next;
}

/** A dictionary entry is data, even when its name also names a schema property. */
export function ontologyPanelMapKey(path: readonly string[], index = path.length - 1): boolean {
 const maps = new Set(['fields','capabilities','relationships','details']);
 let previousWasMapKey = false;
 for (let position = 0; position <= index; position++) {
  const currentIsMapKey: boolean = position > 0 && maps.has(path[position - 1]) && !previousWasMapKey;
  if (position === index) return currentIsMapKey;
  previousWasMapKey = currentIsMapKey;
 }
 return false;
}

/** Scalar edits traverse existing members only; array length and dictionary keys never change. */
export type OntologyPanelValue = string | number | boolean | null | OntologyPanelValue[] | {[key: string]: OntologyPanelValue};
const PROTECTED_PROPERTIES = new Set(['schemaVersion','moduleName','entityId','fieldId','relationshipId','transitionId','derived','storageTarget','storage','source','subtype','roleTag','owner','open','owner','class','writer']);
export function patchOntologyPanelValue(entity: Ns5OntologyAnyEntity, path: readonly string[], value: string | number | boolean, view?: OntologyTreeView): Ns5OntologyAnyEntity {
 const options = ontologyPanelMapKey(path) ? undefined : ontologyPanelPropertyOptions(entity, path.at(-1) || '');
 if (options && (typeof value !== 'string' || !options.includes(value))) return entity;
 if (!path.length || path.some((key,index) => (!ontologyPanelMapKey(path,index) && PROTECTED_PROPERTIES.has(key)) || ['__proto__','prototype','constructor'].includes(key))) return entity;
 if (isOntologyV3Entity(entity) && path[0] === 'record') {
  const row = ontologyPanelFields(entity,view).filter(row => { const base = ['record','fields',...row.path.split('.').flatMap((part,index)=>index ? ['fields',part] : [part])]; return base.every((part,index)=>path[index]===part); }).sort((a,b)=>b.path.length-a.path.length)[0];
  if (!row || row.readOnly) return entity;
 }
 if (!isOntologyV3Entity(entity) && path[0] === 'fieldsBase') return entity;
 const next=structuredClone(entity);
 let target=next as unknown as {[key:string]: OntologyPanelValue};
 for(const key of path.slice(0,-1)) {const child=target[key];if(!child || typeof child!=='object')return entity;target=child as {[key:string]:OntologyPanelValue};}
 const key=path.at(-1)!;
 if(!Object.hasOwn(target,key) || typeof target[key]!==typeof value) return entity;
 target[key]=value; return next;
}

export function ontologyPanelPropertyOptions(entity: Ns5OntologyAnyEntity, key: string): readonly string[] | undefined {
 if (key === 'type') return isOntologyV3Entity(entity) ? ONTOLOGY_V3_FIELD_TYPES : ['uuid','string','text','number','integer','boolean','money','date','datetime','json'] satisfies Ns5OntologyField['type'][];
 if (key === 'kind') return isOntologyV3Entity(entity) ? ['role','entity'] satisfies Ns5OntologyEntityV3['kind'][] : ['core','event','supporting','mdm','valueObject'] satisfies Ns5OntologyEntityArtifact['kind'][];
 if (key === 'party') return ['person','organization','none'] satisfies Ns5OntologyEntityArtifact['party'][];
 if (key === 'mutability') return ['appendOnly'] satisfies NonNullable<Ns5OntologyEntityArtifact['mutability']>[];
 if (key === 'reachedBy') return isOntologyV3Entity(entity) ? ['actor','command'] satisfies NonNullable<Ns5OntologyEntityV3['lifecycleStates']>[number]['reachedBy'][] : ['actor','command','time'] satisfies Ns5OntologyEntityArtifact['lifecycleStates'][number]['reachedBy'][];
 if (key === 'direction') return ['from','to'] satisfies NonNullable<Ns5OntologyRelationshipV3['direction']>[];
 if (key === 'mode') return ['fk','throughTable'] satisfies NonNullable<Ns5OntologyRelationshipV3['mode']>[];
 if (key === 'cardinality') return ['1:1','1:N','N:1','N:N'] satisfies Ns5OntologyRelationshipV3['cardinality'][];
 if (key === 'of') return ['Address','GeoPoint','PrivacyConsent','ContactSummary'] satisfies NonNullable<Ns5OntologyFieldV3['of']>[];
 return undefined;
}

export function ontologyPanelConnector(x1: number, y1: number, x2: number, y2: number, scale: number, self: boolean): string {
 x1 /= scale; y1 /= scale; x2 /= scale; y2 /= scale;
 if (self && y1 === y2) return `M ${x1} ${y1} C ${x1 + 44} ${y1 - 44}, ${x2 - 44} ${y2 - 44}, ${x2} ${y2}`;
 return self ? `M ${x1} ${y1} C ${x1 + 44} ${y1}, ${x2 + 44} ${y2}, ${x2} ${y2}` : `M ${x1} ${y1} C ${x1 + 28} ${y1}, ${x2 - 28} ${y2}, ${x2} ${y2}`;
}
