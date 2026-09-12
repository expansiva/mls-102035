/// <mls fileReference="_102047_/l4/inscricaoEvento/journeys/acompanharEexportarInscricoes.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const acompanharEexportarInscricoesJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharEexportarInscricoes",
  "business": {
    "actorRef": "organizador",
    "title": "Acompanhar e exportar inscrições",
    "goal": "Consultar os inscritos e as vagas ocupadas de um evento e baixar a lista em CSV.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarEvento",
        "kind": "locate",
        "entity": "Evento",
        "title": "Localiza o evento a acompanhar.",
        "description": "Localiza o evento a acompanhar."
      },
      {
        "stepId": "consultarEvento",
        "kind": "inspect",
        "entity": "Evento",
        "title": "Consulta o total de vagas ocupadas do evento.",
        "description": "Consulta o total de vagas ocupadas do evento."
      },
      {
        "stepId": "localizarInscricoes",
        "kind": "locate",
        "entity": "Inscricao",
        "title": "Localiza as inscrições do evento.",
        "description": "Localiza as inscrições do evento."
      },
      {
        "stepId": "consultarInscricoes",
        "kind": "inspect",
        "entity": "Inscricao",
        "title": "Consulta os inscritos e suas situações.",
        "description": "Consulta os inscritos e suas situações."
      },
      {
        "stepId": "baixarListaCsv",
        "kind": "act",
        "entity": "Evento",
        "title": "Baixa a lista de inscrições em CSV.",
        "description": "Baixa a lista de inscrições do evento em formato CSV."
      }
    ],
    "outcome": {
      "statement": "O organizador consulta os inscritos e as vagas ocupadas e obtém a lista de inscrições em CSV.",
      "evidence": [
        "Total de vagas ocupadas exibido para o evento.",
        "Lista de inscrições e respectivas situações consultada.",
        "Arquivo CSV da lista de inscrições disponibilizado."
      ]
    }
  },
  "businessHash": "sha256:9de9b6e68351130801df0fd393b16a71f2c54c8574193ddaa3683414e90ce87e"
} as const satisfies Ns5JourneyArtifact;

export type AcompanharEexportarInscricoesJourneyType = typeof acompanharEexportarInscricoesJourney;

export default acompanharEexportarInscricoesJourney;
