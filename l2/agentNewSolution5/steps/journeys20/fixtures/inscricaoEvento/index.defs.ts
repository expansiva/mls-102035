/// <mls fileReference="_102047_/l4/inscricaoEvento/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "inscricaoEvento",
  "journeys": [
    {
      "journeyId": "cadastrarEpublicarEvento",
      "actorRef": "organizador",
      "title": "Cadastrar e publicar evento"
    },
    {
      "journeyId": "realizarInscricaoPublica",
      "actorRef": "publico",
      "title": "Realizar inscrição em evento"
    },
    {
      "journeyId": "cancelarInscricao",
      "actorRef": "publico",
      "title": "Cancelar inscrição"
    },
    {
      "journeyId": "acompanharInscricoesDoEvento",
      "actorRef": "organizador",
      "title": "Acompanhar inscritos e exportar lista"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5JourneyIndexArtifact;

export type InscricaoEventoJourneyIndexType = typeof inscricaoEventoJourneyIndex;

export default inscricaoEventoJourneyIndex;
