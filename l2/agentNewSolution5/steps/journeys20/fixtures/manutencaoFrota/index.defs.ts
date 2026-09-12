/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "manutencaoFrota",
  "journeys": [
    {
      "journeyId": "cadastrarVeiculo",
      "actorRef": "gestorFrota",
      "title": "Cadastrar veículo na frota"
    },
    {
      "journeyId": "registrarAbastecimento",
      "actorRef": "motorista",
      "title": "Registrar abastecimento do veículo atribuído"
    },
    {
      "journeyId": "cadastrarPlanoPreventivo",
      "actorRef": "gestorFrota",
      "title": "Cadastrar plano de manutenção preventiva"
    },
    {
      "journeyId": "abrirOrdemPorPreventivaVencida",
      "actorRef": "gestorFrota",
      "title": "Abrir ordem para preventiva vencida"
    },
    {
      "journeyId": "abrirOrdemPorDefeito",
      "actorRef": "gestorFrota",
      "title": "Abrir ordem por defeito"
    },
    {
      "journeyId": "registrarConclusaoManutencao",
      "actorRef": "gestorFrota",
      "title": "Registrar conclusão de manutenção"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5JourneyIndexArtifact;

export type ManutencaoFrotaJourneyIndexType = typeof manutencaoFrotaJourneyIndex;

export default manutencaoFrotaJourneyIndex;
