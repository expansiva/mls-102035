/// <mls fileReference="_102047_/l4/controleEstoque/ontology/MovimentacaoEstoque.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const controleEstoqueEntityMovimentacaoEstoque = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "controleEstoque",
  "entityId": "MovimentacaoEstoque",
  "title": "Movimentação de estoque",
  "description": "Registro imutável de entrada ou saída de unidades de um produto no estoque.",
  "kind": "event",
  "party": "none",
  "displayField": "tipoMovimentacao",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único da movimentação de estoque."
    },
    {
      "fieldId": "tipoMovimentacao",
      "title": "Tipo de movimentação",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "entrada",
          "title": "Entrada"
        },
        {
          "value": "saida",
          "title": "Saída"
        }
      ],
      "description": "Indica se as unidades foram adicionadas ou retiradas do estoque."
    },
    {
      "fieldId": "produtoId",
      "title": "Produto",
      "type": "uuid",
      "required": true,
      "description": "Referência ao produto ao qual a movimentação se aplica."
    },
    {
      "fieldId": "quantidade",
      "title": "Quantidade",
      "type": "integer",
      "required": true,
      "constraints": {
        "min": 1
      },
      "description": "Quantidade de unidades registrada na entrada ou saída."
    },
    {
      "fieldId": "dataMovimentacao",
      "title": "Data da movimentação",
      "type": "datetime",
      "required": true,
      "description": "Data e hora em que a movimentação foi registrada."
    }
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

export type ControleEstoqueEntityMovimentacaoEstoqueType = typeof controleEstoqueEntityMovimentacaoEstoque;

export default controleEstoqueEntityMovimentacaoEstoque;
