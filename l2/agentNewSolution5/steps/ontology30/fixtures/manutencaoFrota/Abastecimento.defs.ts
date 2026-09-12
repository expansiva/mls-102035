/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/Abastecimento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityAbastecimento = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "manutencaoFrota",
  "entityId": "Abastecimento",
  "title": "Abastecimento",
  "description": "Registro do abastecimento realizado em um veículo por um motorista.",
  "kind": "event",
  "party": "none",
  "displayField": "data",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do registro de abastecimento."
    },
    {
      "fieldId": "data",
      "title": "Data do abastecimento",
      "type": "date",
      "required": true,
      "description": "Data em que o abastecimento foi realizado."
    },
    {
      "fieldId": "litros",
      "title": "Litros abastecidos",
      "type": "number",
      "required": true,
      "description": "Quantidade de litros abastecidos no veículo."
    },
    {
      "fieldId": "valor",
      "title": "Valor do abastecimento",
      "type": "money",
      "required": true,
      "constraints": {
        "precision": 2
      },
      "description": "Valor total pago pelo abastecimento."
    },
    {
      "fieldId": "quilometragemPainel",
      "title": "Quilometragem no painel",
      "type": "integer",
      "required": true,
      "description": "Quilometragem exibida no painel do veículo no momento do abastecimento."
    },
    {
      "fieldId": "veiculoId",
      "title": "Veículo",
      "type": "uuid",
      "required": true,
      "description": "Referência ao veículo da frota que recebeu o abastecimento."
    },
    {
      "fieldId": "motoristaId",
      "title": "Motorista",
      "type": "uuid",
      "required": true,
      "description": "Referência ao motorista que registrou o abastecimento."
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

export type ManutencaoFrotaEntityAbastecimentoType = typeof manutencaoFrotaEntityAbastecimento;

export default manutencaoFrotaEntityAbastecimento;
