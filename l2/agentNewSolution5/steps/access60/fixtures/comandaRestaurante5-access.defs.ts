/// <mls fileReference="_102047_/l4/comandaRestaurante5/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestaurante5Access = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "comandaRestaurante5",
  "actors": [
    {
      "actorId": "garcom",
      "kind": "internal",
      "origin": "named",
      "title": "Garçom",
      "description": "Abre comandas nas mesas e registra ou cancela itens pedidos."
    },
    {
      "actorId": "caixa",
      "kind": "internal",
      "origin": "named",
      "title": "Caixa",
      "description": "Confere comandas, aplica descontos pontuais e recebe pagamentos para fechar contas."
    }
  ],
  "grants": [
    {
      "grantId": "garcomConsultaCardapio",
      "actorRef": "garcom",
      "title": "Consultar cardápio",
      "description": "Consulta os itens e preços disponíveis no cardápio.",
      "entityRefs": [
        "ItemCardapio"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Itens do cardápio disponibilizados pelo restaurante."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Identificação e preço de venda dos itens do cardápio."
      }
    },
    {
      "grantId": "garcomGerenciaAtendimento",
      "actorRef": "garcom",
      "title": "Gerir atendimento da mesa",
      "description": "Localiza mesas e abre ou consulta comandas durante o atendimento.",
      "entityRefs": [
        "Mesa",
        "Comanda"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Mesas e comandas do restaurante necessárias ao atendimento."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Identificação da mesa e dados operacionais da comanda.",
        "allowedFields": [
          "Mesa.id",
          "Comanda.id",
          "Comanda.numero",
          "Comanda.mesa",
          "Comanda.status"
        ]
      }
    },
    {
      "grantId": "garcomGerenciaItens",
      "actorRef": "garcom",
      "title": "Gerir itens da comanda",
      "description": "Registra itens pedidos e cancela lançamentos feitos por engano em comandas abertas.",
      "entityRefs": [
        "ItemComanda"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Itens lançados nas comandas do restaurante."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Dados necessários para registrar, identificar e cancelar itens da comanda."
      }
    },
    {
      "grantId": "caixaConfereEfechaConta",
      "actorRef": "caixa",
      "title": "Conferir e fechar conta",
      "description": "Consulta a comanda e seus valores para conferir e encerrar a conta após a quitação.",
      "entityRefs": [
        "Comanda",
        "ItemComanda"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Comandas e respectivos itens apresentados para conferência e fechamento."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Dados completos de consumo, cancelamentos e valores para conferir e encerrar a conta."
      }
    },
    {
      "grantId": "caixaConcedeDesconto",
      "actorRef": "caixa",
      "title": "Conceder desconto pontual",
      "description": "Registra descontos pontuais em uma comanda durante a conferência.",
      "entityRefs": [
        "Desconto"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Descontos pontuais concedidos nas comandas do restaurante."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Dados necessários para registrar e consultar descontos pontuais."
      }
    },
    {
      "grantId": "caixaRegistraPagamento",
      "actorRef": "caixa",
      "title": "Registrar pagamento",
      "description": "Registra pagamentos totais ou divididos destinados à comanda.",
      "entityRefs": [
        "Pagamento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Pagamentos recebidos para as comandas do restaurante."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Dados necessários para registrar e consultar pagamentos recebidos."
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type ComandaRestaurante5AccessType = typeof comandaRestaurante5Access;

export default comandaRestaurante5Access;
