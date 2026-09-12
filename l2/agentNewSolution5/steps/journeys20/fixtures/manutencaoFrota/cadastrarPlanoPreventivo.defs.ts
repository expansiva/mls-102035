/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/cadastrarPlanoPreventivo.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cadastrarPlanoPreventivoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarPlanoPreventivo",
  "business": {
    "actorRef": "gestorFrota",
    "title": "Cadastrar plano de manutenção preventiva",
    "goal": "Definir quando a manutenção preventiva de um veículo deve ser realizada.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarVeiculo",
        "kind": "locate",
        "entity": "Veiculo",
        "title": "Localizar veículo",
        "description": "Localiza o veículo que receberá o plano preventivo."
      },
      {
        "stepId": "inspecionarDadosVeiculo",
        "kind": "inspect",
        "entity": "Veiculo",
        "title": "Conferir dados do veículo",
        "description": "Confere a identificação e a quilometragem atual do veículo."
      },
      {
        "stepId": "registrarPlanoPreventivo",
        "kind": "act",
        "entity": "PlanoManutencao",
        "effect": "create",
        "title": "Registrar plano preventivo",
        "description": "Define o intervalo da preventiva por quilometragem, por meses ou pelos dois critérios."
      }
    ],
    "outcome": {
      "statement": "O veículo passa a ter um plano de manutenção preventiva acompanhado pela frota.",
      "evidence": [
        "Plano vinculado ao veículo com intervalo em quilômetros e/ou meses.",
        "Próxima preventiva calculada a partir dos critérios registrados."
      ]
    }
  },
  "businessHash": "sha256:417d8c129b6a0c3a8b42c45023031852431d8f0f83d04bfd867a7c6d45ab4a02"
} as const satisfies Ns5JourneyArtifact;

export type CadastrarPlanoPreventivoJourneyType = typeof cadastrarPlanoPreventivoJourney;

export default cadastrarPlanoPreventivoJourney;
