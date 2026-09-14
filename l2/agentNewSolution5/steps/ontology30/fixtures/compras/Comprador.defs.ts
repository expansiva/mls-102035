/// <mls fileReference="_102047_/l4/compras/ontology/Comprador.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comprasEntityComprador = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "compras",
  "entityId": "Comprador",
  "title": "Comprador",
  "description": "Profissional da organização responsável por cadastrar fornecedores, definir seus produtos e preços e abrir pedidos de compra.",
  "kind": "mdm",
  "party": "person",
  "mdmSubtype": "Person",
  "displayField": "name",
  "fields": [],
  "fieldsBase": [
    { "fieldId": "name", "title": "Nome completo", "type": "string", "required": true, "description": "Nome completo do comprador." },
    { "fieldId": "contacts", "title": "Contatos", "type": "json", "required": true, "description": "Contatos do comprador (telefone, e-mail)." }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "compras.Comprador"
  },
  "writer": "crud"
} as const satisfies Ns5OntologyEntityArtifact;

export type ComprasEntityCompradorType = typeof comprasEntityComprador;

export default comprasEntityComprador;
