/// <mls fileReference="_102047_/l4/reembolsoDespesas/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "reembolsoDespesas",
  "inbound": [],
  "outbound": [
    {
      "id": "despesaEnviadaParaAprovacao",
      "kind": "event",
      "to": "any",
      "event": "despesaEnviadaParaAprovacao",
      "on": "Despesa.submitForApproval",
      "description": "Publica que uma despesa foi enviada para aprovação.",
      "entityRefs": [
        "Despesa"
      ]
    },
    {
      "id": "despesaReenviadaParaAprovacao",
      "kind": "event",
      "to": "any",
      "event": "despesaReenviadaParaAprovacao",
      "on": "Despesa.resubmitForApproval",
      "description": "Publica que uma despesa corrigida foi reenviada para aprovação.",
      "entityRefs": [
        "Despesa"
      ]
    },
    {
      "id": "decisaoDeAprovacaoRegistrada",
      "kind": "event",
      "to": "any",
      "event": "decisaoDeAprovacaoRegistrada",
      "on": "Despesa.recordApprovalDecision",
      "description": "Publica que a decisão de aprovação ou rejeição da despesa foi registrada.",
      "entityRefs": [
        "Despesa"
      ]
    },
    {
      "id": "pagamentoDeDespesaRegistrado",
      "kind": "event",
      "to": "any",
      "event": "pagamentoDeDespesaRegistrado",
      "on": "Despesa.registerPayment",
      "description": "Publica que o pagamento de uma despesa aprovada foi registrado.",
      "entityRefs": [
        "Despesa"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5IntegrationArtifact;

export type ReembolsoDespesasIntegrationType = typeof reembolsoDespesasIntegration;

export default reembolsoDespesasIntegration;
