/// <mls fileReference="_102047_/l4/manutencaoFrota/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaRules = {
  "schemaVersion": "2026-09-10-ns5-rules-v1",
  "moduleName": "manutencaoFrota",
  "rules": [
    {
      "ruleId": "atualizarQuilometragemPorAbastecimento",
      "description": "Ao registrar um abastecimento, a quilometragem atual do veículo deve ser atualizada para a quilometragem informada no painel."
    },
    {
      "ruleId": "exigirCriterioPreventivo",
      "description": "Todo plano de manutenção preventiva deve definir um intervalo por quilometragem, por meses ou por ambos."
    },
    {
      "ruleId": "calcularProximaQuilometragemPreventiva",
      "description": "Quando o plano definir intervalo por quilometragem, a próxima quilometragem prevista deve ser a quilometragem de referência acrescida desse intervalo."
    },
    {
      "ruleId": "calcularProximaDataPreventiva",
      "description": "Quando o plano definir intervalo por meses, a próxima data prevista deve ser a data de referência acrescida desse intervalo."
    },
    {
      "ruleId": "identificarPreventivaVencidaPorQuilometragem",
      "description": "A manutenção preventiva deve ser considerada vencida quando a quilometragem atual do veículo ultrapassar a próxima quilometragem prevista do plano."
    },
    {
      "ruleId": "avisarPreventivaVencidaPorQuilometragem",
      "description": "O sistema deve avisar quando a manutenção preventiva de um veículo for considerada vencida por quilometragem."
    }
  ]
} as const satisfies Ns5RulesArtifact;

export type ManutencaoFrotaRulesType = typeof manutencaoFrotaRules;

export default manutencaoFrotaRules;
