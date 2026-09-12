/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/PlanoManutencao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityPlanoManutencao = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "manutencaoFrota",
  "entityId": "PlanoManutencao",
  "title": "Plano de manutenção",
  "description": "Definição da periodicidade de manutenção preventiva de um veículo por quilometragem, meses ou ambos.",
  "kind": "core",
  "party": "none",
  "displayField": "id",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do plano de manutenção preventiva."
    },
    {
      "fieldId": "veiculoId",
      "title": "Veículo",
      "type": "uuid",
      "required": true,
      "description": "Referência ao veículo ao qual este plano preventivo se aplica."
    },
    {
      "fieldId": "intervaloQuilometragem",
      "title": "Intervalo em quilômetros",
      "type": "integer",
      "required": false,
      "constraints": {
        "min": 1
      },
      "description": "Quantidade de quilômetros entre as manutenções preventivas quando o critério por quilometragem for utilizado."
    },
    {
      "fieldId": "intervaloMeses",
      "title": "Intervalo em meses",
      "type": "integer",
      "required": false,
      "constraints": {
        "min": 1
      },
      "description": "Quantidade de meses entre as manutenções preventivas quando o critério por tempo for utilizado."
    },
    {
      "fieldId": "quilometragemReferencia",
      "title": "Quilometragem de referência",
      "type": "integer",
      "required": true,
      "constraints": {
        "min": 0
      },
      "description": "Quilometragem do veículo usada como base para calcular a próxima preventiva por distância."
    },
    {
      "fieldId": "dataReferencia",
      "title": "Data de referência",
      "type": "date",
      "required": true,
      "description": "Data usada como base para calcular a próxima preventiva por tempo."
    }
  ],
  "details": {
    "proximaQuilometragemPrevista": {
      "type": "integer",
      "description": "Quilometragem calculada em que a próxima manutenção preventiva deve ser realizada."
    },
    "proximaDataPrevista": {
      "type": "date",
      "description": "Data calculada em que a próxima manutenção preventiva deve ser realizada pelo critério de tempo."
    },
    "preventivaVencida": {
      "type": "boolean",
      "description": "Indica se a quilometragem atual do veículo já ultrapassou a quilometragem prevista para a preventiva."
    }
  },
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  },
  "mutability": "appendOnly"
} as const satisfies Ns5OntologyEntityArtifact;

export type ManutencaoFrotaEntityPlanoManutencaoType = typeof manutencaoFrotaEntityPlanoManutencao;

export default manutencaoFrotaEntityPlanoManutencao;
