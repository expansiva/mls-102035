/// <mls fileReference="_102047_/l4/inscricaoEvento/journeys/acompanharInscricoesDoEvento.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const acompanharInscricoesDoEventoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharInscricoesDoEvento",
  "business": {
    "actorRef": "organizador",
    "title": "Acompanhar inscritos e exportar lista",
    "goal": "Consultar os inscritos, as vagas ocupadas e baixar a lista do evento em CSV.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarEvento",
        "kind": "locate",
        "entity": "Evento",
        "title": "Localizar evento",
        "description": "Localiza o evento que deseja acompanhar."
      },
      {
        "stepId": "consultarOcupacaoDoEvento",
        "kind": "inspect",
        "entity": "Evento",
        "title": "Consultar ocupação do evento",
        "description": "Consulta o total de vagas ocupadas e a capacidade do evento."
      },
      {
        "stepId": "consultarEexportarInscricoes",
        "kind": "inspect",
        "entity": "Inscricao",
        "title": "Consultar e exportar inscritos",
        "description": "Consulta os inscritos e baixa a lista de inscrições do evento em formato CSV."
      }
    ],
    "outcome": {
      "statement": "O organizador acompanha a ocupação do evento e obtém a lista de inscritos em CSV.",
      "evidence": [
        "Total de vagas ocupadas exibido para o evento.",
        "Lista de inscrições do evento disponível para consulta.",
        "Arquivo CSV da lista de inscritos baixado."
      ]
    }
  },
  "businessHash": "sha256:e54d7941eb27865a914d66efe155beb843076aa35ccbf40cc7eb34a926fbf3e5"
} as const satisfies Ns5JourneyArtifact;

export type AcompanharInscricoesDoEventoJourneyType = typeof acompanharInscricoesDoEventoJourney;

export default acompanharInscricoesDoEventoJourney;
