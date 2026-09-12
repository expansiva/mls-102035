/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/matricularAluno.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const matricularAlunoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "matricularAluno",
  "business": {
    "actorRef": "recepcao",
    "title": "Matricular aluno em plano",
    "goal": "Registrar a matrícula de um aluno em um plano a partir de uma data.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarAluno",
        "kind": "locate",
        "entity": "Aluno",
        "title": "Localizar aluno",
        "description": "Localiza o aluno pelo documento ou pelos dados de contato, criando ou vinculando seu cadastro quando necessário."
      },
      {
        "stepId": "consultarPlano",
        "kind": "locate",
        "entity": "Plano",
        "title": "Localizar plano",
        "description": "Localiza o plano mensal, trimestral ou anual escolhido para o aluno."
      },
      {
        "stepId": "inspecionarPlano",
        "kind": "inspect",
        "entity": "Plano",
        "title": "Conferir condições do plano",
        "description": "Confere o valor e o dia de vencimento do plano selecionado."
      },
      {
        "stepId": "registrarMatricula",
        "kind": "act",
        "entity": "Matricula",
        "affects": [
          "Aluno"
        ],
        "title": "Registrar matrícula",
        "description": "Registra a matrícula do aluno no plano escolhido com a data de início informada."
      }
    ],
    "outcome": {
      "statement": "O aluno fica matriculado em um plano ativo a partir da data definida.",
      "evidence": [
        "Matrícula registrada com aluno, plano e data de início.",
        "Plano, valor e dia de vencimento associados à matrícula."
      ]
    }
  },
  "businessHash": "sha256:36fdee31e6f23bfad309d5675974b21d3b4d9744957798f91772451359b41887"
} as const satisfies Ns5JourneyArtifact;

export type MatricularAlunoJourneyType = typeof matricularAlunoJourney;

export default matricularAlunoJourney;
