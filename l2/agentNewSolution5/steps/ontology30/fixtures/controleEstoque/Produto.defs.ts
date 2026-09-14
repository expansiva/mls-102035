/// <mls fileReference="_102047_/l4/controleEstoque/ontology/Produto.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const controleEstoqueEntityProduto = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "controleEstoque",
  "entityId": "Produto",
  "title": "Produto em estoque",
  "description": "Produto disponibilizado para controle de estoque, com quantidade mínima definida para reposição.",
  "kind": "mdm",
  "party": "none",
  "mdmSubtype": "Product",
  "displayField": "name",
  "fields": [
    {
      "fieldId": "quantidadeMinima",
      "title": "Quantidade mínima",
      "type": "integer",
      "required": true,
      "constraints": {
        "min": 0
      },
      "description": "Quantidade mínima de unidades que deve permanecer disponível para o produto."
    }
  ],
  "fieldsBase": [
    { "fieldId": "name", "title": "Nome", "type": "string", "required": true, "description": "Nome do produto." },
    { "fieldId": "sku", "title": "SKU", "type": "string", "required": true, "description": "Código SKU usado para identificar o produto no controle de estoque." },
    { "fieldId": "unitOfMeasure", "title": "Unidade de medida", "type": "string", "required": true, "description": "Unidade de medida das quantidades do produto (ex.: unidade, kg, caixa)." },
    { "fieldId": "isInventoried", "title": "Controlado em estoque", "type": "boolean", "required": true, "description": "Indica se o produto deve ter estoque controlado por movimentações." }
  ],
  "details": {
    "saldoAtual": {
      "type": "integer",
      "description": "Quantidade atual de unidades disponíveis do produto, calculada a partir das movimentações registradas."
    },
    "estoqueBaixo": {
      "type": "boolean",
      "description": "Indica se o saldo atual do produto está abaixo da quantidade mínima configurada."
    }
  },
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "controleEstoque.Produto"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type ControleEstoqueEntityProdutoType = typeof controleEstoqueEntityProduto;

export default controleEstoqueEntityProduto;
