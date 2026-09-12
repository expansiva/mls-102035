/// <mls fileReference="_102047_/l4/manutencaoFrota/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "manutencaoFrota",
  "inbound": [],
  "outbound": [
    {
      "id": "preventivaVencida",
      "kind": "event",
      "to": "any",
      "event": "preventivaVencida",
      "on": "Abastecimento.create",
      "description": "Publica um aviso para módulos interessados quando o registro de abastecimento indicar que um veículo ultrapassou a quilometragem prevista para a manutenção preventiva.",
      "entityRefs": [
        "Abastecimento",
        "Veiculo",
        "PlanoManutencao"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5IntegrationArtifact;

export type ManutencaoFrotaIntegrationType = typeof manutencaoFrotaIntegration;

export default manutencaoFrotaIntegration;
