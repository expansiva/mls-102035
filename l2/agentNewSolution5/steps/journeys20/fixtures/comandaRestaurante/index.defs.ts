/// <mls fileReference="_102047_/l4/comandaRestaurante/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "comandaRestaurante",
  "journeys": [
    {
      "journeyId": "abrirComanda",
      "actorRef": "garcom",
      "title": "Abrir comanda para uma mesa"
    },
    {
      "journeyId": "lancarItemNaComanda",
      "actorRef": "garcom",
      "title": "Lançar item na comanda"
    },
    {
      "journeyId": "cancelarItemLancado",
      "actorRef": "garcom",
      "title": "Cancelar item lançado por engano"
    },
    {
      "journeyId": "fecharComanda",
      "actorRef": "caixa",
      "title": "Fechar comanda e liberar mesa"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5JourneyIndexArtifact;

export type ComandaRestauranteJourneyIndexType = typeof comandaRestauranteJourneyIndex;

export default comandaRestauranteJourneyIndex;
