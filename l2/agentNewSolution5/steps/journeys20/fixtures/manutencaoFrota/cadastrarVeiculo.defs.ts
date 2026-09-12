/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/cadastrarVeiculo.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cadastrarVeiculoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarVeiculo",
  "business": {
    "actorRef": "gestorFrota",
    "title": "Cadastrar veículo na frota",
    "goal": "Disponibilizar um veículo identificado para atribuição e gestão de manutenção.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "registrarVeiculo",
        "kind": "act",
        "entity": "Veiculo",
        "effect": "create",
        "title": "Registrar os dados do veículo",
        "description": "Informa placa, modelo, ano e quilometragem atual do veículo."
      }
    ],
    "outcome": {
      "statement": "O veículo fica cadastrado para uso na gestão da frota.",
      "evidence": [
        "Veículo identificado pela placa e com modelo, ano e quilometragem atual registrados."
      ]
    }
  },
  "businessHash": "sha256:27547deac1d2b1613364af5297f759260647b9148c526940c525dc7c64bbfe90"
} as const satisfies Ns5JourneyArtifact;

export type CadastrarVeiculoJourneyType = typeof cadastrarVeiculoJourney;

export default cadastrarVeiculoJourney;
