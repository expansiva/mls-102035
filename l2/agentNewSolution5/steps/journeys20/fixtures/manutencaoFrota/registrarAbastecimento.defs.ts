/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/registrarAbastecimento.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarAbastecimentoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarAbastecimento",
  "business": {
    "actorRef": "motorista",
    "title": "Registrar abastecimento do veículo atribuído",
    "goal": "Registrar o consumo e atualizar a quilometragem do veículo que dirige.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarVeiculoAtribuido",
        "kind": "locate",
        "entity": "Veiculo",
        "title": "Localizar veículo atribuído",
        "description": "Localiza um dos veículos atribuídos ao motorista."
      },
      {
        "stepId": "inspecionarQuilometragem",
        "kind": "inspect",
        "entity": "Veiculo",
        "title": "Conferir veículo e quilometragem",
        "description": "Confere a identificação do veículo e a quilometragem atualmente registrada."
      },
      {
        "stepId": "registrarAbastecimento",
        "kind": "act",
        "entity": "Abastecimento",
        "affects": [
          "Veiculo"
        ],
        "effect": "create",
        "title": "Registrar abastecimento",
        "description": "Informa data, litros, valor e quilometragem exibida no painel."
      }
    ],
    "outcome": {
      "statement": "O abastecimento é registrado no veículo atribuído e sua quilometragem é atualizada.",
      "evidence": [
        "Registro de abastecimento com data, litros, valor e km no painel.",
        "Quilometragem atual do veículo compatível com o km informado no abastecimento."
      ]
    }
  },
  "businessHash": "sha256:50a0c44f47c60636fe0700cd669154b6b1fc02de0109a7da7a9ba4be7a19ff8d"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarAbastecimentoJourneyType = typeof registrarAbastecimentoJourney;

export default registrarAbastecimentoJourney;
