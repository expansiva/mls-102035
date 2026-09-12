/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/ContratoLocacao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosEntityContratoLocacao = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "locacaoEquipamentos",
  "entityId": "ContratoLocacao",
  "title": "Contrato de locação",
  "description": "Registro da locação de equipamentos para um cliente, com período previsto e encerramento por devolução.",
  "kind": "core",
  "party": "none",
  "displayField": "contractNumber",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do contrato de locação."
    },
    {
      "fieldId": "contractNumber",
      "title": "Número do contrato",
      "type": "string",
      "required": true,
      "unique": true,
      "description": "Número sequencial que identifica o contrato de locação."
    },
    {
      "fieldId": "clienteId",
      "title": "Cliente",
      "type": "uuid",
      "required": true,
      "description": "Referência ao cliente titular do contrato de locação."
    },
    {
      "fieldId": "atendenteId",
      "title": "Atendente responsável",
      "type": "uuid",
      "required": true,
      "description": "Referência ao atendente responsável pela criação do contrato."
    },
    {
      "fieldId": "pickupDate",
      "title": "Data de retirada",
      "type": "date",
      "required": true,
      "description": "Data prevista para retirada dos equipamentos locados."
    },
    {
      "fieldId": "expectedReturnDate",
      "title": "Data prevista de devolução",
      "type": "date",
      "required": true,
      "description": "Data prevista para devolução dos equipamentos."
    },
    {
      "fieldId": "actualReturnDate",
      "title": "Data real de devolução",
      "type": "date",
      "required": false,
      "description": "Data em que os equipamentos foram efetivamente devolvidos."
    },
    {
      "fieldId": "status",
      "title": "Situação do contrato",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "open",
          "title": "Em aberto"
        },
        {
          "value": "completed",
          "title": "Concluído"
        }
      ],
      "description": "Situação atual do contrato de locação."
    }
  ],
  "details": {
    "lateDays": {
      "type": "integer",
      "description": "Quantidade de dias de atraso calculada a partir das datas prevista e real de devolução."
    },
    "lateFee": {
      "type": "money",
      "description": "Multa calculada pela soma das diárias dos itens multiplicada pelos dias de atraso e por 1,5."
    }
  },
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
      "transitionId": "registrarDevolucao",
      "from": [
        "open"
      ],
      "to": "completed",
      "by": [
        "atendente"
      ],
      "description": "Registra a data real de devolução e conclui o contrato de locação."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type LocacaoEquipamentosEntityContratoLocacaoType = typeof locacaoEquipamentosEntityContratoLocacao;

export default locacaoEquipamentosEntityContratoLocacao;
