/// <mls fileReference="_102047_/l4/comandaRestaurante/journeys/fecharComanda.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const fecharComandaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "fecharComanda",
  "business": {
    "actorRef": "caixa",
    "title": "Fechar comanda e liberar mesa",
    "goal": "Receber o pagamento, encerrar a comanda e liberar a mesa.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarComandaParaFechamento",
        "kind": "locate",
        "entity": "Comanda",
        "title": "x",
        "description": "Localiza a comanda aberta apresentada para pagamento."
      },
      {
        "stepId": "inspecionarTotalDaComanda",
        "kind": "inspect",
        "entity": "Comanda",
        "title": "x",
        "description": "Consulta os itens lançados e o total da comanda."
      },
      {
        "stepId": "registrarDescontoEpagamento",
        "kind": "act",
        "entity": "Comanda",
        "effect": "update",
        "title": "x",
        "description": "Registra o desconto opcional e a forma de pagamento."
      },
      {
        "stepId": "encerrarComanda",
        "kind": "act",
        "entity": "Comanda",
        "affects": [
          "Mesa"
        ],
        "effect": "transition",
        "transitionRef": "fecharComanda",
        "title": "x",
        "description": "Fecha a comanda paga e libera a mesa."
      }
    ],
    "outcome": {
      "statement": "A comanda é encerrada com o pagamento registrado e a mesa fica livre.",
      "evidence": [
        "Comanda registrada como fechada com total, desconto aplicado quando houver e forma de pagamento.",
        "Mesa vinculada à comanda está disponível."
      ]
    }
  },
  "businessHash": "sha256:c39255d59a716428cb8b0bdff5d68050fef135a669288bd57b00b76707aa4895"
} as const satisfies Ns5JourneyArtifact;

export type FecharComandaJourneyType = typeof fecharComandaJourney;

export default fecharComandaJourney;
