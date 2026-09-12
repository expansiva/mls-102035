/// <mls fileReference="_102047_/l4/compras/ontology/FornecimentoProduto.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comprasEntityFornecimentoProduto = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "compras",
  "entityId": "FornecimentoProduto",
  "title": "Fornecimento de produto",
  "description": "Condição comercial que registra um produto fornecido por um fornecedor e o preço combinado.",
  "kind": "supporting",
  "party": "none",
  "displayField": "produto",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do registro de fornecimento de produto."
    },
    {
      "fieldId": "fornecedor",
      "title": "Fornecedor",
      "type": "uuid",
      "required": true,
      "description": "Referência à empresa fornecedora à qual a condição comercial pertence."
    },
    {
      "fieldId": "produto",
      "title": "Produto",
      "type": "uuid",
      "required": true,
      "description": "Referência ao produto fornecido sob esta condição comercial."
    },
    {
      "fieldId": "precoCombinado",
      "title": "Preço combinado",
      "type": "money",
      "required": true,
      "description": "Preço comercial acordado entre a organização e o fornecedor para o produto."
    }
  ],
  "uniqueKeys": [
    [
      "fornecedor",
      "produto"
    ]
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  },
  "mutability": "appendOnly"
} as const satisfies Ns5OntologyEntityArtifact;

export type ComprasEntityFornecimentoProdutoType = typeof comprasEntityFornecimentoProduto;

export default comprasEntityFornecimentoProduto;
