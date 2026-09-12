/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/abrirOrdemPorPreventivaVencida.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const abrirOrdemPorPreventivaVencidaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "abrirOrdemPorPreventivaVencida",
  "business": {
    "actorRef": "gestorFrota",
    "title": "Abrir ordem para preventiva vencida",
    "goal": "Encaminhar um veículo para manutenção ao receber o aviso de preventiva vencida.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "inspecionarPlanoAvisado",
        "kind": "inspect",
        "entity": "PlanoManutencao",
        "title": "Consultar plano avisado",
        "description": "Verifica o plano cuja quilometragem prevista para a preventiva foi ultrapassada."
      },
      {
        "stepId": "inspecionarVeiculo",
        "kind": "inspect",
        "entity": "Veiculo",
        "title": "Consultar veículo",
        "description": "Confere o veículo e sua quilometragem atual antes de encaminhá-lo à manutenção."
      },
      {
        "stepId": "abrirOrdemPreventiva",
        "kind": "act",
        "entity": "OrdemManutencao",
        "effect": "create",
        "title": "Abrir ordem de manutenção preventiva",
        "description": "Registra a oficina, a descrição do serviço e a data de entrada do veículo."
      }
    ],
    "outcome": {
      "statement": "Uma ordem de manutenção preventiva é aberta para o veículo avisado.",
      "evidence": [
        "Ordem vinculada ao veículo e ao plano preventivo vencido.",
        "Ordem com oficina, descrição e data de entrada registradas."
      ]
    }
  },
  "businessHash": "sha256:123797b5034fd54ac2eead98bf75c1e1f2207abe1c71502c6c81c3073c579124"
} as const satisfies Ns5JourneyArtifact;

export type AbrirOrdemPorPreventivaVencidaJourneyType = typeof abrirOrdemPorPreventivaVencidaJourney;

export default abrirOrdemPorPreventivaVencidaJourney;
