/// <mls fileReference="_102047_/l4/comandaRestaurante5/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestaurante5Rules = {
  "schemaVersion": "2026-09-10-ns5-rules-v1",
  "moduleName": "comandaRestaurante5",
  "rules": [
    {
      "ruleId": "valorTotalDoLancamento",
      "title": "Valor total do lançamento",
      "description": "O valor total de um item da comanda é a quantidade multiplicada pelo preço unitário e é desconsiderado quando o lançamento está cancelado.",
      "appliesTo": {
        "entityRefs": [
          "ItemComanda"
        ],
        "fieldRefs": [
          "ItemComanda.details.valorTotal",
          "ItemComanda.quantidade",
          "ItemComanda.precoUnitario",
          "ItemComanda.status"
        ],
        "transitionRefs": [],
        "journeyRefs": []
      }
    },
    {
      "ruleId": "valorItensDaComanda",
      "title": "Valor dos itens",
      "description": "O valor dos itens da comanda é a soma dos valores dos lançamentos que não foram cancelados.",
      "appliesTo": {
        "entityRefs": [
          "Comanda"
        ],
        "fieldRefs": [
          "Comanda.details.valorItens",
          "ItemComanda.details.valorTotal"
        ],
        "transitionRefs": [],
        "journeyRefs": []
      }
    },
    {
      "ruleId": "valorDescontosDaComanda",
      "title": "Valor dos descontos",
      "description": "O valor dos descontos da comanda é a soma dos descontos pontuais registrados para a comanda.",
      "appliesTo": {
        "entityRefs": [
          "Comanda",
          "Desconto"
        ],
        "fieldRefs": [
          "Comanda.details.valorDescontos",
          "Desconto.valor"
        ],
        "transitionRefs": [],
        "journeyRefs": []
      }
    },
    {
      "ruleId": "valorDevidoDaComanda",
      "title": "Valor devido",
      "description": "O valor devido da comanda é o valor a receber após deduzir os descontos do valor dos itens.",
      "appliesTo": {
        "entityRefs": [
          "Comanda"
        ],
        "fieldRefs": [
          "Comanda.details.valorDevido",
          "Comanda.details.valorItens",
          "Comanda.details.valorDescontos"
        ],
        "transitionRefs": [],
        "journeyRefs": []
      }
    },
    {
      "ruleId": "valorPagoDaComanda",
      "title": "Valor pago",
      "description": "O valor pago da comanda é a soma dos pagamentos registrados para a comanda.",
      "appliesTo": {
        "entityRefs": [
          "Comanda",
          "Pagamento"
        ],
        "fieldRefs": [
          "Comanda.details.valorPago",
          "Pagamento.valor"
        ],
        "transitionRefs": [],
        "journeyRefs": []
      }
    },
    {
      "ruleId": "saldoDevedorDaComanda",
      "title": "Saldo devedor",
      "description": "O saldo devedor da comanda é o valor que ainda falta receber para quitar a comanda, obtido subtraindo o valor pago do valor devido.",
      "appliesTo": {
        "entityRefs": [
          "Comanda"
        ],
        "fieldRefs": [
          "Comanda.details.saldoDevedor",
          "Comanda.details.valorDevido",
          "Comanda.details.valorPago"
        ],
        "transitionRefs": [],
        "journeyRefs": []
      }
    },
    {
      "ruleId": "fecharComandaAposQuitacao",
      "title": "Fechamento após quitação",
      "description": "A comanda só pode ser fechada depois que o caixa conferir o consumo e o valor pago cobrir integralmente o valor devido.",
      "appliesTo": {
        "entityRefs": [
          "Comanda"
        ],
        "fieldRefs": [
          "Comanda.details.valorDevido",
          "Comanda.details.valorPago"
        ],
        "transitionRefs": [
          "Comanda.fecharComanda"
        ],
        "journeyRefs": [
          "conferirEfecharConta"
        ]
      }
    },
    {
      "ruleId": "cancelarItemEmComandaAberta",
      "title": "Cancelamento em comanda aberta",
      "description": "O garçom só pode cancelar um item lançado por engano enquanto a comanda permanece aberta.",
      "appliesTo": {
        "entityRefs": [
          "ItemComanda",
          "Comanda"
        ],
        "fieldRefs": [
          "Comanda.status",
          "ItemComanda.status"
        ],
        "transitionRefs": [
          "ItemComanda.cancelarItem"
        ],
        "journeyRefs": [
          "cancelarItemLancadoPorEngano"
        ]
      }
    }
  ]
} as const satisfies Ns5RulesArtifact;

export type ComandaRestaurante5RulesType = typeof comandaRestaurante5Rules;

export default comandaRestaurante5Rules;
