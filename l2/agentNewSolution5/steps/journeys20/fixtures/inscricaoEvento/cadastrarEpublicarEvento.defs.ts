/// <mls fileReference="_102047_/l4/inscricaoEvento/journeys/cadastrarEpublicarEvento.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cadastrarEpublicarEventoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarEpublicarEvento",
  "business": {
    "actorRef": "organizador",
    "title": "Cadastrar e publicar evento",
    "goal": "Disponibilizar um evento com suas informações e capacidade para inscrição pública.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "criarEvento",
        "kind": "act",
        "entity": "Evento",
        "effect": "create",
        "title": "Criar evento",
        "description": "Cadastra o título, a descrição, a data, o local e o número de vagas do evento."
      },
      {
        "stepId": "publicarEvento",
        "kind": "act",
        "entity": "Evento",
        "effect": "transition",
        "transitionRef": "publicarEvento",
        "title": "Publicar evento",
        "description": "Publica o evento para disponibilizar sua página de inscrição pública."
      }
    ],
    "outcome": {
      "statement": "O evento fica publicado e disponível para receber inscrições.",
      "evidence": [
        "Evento publicado com título, descrição, data, local e número de vagas.",
        "Página pública de inscrição disponível para o evento."
      ]
    }
  },
  "businessHash": "sha256:49b25d2dac280c5a3077c558a79f2acefaadc6f2829015f864a57d65a4f987b9"
} as const satisfies Ns5JourneyArtifact;

export type CadastrarEpublicarEventoJourneyType = typeof cadastrarEpublicarEventoJourney;

export default cadastrarEpublicarEventoJourney;
