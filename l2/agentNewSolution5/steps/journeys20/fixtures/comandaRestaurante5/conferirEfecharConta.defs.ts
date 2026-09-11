/// <mls fileReference="_102047_/l4/comandaRestaurante5/journeys/conferirEfecharConta.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const conferirEfecharContaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "conferirEfecharConta",
  "business": {
    "actorRef": "caixa",
    "title": "Conferir e fechar conta",
    "goal": "Conferir a comanda, aplicar desconto pontual quando necessário e receber os pagamentos para encerrar a conta.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarComandaParaFechamento",
        "kind": "locate",
        "entity": "Comanda",
        "title": "Localizar comanda",
        "description": "Localiza a comanda apresentada para pagamento."
      },
      {
        "stepId": "conferirComanda",
        "kind": "inspect",
        "entity": "Comanda",
        "title": "Conferir comanda",
        "description": "Confere os itens, cancelamentos e o valor total da comanda."
      },
      {
        "stepId": "aplicarDescontoPontual",
        "kind": "act",
        "entity": "Desconto",
        "affects": [
          "Comanda"
        ],
        "title": "Aplicar desconto pontual",
        "description": "Registra um desconto pontual quando ele for concedido."
      },
      {
        "stepId": "registrarPagamentosDivididos",
        "kind": "act",
        "entity": "Pagamento",
        "affects": [
          "Comanda"
        ],
        "title": "Registrar pagamentos",
        "description": "Registra um ou mais pagamentos, inclusive valores divididos entre as pessoas da mesa."
      },
      {
        "stepId": "fecharComanda",
        "kind": "act",
        "entity": "Comanda",
        "title": "Fechar comanda",
        "description": "Encerra a conta após o recebimento integral do valor devido."
      }
    ],
    "outcome": {
      "statement": "A conta é fechada com os pagamentos recebidos e eventuais descontos registrados.",
      "evidence": [
        "Comanda identificada como fechada.",
        "Desconto pontual, quando aplicado, fica registrado na comanda.",
        "Pagamentos registrados totalizam o valor final da conta."
      ]
    }
  },
  "businessHash": "sha256:3b416594f01c4f89fce9a6030d28fb2c7b97ef5af6f433989f69bc87f1e3f6e3"
} as const satisfies Ns5JourneyArtifact;

export type ConferirEfecharContaJourneyType = typeof conferirEfecharContaJourney;

export default conferirEfecharContaJourney;
