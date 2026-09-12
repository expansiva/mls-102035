/// <mls fileReference="_102047_/l4/inscricaoEvento/journeys/realizarInscricaoPublica.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const realizarInscricaoPublicaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "realizarInscricaoPublica",
  "business": {
    "actorRef": "publico",
    "title": "Realizar inscrição em evento",
    "goal": "Inscrever-se em um evento publicado usando nome e e-mail.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarEventoPublicado",
        "kind": "locate",
        "entity": "Evento",
        "title": "Localizar evento publicado",
        "description": "Acessa a página pública de um evento publicado."
      },
      {
        "stepId": "consultarEvento",
        "kind": "inspect",
        "entity": "Evento",
        "title": "Consultar informações do evento",
        "description": "Consulta os dados e a disponibilidade do evento antes de se inscrever."
      },
      {
        "stepId": "criarInscricao",
        "kind": "act",
        "entity": "Inscricao",
        "affects": [
          "Participante"
        ],
        "effect": "create",
        "title": "Criar inscrição",
        "description": "Informa nome e e-mail para criar ou associar o participante e registrar sua inscrição; quando não houver vaga, a inscrição entra na lista de espera pela ordem de chegada."
      }
    ],
    "outcome": {
      "statement": "A inscrição é registrada como confirmada ou em lista de espera, conforme a disponibilidade.",
      "evidence": [
        "Inscrição vinculada ao evento e ao participante.",
        "Situação da inscrição indica confirmação ou lista de espera.",
        "Não existe mais de uma inscrição do mesmo e-mail para o mesmo evento."
      ]
    }
  },
  "businessHash": "sha256:f7d82574aa448748791f2dee1f03840ef499e60b3570d0ded4b73c99851d1719"
} as const satisfies Ns5JourneyArtifact;

export type RealizarInscricaoPublicaJourneyType = typeof realizarInscricaoPublicaJourney;

export default realizarInscricaoPublicaJourney;
