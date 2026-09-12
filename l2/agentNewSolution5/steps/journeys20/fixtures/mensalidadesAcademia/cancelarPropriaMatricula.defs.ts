/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/cancelarPropriaMatricula.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cancelarPropriaMatriculaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cancelarPropriaMatricula",
  "business": {
    "actorRef": "aluno",
    "title": "Cancelar própria matrícula",
    "goal": "Encerrar a própria matrícula para impedir a geração de mensalidades futuras.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarPropriaMatricula",
        "kind": "locate",
        "entity": "Matricula",
        "title": "Localizar a própria matrícula ativa.",
        "description": "Acessa a matrícula vinculada ao aluno autenticado."
      },
      {
        "stepId": "inspecionarPropriaMatricula",
        "kind": "inspect",
        "entity": "Matricula",
        "title": "Conferir os dados da matrícula.",
        "description": "Visualiza o plano e a vigência da própria matrícula."
      },
      {
        "stepId": "cancelarMatricula",
        "kind": "act",
        "entity": "Matricula",
        "effect": "transition",
        "transitionRef": "cancelarMatricula",
        "title": "Cancelar a matrícula.",
        "description": "Encerra a matrícula ativa do aluno."
      }
    ],
    "outcome": {
      "statement": "A matrícula do aluno é encerrada e não participa de gerações futuras de mensalidades.",
      "evidence": [
        "A matrícula apresenta situação de cancelada ou encerrada.",
        "O aluno deixa de receber novas mensalidades após o encerramento."
      ]
    }
  },
  "businessHash": "sha256:c2750452f82a0d0269be9bc25aa83595560eea4f394a14c1b965bc9cc5001ed9"
} as const satisfies Ns5JourneyArtifact;

export type CancelarPropriaMatriculaJourneyType = typeof cancelarPropriaMatriculaJourney;

export default cancelarPropriaMatriculaJourney;
