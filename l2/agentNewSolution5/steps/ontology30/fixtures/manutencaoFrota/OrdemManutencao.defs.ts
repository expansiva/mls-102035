/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/OrdemManutencao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityOrdemManutencao = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "manutencaoFrota",
  "entityId": "OrdemManutencao",
  "title": "Ordem de manutenção",
  "description": "Registro do encaminhamento de um veículo para manutenção preventiva ou corretiva e da conclusão do serviço.",
  "kind": "core",
  "party": "none",
  "displayField": "descricao",
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
      "description": "Referência ao veículo encaminhado para manutenção."
    },
    {
      "fieldId": "planoManutencaoId",
      "title": "Plano de manutenção",
      "type": "uuid",
      "required": false,
      "description": "Referência ao plano preventivo que motivou a abertura da ordem, quando aplicável."
    },
    {
      "fieldId": "oficinaId",
      "title": "Oficina",
      "type": "uuid",
      "required": true,
      "description": "Referência à oficina responsável pela execução do serviço."
    },
    {
      "fieldId": "descricao",
      "title": "Descrição",
      "type": "text",
      "required": true,
      "description": "Descrição do defeito identificado ou do serviço de manutenção solicitado."
    },
    {
      "fieldId": "dataEntrada",
      "title": "Data de entrada",
      "type": "date",
      "required": true,
      "description": "Data em que o veículo foi encaminhado à oficina."
    },
    {
      "fieldId": "custo",
      "title": "Custo",
      "type": "money",
      "required": false,
      "description": "Custo informado para o serviço de manutenção concluído."
    },
    {
      "fieldId": "dataSaida",
      "title": "Data de saída",
      "type": "date",
      "required": false,
      "description": "Data em que o veículo foi liberado pela oficina."
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

export type ManutencaoFrotaEntityOrdemManutencaoType = typeof manutencaoFrotaEntityOrdemManutencao;

export default manutencaoFrotaEntityOrdemManutencao;
