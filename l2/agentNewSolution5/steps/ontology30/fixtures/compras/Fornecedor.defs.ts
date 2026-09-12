/// <mls fileReference="_102047_/l4/compras/ontology/Fornecedor.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comprasEntityFornecedor = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "compras",
  "entityId": "Fornecedor",
  "title": "Fornecedor",
  "description": "Empresa fornecedora cadastrada ou vinculada pela organização para realizar compras.",
  "kind": "mdm",
  "party": "organization",
  "mdmSubtype": "Company",
  "displayField": "legalName",
  "fields": [],
  "details": {
    "totalCompradoNoMes": {
      "type": "money",
      "description": "Valor total dos pedidos de compra do fornecedor no mês corrente."
    }
  },
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "compras.Fornecedor"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type ComprasEntityFornecedorType = typeof comprasEntityFornecedor;

export default comprasEntityFornecedor;
