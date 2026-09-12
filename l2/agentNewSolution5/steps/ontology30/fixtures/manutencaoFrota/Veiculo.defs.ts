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
