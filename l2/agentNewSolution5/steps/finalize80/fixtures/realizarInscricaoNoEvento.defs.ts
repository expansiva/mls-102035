/// <mls fileReference="_102047_/l4/inscricaoEvento/journeys/realizarInscricaoNoEvento.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const realizarInscricaoNoEventoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "realizarInscricaoNoEvento",
  "business": {
    "actorRef": "publico",
    "title": "Inscrever-se em evento publicado",
    "goal": "Registrar uma inscrição em um evento publicado usando nome e e-mail.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarEventoPublicado",
        "kind": "locate",
        "entity": "Evento",
        "title": "Localiza a página pública do evento publicado.",
        "description": "Localiza a página pública do evento publicado."
      },
      {
        "stepId": "consultarEventoPublicado",
        "kind": "inspect",
        "entity": "Evento",
        "title": "Consulta as informações e a disponibilidade do evento.",
        "description": "Consulta as informações e a disponibilidade do evento."
      },
      {
        "stepId": "registrarInscricao",
        "kind": "act",
        "entity": "Inscricao",
        "affects": [
          "Evento"
        ],
        "title": "Registra a inscrição com nome e e-mail.",
        "description": "Registra a inscrição com nome e e-mail; quando não houver vagas, a inscrição entra na lista de espera pela ordem de chegada."
      }
    ],
    "outcome": {
      "statement": "A pessoa fica inscrita no evento ou posicionada na lista de espera.",
      "evidence": [
        "Inscrição vinculada ao evento e ao e-mail informado.",
        "Situação da inscrição indica inscrição confirmada ou lista de espera.",
        "Não há outra inscrição do mesmo e-mail para o mesmo evento."
      ]
    }
  },
  "businessHash": "sha256:6c09cc78216766a3d2b40ff1ca63757b6aac5fc9b4af6d146c3736d172535c52"
} as const satisfies Ns5JourneyArtifact;

export type RealizarInscricaoNoEventoJourneyType = typeof realizarInscricaoNoEventoJourney;

export default realizarInscricaoNoEventoJourney;
