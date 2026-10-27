/// <mls fileReference="_102035_/l2/newRelease/widgets/ontologyPanelModel.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ns5OntologyEntityV3 } from '../../solution/types.js';
import { ontologyPanelFields, patchOntologyPanelField, ONTOLOGY_V3_FIELD_TYPES, patchOntologyPanelValue, ontologyPanelConnector } from './ontologyPanelModel.js';
const entity: Ns5OntologyEntityV3 = {schemaVersion:'2026-09-15-ns5-ontology-v3',moduleName:'agenda',entityId:'appointment',title:'Appointment',description:'Scheduling',displayField:'details.agenda.name',kind:'entity',class:'core',storage:{target:'moduleDatabase',table:'appointment'},record:{fields:{id:{type:'uuid',derived:true},details:{type:'object',fields:{identification:{type:'object',owner:'platform',fields:{name:{type:'string'}}},agenda:{type:'object',owner:'module',fields:{name:{type:'string',required:true,maxLength:30},amount:{type:'number',min:1,max:100},computed:{type:'integer',derived:true}}}}}}},relationships:{},capabilities:{},rules:[]};
test('tree preserves complete paths and inherited ownership',()=>{const rows=ontologyPanelFields(entity);assert.equal(rows.find(r=>r.path==='details.agenda.name')?.parent,'details.agenda');assert.equal(rows.find(r=>r.path==='details.identification.name')?.readOnly,true);assert.equal(rows.find(r=>r.path==='details.agenda.name')?.readOnly,false);assert.equal(rows.find(r=>r.path==='details.agenda.computed')?.readOnly,true);assert.equal(ONTOLOGY_V3_FIELD_TYPES.includes('record'),true);});
test('nested edit preserves source, siblings, identity and storage',()=>{const before=structuredClone(entity);const next=patchOntologyPanelField(entity,'details.agenda.name',{title:'Name',required:false,maxLength:60});assert.deepEqual(entity,before);assert.deepEqual(next.storage,entity.storage);assert.deepEqual(next.relationships,entity.relationships);assert.equal(next.entityId,'appointment');const fields=next.record.fields.details.fields!.agenda.fields!;assert.equal(fields.name.title,'Name');assert.equal(fields.name.maxLength,60);assert.equal('required' in fields.name,false);assert.deepEqual(fields.amount,entity.record.fields.details.fields!.agenda.fields!.amount);assert.equal(fields.computed.derived,true);});
test('protected paths and forged identity properties cannot mutate source',()=>{for(const path of ['id','details.identification','details.identification.name','details.agenda.computed','missing'])assert.equal(patchOntologyPanelField(entity,path,{title:'Changed'}),entity);const next=patchOntologyPanelField(entity,'details.agenda.name',{title:'Changed',fieldId:'renamed',derived:true} as {title:string});assert.equal(next.record.fields.details.fields!.agenda.fields!.name.derived,undefined);assert.equal('renamed' in next.record.fields.details.fields!.agenda.fields!,false);});

test('existing pattern/default and enum metadata preserve structural members',()=>{
 const source=structuredClone(entity);
 Object.assign(source.record.fields.details.fields!.agenda.fields!.name,{pattern:'[a-z]+',default:'old'});
 const path=['record','fields','details','fields','agenda','fields','name'];
 const next=patchOntologyPanelValue(source,[...path,'pattern'],'[A-Z]+');
 const final=patchOntologyPanelValue(next,[...path,'default'],'new');
 assert.equal(final.record.fields.details.fields!.agenda.fields!.name.pattern,'[A-Z]+');
 assert.equal(final.record.fields.details.fields!.agenda.fields!.name.default,'new');
 assert.equal(source.record.fields.details.fields!.agenda.fields!.name.default,'old');
 assert.equal(patchOntologyPanelValue(source,['record','fields','details','fields','identification','fields','name','type'],'number'),source);
 assert.equal(patchOntologyPanelValue(source,['moduleName'],'other'),source);
 assert.equal(patchOntologyPanelValue(source,[...path,'newProperty'],'injected'),source);
});
test('connector coordinates remain local at half and double zoom and self links remain visible',()=>{
 const expected=ontologyPanelConnector(320,80,384,22,1,false);
 assert.equal(ontologyPanelConnector(160,40,192,11,.5,false),expected);
 assert.equal(ontologyPanelConnector(640,160,768,44,2,false),expected);
});

test('self relations end at the actual title port at every zoom',()=>{
 for (const scale of [.5,1,2]) {
  const path=ontologyPanelConnector(320*scale,80*scale,320*scale,22*scale,scale,true);
  const coordinates=path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  assert.deepEqual(coordinates.slice(0,2),[320,80]);
  assert.deepEqual(coordinates.slice(-2),[320,22]);
  assert.notEqual(coordinates.at(-1),112);
 }
});

test('header self relations use distinct title ports and a visible loop',()=>{
 const path=ontologyPanelConnector(320,22,0,22,1,true);
 const coordinates=path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
 assert.deepEqual(coordinates.slice(0,2),[320,22]);
 assert.deepEqual(coordinates.slice(-2),[0,22]);
 assert.ok(coordinates[3]<22 && coordinates[5]<22);
});

test('business field names source, type and owner are dictionary keys, not schema metadata',()=>{
 for (const key of ['source','type','owner']) {
  const source=structuredClone(entity);
  Object.assign(source.record.fields.details.fields!.agenda.fields!,{[key]:{type:'string',title:'Before'}});
  const path=['record','fields','details','fields','agenda','fields',key,'title'];
  const next=patchOntologyPanelValue(source,path,'After');
  assert.equal(next.record.fields.details.fields!.agenda.fields![key].title,'After');
  assert.equal(source.record.fields.details.fields!.agenda.fields![key].title,'Before');
  assert.equal(patchOntologyPanelValue(source,[...path.slice(0,-1),'derived'],true),source);
 }
});
