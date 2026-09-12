/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/abrirOrdemPorDefeito.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const abrirOrdemPorDefeitoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "abrirOrdemPorDefeito",
  "business": {
    "actorRef": "gestorFrota",
    "title": "Abrir ordem por defeito",
    "goal": "Registrar o encaminhamento de um veículo com defeito para manutenção.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarVeiculoComDefeito",
        "kind": "locate",
        "entity": "Veiculo",
        "title": "Localizar veículo com defeito",
        "description": "Localiza o veículo que apresentou defeito."
      },
      {
        "stepId": "inspecionarVeiculoComDefeito",
        "kind": "inspect",
        "entity": "Veiculo",
        "title": "Conferir veículo",
        "description": "Confere a identificação e a quilometragem do veículo antes da abertura da ordem."
      },
      {
        "stepId": "abrirOrdemCorretiva",
        "kind": "act",
        "entity": "OrdemManutencao",
        "effect": "create",
        "title": "Abrir ordem de manutenção corretiva",
        "description": "Registra a oficina, a descrição do defeito ou serviço e a data de entrada."
      }
    ],
    "outcome": {
      "statement": "Uma ordem de manutenção é aberta para tratar o defeito informado.",
      "evidence": [
        "Ordem vinculada ao veículo com oficina, descrição e data de entrada.",
        "Registro da manutenção identificado como decorrente de defeito."
      ]
    }
  },
  "businessHash": "sha256:e93874ab548268f7476f982a0d0d16fd575cd0630807d586d4ae860e07b1e08a"
} as const satisfies Ns5JourneyArtifact;

export type AbrirOrdemPorDefeitoJourneyType = typeof abrirOrdemPorDefeitoJourney;

export default abrirOrdemPorDefeitoJourney;
