/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/matricularAluno.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const matricularAlunoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "matricularAluno",
  "business": {
    "actorRef": "recepcao",
    "title": "Matricular aluno em um plano",
    "goal": "Registrar a matrícula de um aluno em um plano a partir da data informada.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "informarAlunoPlanoEdata",
        "kind": "act",
        "entity": "Matricula",
        "affects": [
          "Aluno"
        ],
        "effect": "create",
        "title": "Informar o aluno, o plano e a data inicial.",
        "description": "Cria a matrícula no plano escolhido e cria ou vincula o cadastro do aluno quando necessário."
      }
    ],
    "outcome": {
      "statement": "O aluno fica com uma matrícula ativa no plano escolhido a partir da data registrada.",
      "evidence": [
        "A matrícula apresenta o aluno, o plano e a data inicial.",
        "O aluno passa a constar como ativo para a geração de mensalidades."
      ]
    }
  },
  "businessHash": "sha256:7069f1c2e4e085793f7e16a3161e961f44b513f0ce89198b6b933387a17f36f1"
} as const satisfies Ns5JourneyArtifact;

export type MatricularAlunoJourneyType = typeof matricularAlunoJourney;

export default matricularAlunoJourney;
