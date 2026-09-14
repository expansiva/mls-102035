/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/Veiculo.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityVeiculo = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "manutencaoFrota",
  "entityId": "Veiculo",
  "title": "Veículo",
  "description": "Veículo da frota identificado e acompanhado para abastecimentos e manutenções.",
  "kind": "mdm",
  "party": "none",
  "mdmSubtype": "AssetVehicle",
  "displayField": "plate",
  "fields": [
    {
      "fieldId": "currentMileage",
      "title": "Quilometragem atual",
      "type": "integer",
      "required": true,
      "constraints": {
        "min": 0
      },
      "description": "Quilometragem atualmente registrada para o veículo."
    },
    {
      "fieldId": "motoristaId",
      "title": "Motorista atribuído",
      "type": "uuid",
      "required": false,
      "description": "Referência ao motorista atualmente atribuído para conduzir o veículo."
    }
  ],
  "fieldsBase": [
    { "fieldId": "name", "title": "Nome", "type": "string", "required": true, "description": "Nome ou apelido do veículo." },
    { "fieldId": "plate", "title": "Placa", "type": "string", "required": true, "description": "Placa do veículo." },
    { "fieldId": "brand", "title": "Marca", "type": "string", "required": false, "description": "Marca do veículo." },
    { "fieldId": "model", "title": "Modelo", "type": "string", "required": false, "description": "Modelo do veículo." },
    { "fieldId": "year", "title": "Ano", "type": "number", "required": false, "description": "Ano de fabricação do veículo." },
    { "fieldId": "fuelType", "title": "Tipo de combustível", "type": "string", "required": false, "enum": [
      { "value": "Gasoline", "title": "Gasolina" },
      { "value": "Diesel", "title": "Diesel" },
      { "value": "Electric", "title": "Elétrico" },
      { "value": "Hybrid", "title": "Híbrido" },
      { "value": "Flex", "title": "Flex" },
      { "value": "Other", "title": "Outro" }
    ], "description": "Tipo de combustível utilizado pelo veículo." }
  ],
  "details": {
    "preventiveMaintenanceOverdue": {
      "type": "boolean",
      "description": "Indica se algum plano preventivo do veículo ultrapassou a quilometragem prevista para manutenção."
    }
  },
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "manutencaoFrota.Veiculo"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type ManutencaoFrotaEntityVeiculoType = typeof manutencaoFrotaEntityVeiculo;

export default manutencaoFrotaEntityVeiculo;
