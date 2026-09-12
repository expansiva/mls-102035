/// <mls fileReference="_102047_/l4/reembolsoDespesas/ontology/Despesa.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasEntityDespesa = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "reembolsoDespesas",
  "entityId": "Despesa",
  "title": "Despesa",
  "description": "Despesa registrada por um colaborador para solicitação de reembolso, submetida à avaliação e posteriormente ao pagamento.",
  "kind": "core",
  "party": "none",
  "displayField": "description",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único da despesa."
    },
    {
      "fieldId": "collaboratorId",
      "title": "Colaborador",
      "type": "uuid",
      "required": true,
      "description": "Referência à pessoa colaboradora que registrou a despesa."
    },
    {
      "fieldId": "expenseDate",
      "title": "Data da despesa",
      "type": "date",
      "required": true,
      "description": "Data em que a despesa ocorreu."
    },
    {
      "fieldId": "category",
      "title": "Categoria",
      "type": "string",
      "required": true,
      "constraints": {
        "maxLength": 100
      },
      "description": "Categoria informada para classificar a despesa."
    },
    {
      "fieldId": "amount",
      "title": "Valor",
      "type": "money",
      "required": true,
      "constraints": {
        "min": 0.01,
        "precision": 2
      },
      "description": "Valor monetário solicitado para reembolso."
    },
    {
      "fieldId": "description",
      "title": "Descrição",
      "type": "text",
      "required": true,
      "constraints": {
        "maxLength": 2000
      },
      "description": "Descrição da despesa para reembolso."
    },
    {
      "fieldId": "receiptDocumentId",
      "title": "Comprovante",
      "type": "uuid",
      "required": true,
      "description": "Referência ao documento que contém o comprovante da despesa."
    },
    {
      "fieldId": "rejectionReason",
      "title": "Motivo da rejeição",
      "type": "text",
      "required": false,
      "constraints": {
        "maxLength": 1000
      },
      "description": "Motivo informado pelo gestor quando a despesa é rejeitada."
    },
    {
      "fieldId": "resubmissionCount",
      "title": "Quantidade de reenvios",
      "type": "integer",
      "required": true,
      "constraints": {
        "min": 0
      },
      "description": "Quantidade de vezes que uma despesa rejeitada foi reenviada para aprovação."
    },
    {
      "fieldId": "paymentDate",
      "title": "Data de pagamento",
      "type": "date",
      "required": false,
      "description": "Data em que o financeiro registrou o pagamento do reembolso."
    },
    {
      "fieldId": "status",
      "title": "Situação",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "registered",
          "title": "Registrada"
        },
        {
          "value": "pendingApproval",
          "title": "Aguardando aprovação"
        },
        {
          "value": "rejected",
          "title": "Rejeitada"
        },
        {
          "value": "approved",
          "title": "Aprovada"
        },
        {
          "value": "paid",
          "title": "Paga"
        }
      ],
      "description": "Situação atual da despesa no processo de reembolso."
    }
  ],
  "lifecycleStates": [
    {
      "state": "registered",
      "reachedBy": "actor"
    },
    {
      "state": "pendingApproval",
      "reachedBy": "actor"
    },
    {
      "state": "rejected",
      "reachedBy": "actor"
    },
    {
      "state": "approved",
      "reachedBy": "actor"
    },
    {
      "state": "paid",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "submitForApproval",
      "from": [
        "registered"
      ],
      "to": "pendingApproval",
      "by": [
        "colaborador"
      ],
      "description": "Envia a despesa registrada para avaliação do gestor da equipe."
    },
    {
      "transitionId": "approveExpense",
      "from": [
        "pendingApproval"
      ],
      "to": "approved",
      "by": [
        "gestorEquipe"
      ],
      "description": "Aprova a despesa enviada após avaliação do gestor."
    },
    {
      "transitionId": "rejectExpense",
      "from": [
        "pendingApproval"
      ],
      "to": "rejected",
      "by": [
        "gestorEquipe"
      ],
      "description": "Rejeita a despesa enviada, registrando o motivo da rejeição."
    },
    {
      "transitionId": "resubmitForApproval",
      "from": [
        "rejected"
      ],
      "to": "pendingApproval",
      "by": [
        "colaborador"
      ],
      "description": "Reenvia uma despesa corrigida para uma nova avaliação.",
      "ruleRefs": [
        "oneResubmission"
      ]
    },
    {
      "transitionId": "recordPayment",
      "from": [
        "approved"
      ],
      "to": "paid",
      "by": [
        "financeiro"
      ],
      "description": "Registra o pagamento da despesa aprovada."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type ReembolsoDespesasEntityDespesaType = typeof reembolsoDespesasEntityDespesa;

export default reembolsoDespesasEntityDespesa;
