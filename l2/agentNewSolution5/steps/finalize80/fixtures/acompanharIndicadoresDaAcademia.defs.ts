/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/acompanharIndicadoresDaAcademia.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const acompanharIndicadoresDaAcademiaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharIndicadoresDaAcademia",
  "business": {
    "actorRef": "gerencia",
    "title": "Acompanhar indicadores financeiros e de alunos",
    "goal": "Consultar os totais financeiros do mês e a situação dos alunos da academia.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "inspecionarPainelGerencial",
        "kind": "inspect",
        "entity": "PainelGerencial",
        "title": "Inspecionar painel gerencial",
        "description": "Consulta o total a receber no mês, o total recebido e as quantidades de alunos ativos, bloqueados e inadimplentes."
      }
    ],
    "outcome": {
      "statement": "A gerência visualiza os indicadores financeiros e a situação atual dos alunos.",
      "evidence": [
        "Painel apresenta total a receber no mês.",
        "Painel apresenta total recebido e as quantidades de alunos ativos, bloqueados e inadimplentes."
      ]
    }
  },
  "businessHash": "sha256:0466b8c50a161dd743dc0813e156f5a87da1253889b1e75c9387b2a272d9c651"
} as const satisfies Ns5JourneyArtifact;

export type AcompanharIndicadoresDaAcademiaJourneyType = typeof acompanharIndicadoresDaAcademiaJourney;

export default acompanharIndicadoresDaAcademiaJourney;
