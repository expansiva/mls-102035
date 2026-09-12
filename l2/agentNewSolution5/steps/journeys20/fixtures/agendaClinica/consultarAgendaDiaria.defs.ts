/// <mls fileReference="_102047_/l4/agendaClinica/journeys/consultarAgendaDiaria.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const consultarAgendaDiariaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarAgendaDiaria",
  "business": {
    "actorRef": "profissional",
    "title": "Consultar agenda diária",
    "goal": "Visualizar as próprias consultas previstas para o dia.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarConsultasDoDia",
        "kind": "locate",
        "entity": "Consulta",
        "title": "x",
        "description": "Localiza as consultas do próprio profissional para o dia."
      },
      {
        "stepId": "inspecionarAgendaDoDia",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "x",
        "description": "Consulta horários e dados dos pacientes da agenda diária."
      }
    ],
    "outcome": {
      "statement": "O profissional visualiza sua agenda diária.",
      "evidence": [
        "Lista de consultas do dia do profissional é apresentada com horários e pacientes."
      ]
    }
  },
  "businessHash": "sha256:e508a925562d83d7e68262e702cfd6943b2ea74dd135a4c892547a926a8cf68e"
} as const satisfies Ns5JourneyArtifact;

export type ConsultarAgendaDiariaJourneyType = typeof consultarAgendaDiariaJourney;

export default consultarAgendaDiariaJourney;
