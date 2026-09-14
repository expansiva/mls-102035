/// <mls fileReference="_102047_/l4/reembolsoDespesas/ontology/GestorEquipe.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasEntityGestorEquipe = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "reembolsoDespesas",
  "entityId": "GestorEquipe",
  "title": "Gestor da equipe",
  "description": "Pessoa responsável por avaliar as despesas dos colaboradores de sua equipe.",
  "kind": "mdm",
  "party": "person",
  "mdmSubtype": "Person",
  "displayField": "name",
  "fields": [],
  "fieldsBase": [
    { "fieldId": "name", "title": "Nome completo", "type": "string", "required": true, "description": "Nome completo do gestor da equipe." }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "gestorEquipeId",
    "mdmType": "reembolsoDespesas.GestorEquipe"
  },
  "writer": "crud"
} as const satisfies Ns5OntologyEntityArtifact;

export type ReembolsoDespesasEntityGestorEquipeType = typeof reembolsoDespesasEntityGestorEquipe;

export default reembolsoDespesasEntityGestorEquipe;
