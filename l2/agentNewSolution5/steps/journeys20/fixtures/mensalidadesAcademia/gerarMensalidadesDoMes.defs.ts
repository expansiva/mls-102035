/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/gerarMensalidadesDoMes.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const gerarMensalidadesDoMesJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "gerarMensalidadesDoMes",
  "business": {
    "actorRef": "gerencia",
    "title": "Gerar mensalidades do mês",
    "goal": "Criar uma mensalidade mensal para cada aluno com matrícula ativa.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "gerarCobrancasMensais",
        "kind": "act",
        "entity": "Mensalidade",
        "effect": "create",
        "title": "Gerar as mensalidades do mês.",
        "description": "Cria uma mensalidade por aluno ativo, com o valor do plano e o vencimento correspondente."
      }
    ],
    "outcome": {
      "statement": "As mensalidades do período foram geradas para os alunos ativos.",
      "evidence": [
        "Cada aluno com matrícula ativa possui uma mensalidade do mês.",
        "Cada mensalidade gerada mostra o valor do plano e a data de vencimento."
      ]
    }
  },
  "businessHash": "sha256:8284a84a8f19c17f0fd7342c15b4412cb475bf42b93b39c7e58160c1067651db"
} as const satisfies Ns5JourneyArtifact;

export type GerarMensalidadesDoMesJourneyType = typeof gerarMensalidadesDoMesJourney;

export default gerarMensalidadesDoMesJourney;
