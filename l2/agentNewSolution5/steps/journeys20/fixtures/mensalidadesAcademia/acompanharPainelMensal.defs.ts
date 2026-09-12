/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/acompanharPainelMensal.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const acompanharPainelMensalJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharPainelMensal",
  "business": {
    "actorRef": "gerencia",
    "title": "Acompanhar painel mensal",
    "goal": "Visualizar os indicadores financeiros e a situação dos alunos no período.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarMensalidadesDoPeriodo",
        "kind": "locate",
        "entity": "Mensalidade",
        "title": "Selecionar o período do acompanhamento.",
        "description": "Localiza as mensalidades que compõem os indicadores do mês."
      },
      {
        "stepId": "inspecionarIndicadoresMensais",
        "kind": "inspect",
        "entity": "Mensalidade",
        "title": "Consultar os indicadores mensais.",
        "description": "Visualiza total a receber, total recebido e as quantidades de alunos ativos, bloqueados e inadimplentes."
      }
    ],
    "outcome": {
      "statement": "A gerência acompanha a posição financeira mensal e a situação dos alunos.",
      "evidence": [
        "O painel mostra o total a receber e o total recebido no mês.",
        "O painel mostra as quantidades de alunos ativos, bloqueados e inadimplentes."
      ]
    }
  },
  "businessHash": "sha256:f9b4a2236e888151d79cbf36f579d54667335a98842128b28f2fdcfee51fe1f3"
} as const satisfies Ns5JourneyArtifact;

export type AcompanharPainelMensalJourneyType = typeof acompanharPainelMensalJourney;

export default acompanharPainelMensalJourney;
