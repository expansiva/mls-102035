/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/OrdemManutencao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityOrdemManutencao = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "manutencaoFrota",
  "entityId": "OrdemManutencao",
  "title": "Ordem de manutenção",
  "description": "Ordem aberta para executar manutenção preventiva vencida ou corrigir um defeito de veículo.",
  "kind": "core",
  "party": "none",
  "displayField": "dataEntrada",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único da ordem de manutenção."
    },
    {
      "fieldId": "veiculoId",
      "title": "Veículo",
      "type": "uuid",
      "required": true,
      "description": "Veículo para o qual a manutenção foi aberta."
    },
    {
      "fieldId": "planoManutencaoPreventivaId",
      "title": "Plano de manutenção preventiva",
      "type": "uuid",
      "required": false,
      "description": "Plano preventivo que motivou a ordem, quando aplicável."
    },
    {
      "fieldId": "oficinaId",
      "title": "Oficina",
      "type": "uuid",
      "required": true,
      "description": "Oficina responsável pela execução do serviço."
    },
    {
      "fieldId": "motivo",
      "title": "Motivo da manutenção",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "preventive",
          "title": "Manutenção preventiva"
        },
        {
          "value": "defect",
          "title": "Defeito identificado"
        }
      ],
      "description": "Motivo que originou a ordem de manutenção."
    },
    {
      "fieldId": "descricao",
      "title": "Descrição do serviço ou defeito",
      "type": "text",
      "required": true,
      "description": "Descrição do serviço preventivo a executar ou do defeito identificado."
    },
    {
      "fieldId": "dataEntrada",
      "title": "Data de entrada",
      "type": "date",
      "required": true,
      "description": "Data de entrada do veículo na oficina."
    },
    {
      "fieldId": "dataSaida",
      "title": "Data de saída",
      "type": "date",
      "required": false,
      "description": "Data de saída do veículo da oficina após a conclusão do serviço."
    },
    {
      "fieldId": "custo",
      "title": "Custo da manutenção",
      "type": "money",
      "required": false,
      "constraints": {
        "precision": 2
      },
      "description": "Valor total registrado para a manutenção executada."
    },
    {
      "fieldId": "status",
      "title": "Situação",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "open",
          "title": "Aberta"
        },
        {
          "value": "completed",
          "title": "Concluída"
        }
      ],
      "description": "Situação atual da ordem de manutenção."
    }
  ],
  "lifecycleStates": [
    {
      "state": "open",
      "reachedBy": "actor"
    },
    {
      "state": "completed",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "concluirOrdem",
      "from": [
        "open"
      ],
      "to": "completed",
      "by": [
        "gestorFrota"
      ],
      "description": "Registra o custo e a data de saída do veículo, concluindo a ordem de manutenção."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type ManutencaoFrotaEntityOrdemManutencaoType = typeof manutencaoFrotaEntityOrdemManutencao;

export default manutencaoFrotaEntityOrdemManutencao;
