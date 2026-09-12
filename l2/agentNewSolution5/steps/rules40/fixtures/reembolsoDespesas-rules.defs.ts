/// <mls fileReference="_102047_/l4/reembolsoDespesas/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifact } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasRules = {
  "schemaVersion": "2026-09-10-ns5-rules-v1",
  "moduleName": "reembolsoDespesas",
  "rules": [
    {
      "ruleId": "resubmissionOnlyWhenRejected",
      "description": "Uma despesa só pode ser reenviada para aprovação quando tiver sido rejeitada."
    },
    {
      "ruleId": "onlyOneResubmission",
      "description": "Uma despesa rejeitada pode ser corrigida e reenviada para aprovação apenas uma vez."
    },
    {
      "ruleId": "rejectionRequiresReason",
      "description": "A rejeição de uma despesa exige o registro de um motivo."
    },
    {
      "ruleId": "paymentOnlyForApprovedExpense",
      "description": "O pagamento só pode ser registrado para uma despesa aprovada."
    }
  ]
} as const satisfies Ns5RulesArtifact;

export type ReembolsoDespesasRulesType = typeof reembolsoDespesasRules;

export default reembolsoDespesasRules;
