/// <mls fileReference="_102047_/l4/locacaoEquipamentos/journeys/acompanharSituacaoEquipamentos.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const acompanharSituacaoEquipamentosJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharSituacaoEquipamentos",
  "business": {
    "actorRef": "gerente",
    "title": "Acompanhar situação dos equipamentos",
    "goal": "Visualizar quais equipamentos estão disponíveis, locados ou em manutenção.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarEquipamentos",
        "kind": "locate",
        "entity": "Equipamento",
        "title": "x",
        "description": "Localiza os equipamentos da locadora."
      },
      {
        "stepId": "inspecionarSituacoes",
        "kind": "inspect",
        "entity": "Equipamento",
        "title": "x",
        "description": "Consulta a situação de cada equipamento, identificando os disponíveis, locados e em manutenção."
      }
    ],
    "outcome": {
      "statement": "O gerente obtém a visão da disponibilidade e da situação operacional dos equipamentos.",
      "evidence": [
        "Lista de equipamentos com suas situações de disponível, locado ou em manutenção."
      ]
    }
  },
  "businessHash": "sha256:f20dae9a0affca28e1ce7fa922ab9aac67ff30b21c977be9cf2379fe6717fb0a"
} as const satisfies Ns5JourneyArtifact;

export type AcompanharSituacaoEquipamentosJourneyType = typeof acompanharSituacaoEquipamentosJourney;

export default acompanharSituacaoEquipamentosJourney;
