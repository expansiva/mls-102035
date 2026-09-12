/// <mls fileReference="_102047_/l4/compras/ontology/Produto.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comprasEntityProduto = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "compras",
  "entityId": "Produto",
  "title": "Produto",
  "description": "Produto mestre referenciado do módulo de controle de estoque para composição de fornecimentos, pedidos e recebimentos.",
  "kind": "supporting",
  "party": "none",
  "displayField": "name",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador do produto",
      "type": "uuid",
      "required": true,
      "description": "Identificador do produto mestre no módulo de controle de estoque."
    },
    {
      "fieldId": "name",
      "title": "Nome do produto",
      "type": "string",
      "required": true,
      "constraints": {
        "maxLength": 255
      },
      "description": "Nome de exibição do produto mestre referenciado para compor fornecimentos, pedidos e recebimentos."
    }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "external",
    "scope": "platform",
    "idField": "id"
  },
  "mutability": "appendOnly"
} as const satisfies Ns5OntologyEntityArtifact;

export type ComprasEntityProdutoType = typeof comprasEntityProduto;

export default comprasEntityProduto;
