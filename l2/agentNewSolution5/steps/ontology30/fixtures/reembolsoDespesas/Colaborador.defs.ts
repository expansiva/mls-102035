/// <mls fileReference="_102047_/l4/reembolsoDespesas/ontology/Colaborador.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasEntityColaborador = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "reembolsoDespesas",
  "entityId": "Colaborador",
  "title": "Colaborador",
  "description": "Pessoa que registra, acompanha e corrige as próprias despesas para reembolso.",
  "kind": "mdm",
  "party": "person",
  "mdmSubtype": "Person",
  "displayField": "name",
  "fields": [],
  "fieldsBase": [
    { "fieldId": "name", "title": "Nome completo", "type": "string", "required": true, "description": "Nome completo do colaborador." },
    { "fieldId": "contacts", "title": "Contatos", "type": "json", "required": true, "description": "Contatos do colaborador (telefone, e-mail)." }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "colaboradorId",
    "mdmType": "reembolsoDespesas.Colaborador"
  },
  "writer": "crud"
} as const satisfies Ns5OntologyEntityArtifact;

export type ReembolsoDespesasEntityColaboradorType = typeof reembolsoDespesasEntityColaborador;

export default reembolsoDespesasEntityColaborador;
