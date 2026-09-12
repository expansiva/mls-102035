/// <mls fileReference="_102047_/l4/comandaRestaurante5/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestaurante5JourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "comandaRestaurante5",
  "journeys": [
    {
      "journeyId": "abrirComandaNaMesa",
      "actorRef": "garcom",
      "title": "Abrir comanda em uma mesa"
    },
    {
      "journeyId": "lancarItemNaComanda",
      "actorRef": "garcom",
      "title": "Lançar item pedido na comanda"
    },
    {
      "journeyId": "cancelarItemLancadoPorEngano",
      "actorRef": "garcom",
      "title": "Cancelar item lançado por engano"
    },
    {
      "journeyId": "conferirEfecharConta",
      "actorRef": "caixa",
      "title": "Conferir e fechar conta"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5JourneyIndexArtifact;

export type ComandaRestaurante5JourneyIndexType = typeof comandaRestaurante5JourneyIndex;

export default comandaRestaurante5JourneyIndex;
