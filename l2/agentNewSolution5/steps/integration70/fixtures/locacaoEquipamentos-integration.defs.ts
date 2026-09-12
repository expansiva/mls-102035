/// <mls fileReference="_102047_/l4/locacaoEquipamentos/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "locacaoEquipamentos",
  "inbound": [],
  "outbound": [
    {
      "id": "registrarDevolucao",
      "kind": "event",
      "to": "any",
      "event": "registrarDevolucao",
      "on": "ContratoLocacao.registrarDevolucao",
      "description": "Publica o registro de devolução do contrato, incluindo os itens locados, para módulos que precisem atualizar informações relacionadas aos equipamentos.",
      "entityRefs": [
        "ContratoLocacao",
        "RentalItem"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5IntegrationArtifact;

export type LocacaoEquipamentosIntegrationType = typeof locacaoEquipamentosIntegration;

export default locacaoEquipamentosIntegration;
