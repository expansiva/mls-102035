/// <mls fileReference="_102047_/l4/locacaoEquipamentos/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifact } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosRules = {
  "schemaVersion": "2026-09-10-ns5-rules-v1",
  "moduleName": "locacaoEquipamentos",
  "rules": [
    {
      "ruleId": "equipmentRentalPeriodsMustNotOverlap",
      "description": "Um mesmo equipamento não pode constar em contratos de locação com períodos sobrepostos."
    },
    {
      "ruleId": "lateFeeCalculation",
      "description": "Quando a devolução ocorrer após a data prevista, a multa deve ser calculada como o valor da diária multiplicado pelos dias de atraso e por 1,5."
    }
  ]
} as const satisfies Ns5RulesArtifact;

export type LocacaoEquipamentosRulesType = typeof locacaoEquipamentosRules;

export default locacaoEquipamentosRules;
