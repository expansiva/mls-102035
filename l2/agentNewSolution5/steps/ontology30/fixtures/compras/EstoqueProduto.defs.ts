/// <mls fileReference="_102047_/l4/compras/ontology/EstoqueProduto.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comprasEntityEstoqueProduto = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "compras",
  "entityId": "EstoqueProduto",
  "title": "Estoque do produto",
  "description": "Posição de estoque do produto mantida pelo módulo de controle de estoque e atualizada a partir dos recebimentos.",
  "kind": "supporting",
  "party": "none",
  "displayField": "name",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador da posição de estoque na plataforma externa."
    },
    {
      "fieldId": "name",
      "title": "Nome",
      "type": "string",
      "required": true,
      "constraints": {
        "maxLength": 255
      },
      "description": "Nome de exibição da posição de estoque do produto na plataforma externa."
    }
  ],
  "details": {
    "quantidadeDisponivel": {
      "type": "number",
      "description": "Quantidade disponível do produto na posição de estoque, calculada pela plataforma de estoque."
    }
  },
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "external",
    "scope": "platform",
    "idField": "id"
  },
  "mutability": "appendOnly"
} as const satisfies Ns5OntologyEntityArtifact;

export type ComprasEntityEstoqueProdutoType = typeof comprasEntityEstoqueProduto;

export default comprasEntityEstoqueProduto;
