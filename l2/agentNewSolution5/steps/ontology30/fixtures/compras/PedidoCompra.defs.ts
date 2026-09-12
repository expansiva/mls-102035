/// <mls fileReference="_102047_/l4/compras/ontology/PedidoCompra.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const comprasEntityPedidoCompra = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "compras",
  "entityId": "PedidoCompra",
  "title": "Pedido de compra",
  "description": "Solicitação de compra aberta para um fornecedor, composta por produtos, quantidades e preços.",
  "kind": "core",
  "party": "none",
  "displayField": "numeroPedido",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do pedido de compra."
    },
    {
      "fieldId": "numeroPedido",
      "title": "Número do pedido",
      "type": "string",
      "required": true,
      "unique": true,
      "constraints": {
        "maxLength": 50
      },
      "description": "Número sequencial que identifica o pedido de compra."
    },
    {
      "fieldId": "fornecedorId",
      "title": "Fornecedor",
      "type": "uuid",
      "required": true,
      "description": "Referência ao fornecedor para o qual o pedido foi emitido."
    },
    {
      "fieldId": "dataEmissao",
      "title": "Data de emissão",
      "type": "date",
      "required": true,
      "description": "Data em que o pedido de compra foi aberto."
    },
    {
      "fieldId": "dataPrevistaEntrega",
      "title": "Data prevista de entrega",
      "type": "date",
      "required": true,
      "description": "Data prevista para a entrega dos produtos do pedido."
    },
    {
      "fieldId": "dataEnvio",
      "title": "Data de envio",
      "type": "datetime",
      "required": false,
      "description": "Data e hora em que o pedido foi enviado para processamento."
    },
    {
      "fieldId": "situacaoAprovacao",
      "title": "Situação da aprovação",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "notRequired",
          "title": "Não requerida"
        },
        {
          "value": "pending",
          "title": "Pendente"
        },
        {
          "value": "approved",
          "title": "Aprovada"
        },
        {
          "value": "rejected",
          "title": "Rejeitada"
        }
      ],
      "description": "Resultado ou pendência da aprovação do pedido conforme o valor limite."
    },
    {
      "fieldId": "status",
      "title": "Status",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "draft",
          "title": "Rascunho"
        },
        {
          "value": "pendingApproval",
          "title": "Pendente de aprovação"
        },
        {
          "value": "processed",
          "title": "Processado"
        },
        {
          "value": "partiallyReceived",
          "title": "Parcialmente recebido"
        },
        {
          "value": "received",
          "title": "Recebido"
        }
      ],
      "description": "Etapa atual do processamento e recebimento do pedido de compra."
    }
  ],
  "details": {
    "valorTotal": {
      "type": "money",
      "description": "Soma dos valores dos itens do pedido conforme quantidades e preços registrados."
    },
    "valorRecebido": {
      "type": "money",
      "description": "Soma dos valores correspondentes às quantidades já recebidas no pedido."
    },
    "percentualRecebido": {
      "type": "number",
      "description": "Percentual das quantidades previstas no pedido que já foram recebidas."
    },
    "estaAtrasado": {
      "type": "boolean",
      "description": "Indica se a data prevista de entrega foi ultrapassada antes do recebimento total."
    }
  },
  "lifecycleStates": [
    {
      "state": "draft",
      "reachedBy": "actor"
    },
    {
      "state": "pendingApproval",
      "reachedBy": "actor"
    },
    {
      "state": "processed",
      "reachedBy": "actor"
    },
    {
      "state": "partiallyReceived",
      "reachedBy": "command"
    },
    {
      "state": "received",
      "reachedBy": "command"
    }
  ],
  "transitions": [
    {
      "transitionId": "enviarPedido",
      "from": [
        "draft"
      ],
      "to": "pendingApproval",
      "by": [
        "comprador"
      ],
      "description": "Envia o pedido para avaliação da aprovação aplicável ao seu valor."
    },
    {
      "transitionId": "decidirPedido",
      "from": [
        "pendingApproval"
      ],
      "to": "processed",
      "by": [
        "gerenteCompras"
      ],
      "description": "Registra a decisão de aprovação ou rejeição do pedido, indicada na situação da aprovação."
    },
    {
      "transitionId": "liberarPedidoSemAprovacao",
      "from": [
        "pendingApproval"
      ],
      "to": "processed",
      "by": "system",
      "description": "Processa o pedido que não exige aprovação gerencial conforme o valor limite."
    },
    {
      "transitionId": "registrarRecebimentoParcial",
      "from": [
        "processed",
        "partiallyReceived"
      ],
      "to": "partiallyReceived",
      "by": "system",
      "description": "Atualiza o pedido após um recebimento que ainda não completa todas as quantidades previstas."
    },
    {
      "transitionId": "registrarRecebimentoTotal",
      "from": [
        "processed",
        "partiallyReceived"
      ],
      "to": "received",
      "by": "system",
      "description": "Atualiza o pedido quando os recebimentos completam todas as quantidades previstas."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type ComprasEntityPedidoCompraType = typeof comprasEntityPedidoCompra;

export default comprasEntityPedidoCompra;
