/// <mls fileReference="_102047_/l4/comandaRestaurante5/ontology/Comanda.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestaurante5EntityComanda = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "comandaRestaurante5",
  "entityId": "Comanda",
  "title": "Comanda",
  "description": "Registro de atendimento e consumo aberto para uma mesa até o fechamento da conta.",
  "kind": "core",
  "party": "none",
  "displayField": "numero",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único da comanda."
    },
    {
      "fieldId": "numero",
      "title": "Número da comanda",
      "type": "integer",
      "required": true,
      "description": "Número exibido para identificar a comanda no atendimento."
    },
    {
      "fieldId": "mesa",
      "title": "Mesa",
      "type": "uuid",
      "required": true,
      "description": "Mesa selecionada para o atendimento desta comanda."
    },
    {
      "fieldId": "status",
      "title": "Situação",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "aberta",
          "title": "Aberta"
        },
        {
          "value": "fechada",
          "title": "Fechada"
        }
      ],
      "description": "Situação atual da comanda durante o atendimento e o fechamento."
    }
  ],
  "details": {
    "valorItens": {
      "type": "money",
      "description": "Soma os valores dos itens da comanda que não foram cancelados."
    },
    "valorDescontos": {
      "type": "money",
      "description": "Soma os descontos pontuais registrados para a comanda."
    },
    "valorDevido": {
      "type": "money",
      "description": "Calcula o valor a receber após deduzir os descontos do valor dos itens."
    },
    "valorPago": {
      "type": "money",
      "description": "Soma os pagamentos registrados para a comanda."
    },
    "saldoDevedor": {
      "type": "money",
      "description": "Calcula o valor que ainda falta receber para quitar a comanda."
    }
  },
  "lifecycleStates": [
    {
      "state": "aberta",
      "reachedBy": "actor"
    },
    {
      "state": "fechada",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "fecharComanda",
      "from": [
        "aberta"
      ],
      "to": "fechada",
      "by": [
        "caixa"
      ],
      "description": "O caixa fecha a comanda após conferir o consumo e receber integralmente o valor devido."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type ComandaRestaurante5EntityComandaType = typeof comandaRestaurante5EntityComanda;

export default comandaRestaurante5EntityComanda;
