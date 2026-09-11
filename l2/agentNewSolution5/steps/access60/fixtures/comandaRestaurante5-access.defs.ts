/// <mls fileReference="_102047_/l4/comandaRestaurante5/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestaurante5Access = {
  "schemaVersion": "2026-09-10-ns5-access-v1",
  "moduleName": "comandaRestaurante5",
  "profiles": [
    {
      "profileId": "garcomAtendimento",
      "actorRefs": [
        "garcom"
      ],
      "kind": "internal"
    },
    {
      "profileId": "caixaFechamento",
      "actorRefs": [
        "caixa"
      ],
      "kind": "internal"
    }
  ],
  "authorities": [
    {
      "authorityId": "consultarCardapio",
      "title": "Consultar cardápio",
      "description": "Consulta os itens e preços disponíveis no cardápio."
    },
    {
      "authorityId": "gerirAtendimentoMesa",
      "title": "Gerir atendimento da mesa",
      "description": "Localiza mesas e abre ou consulta comandas durante o atendimento."
    },
    {
      "authorityId": "gerirItensComanda",
      "title": "Gerir itens da comanda",
      "description": "Registra itens pedidos e cancela lançamentos feitos por engano em comandas abertas."
    },
    {
      "authorityId": "conferirEfecharConta",
      "title": "Conferir e fechar conta",
      "description": "Consulta a comanda e seus valores para conferir e encerrar a conta após a quitação."
    },
    {
      "authorityId": "concederDescontoPontual",
      "title": "Conceder desconto pontual",
      "description": "Registra descontos pontuais em uma comanda durante a conferência."
    },
    {
      "authorityId": "registrarPagamento",
      "title": "Registrar pagamento",
      "description": "Registra pagamentos totais ou divididos destinados à comanda."
    }
  ],
  "grants": [
    {
      "grantId": "garcomConsultaCardapio",
      "profileRef": "garcomAtendimento",
      "authorityRef": "consultarCardapio",
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
      "profileRef": "garcomAtendimento",
      "authorityRef": "gerirAtendimentoMesa",
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
      "profileRef": "garcomAtendimento",
      "authorityRef": "gerirItensComanda",
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
      "profileRef": "caixaFechamento",
      "authorityRef": "conferirEfecharConta",
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
      "profileRef": "caixaFechamento",
      "authorityRef": "concederDescontoPontual",
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
      "profileRef": "caixaFechamento",
      "authorityRef": "registrarPagamento",
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
