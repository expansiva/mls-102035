/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/Cliente.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosEntityCliente = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "locacaoEquipamentos",
  "entityId": "Cliente",
  "title": "Cliente",
  "description": "Pessoa cadastrada como cliente da locadora e vinculada aos seus contratos de locação.",
  "kind": "mdm",
  "party": "person",
  "mdmSubtype": "Person",
  "displayField": "name",
  "fields": [],
  "fieldsBase": [
    { "fieldId": "name", "title": "Nome completo", "type": "string", "required": true, "description": "Nome completo do cliente." },
    { "fieldId": "docType", "title": "Tipo de documento", "type": "string", "required": true, "enum": [{ "value": "CPF", "title": "CPF" }], "description": "Tipo de documento de identificação do cliente." },
    { "fieldId": "docId", "title": "CPF", "type": "string", "required": true, "description": "Número do CPF do cliente." },
    { "fieldId": "contacts", "title": "Contatos", "type": "json", "required": true, "description": "Contatos do cliente (telefone, e-mail)." },
    { "fieldId": "addresses", "title": "Endereços", "type": "json", "required": true, "description": "Endereços do cliente." }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "locacaoEquipamentos.Cliente"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type LocacaoEquipamentosEntityClienteType = typeof locacaoEquipamentosEntityCliente;

export default locacaoEquipamentosEntityCliente;
