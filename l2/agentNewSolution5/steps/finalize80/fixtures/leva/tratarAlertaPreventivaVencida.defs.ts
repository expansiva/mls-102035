/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/tratarAlertaPreventivaVencida.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const tratarAlertaPreventivaVencidaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "tratarAlertaPreventivaVencida",
  "business": {
    "actorRef": "gestorFrota",
    "title": "Tratar alerta de manutenção preventiva vencida",
    "goal": "Avaliar o aviso de quilometragem excedida e abrir a manutenção necessária para o veículo.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "inspecionarAlertaPreventivo",
        "kind": "inspect",
        "entity": "PlanoManutencaoPreventiva",
        "title": "Inspecionar alerta preventivo",
        "description": "Consulta o plano preventivo alertado e a quilometragem atual em relação à quilometragem prevista."
      },
      {
        "stepId": "inspecionarVeiculoAlertado",
        "kind": "inspect",
        "entity": "Veiculo",
        "title": "Inspecionar veículo alertado",
        "description": "Consulta os dados do veículo que ultrapassou a quilometragem prevista para a manutenção preventiva."
      },
      {
        "stepId": "abrirOrdemPorAlerta",
        "kind": "act",
        "entity": "OrdemManutencao",
        "affects": [
          "Veiculo",
          "PlanoManutencaoPreventiva"
        ],
        "title": "Abrir ordem por alerta",
        "description": "Abre uma ordem de manutenção preventiva para o veículo alertado."
      }
    ],
    "outcome": {
      "statement": "O alerta de preventiva vencida é tratado com uma ordem de manutenção aberta para o veículo.",
      "evidence": [
        "Alerta associado a plano cuja quilometragem prevista foi ultrapassada.",
        "Ordem de manutenção preventiva vinculada ao veículo alertado."
      ]
    }
  },
  "businessHash": "sha256:f3c831aaa0fb63caca074e37d9dabf6dd09cd57194f95b53b676bbb9f9363dcf"
} as const satisfies Ns5JourneyArtifact;

export type TratarAlertaPreventivaVencidaJourneyType = typeof tratarAlertaPreventivaVencidaJourney;

export default tratarAlertaPreventivaVencidaJourney;
