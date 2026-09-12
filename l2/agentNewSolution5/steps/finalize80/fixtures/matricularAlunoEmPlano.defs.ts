/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/matricularAlunoEmPlano.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const matricularAlunoEmPlanoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "matricularAlunoEmPlano",
  "business": {
    "actorRef": "recepcao",
    "title": "Matricular aluno em um plano",
    "goal": "Cadastrar a matrícula de um aluno em um plano a partir de uma data definida.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarOuCadastrarAluno",
        "kind": "locate",
        "entity": "Aluno",
        "title": "Localizar o aluno ou iniciar seu cadastro",
        "description": "A recepção procura o aluno que será matriculado ou inicia o cadastro de um novo aluno."
      },
      {
        "stepId": "consultarPlanosDisponiveis",
        "kind": "locate",
        "entity": "Plano",
        "title": "Consultar planos disponíveis",
        "description": "A recepção localiza o plano mensal, trimestral ou anual escolhido pelo aluno."
      },
      {
        "stepId": "registrarMatricula",
        "kind": "act",
        "entity": "Matricula",
        "affects": [
          "Aluno"
        ],
        "title": "Registrar matrícula",
        "description": "A recepção registra a matrícula do aluno no plano selecionado, informando a data de início."
      }
    ],
    "outcome": {
      "statement": "O aluno fica matriculado em um plano ativo a partir da data informada.",
      "evidence": [
        "Matrícula registrada com aluno, plano e data de início.",
        "Aluno identificado como ativo na matrícula."
      ]
    }
  },
  "businessHash": "sha256:53333281e84323334481d3eb0e3b617a640b582063284d19a8a9b92e92b1cd71"
} as const satisfies Ns5JourneyArtifact;

export type MatricularAlunoEmPlanoJourneyType = typeof matricularAlunoEmPlanoJourney;

export default matricularAlunoEmPlanoJourney;
