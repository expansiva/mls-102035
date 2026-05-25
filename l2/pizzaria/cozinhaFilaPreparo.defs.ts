/// <mls fileReference="_102035_/l2/pizzaria/cozinhaFilaPreparo.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "cozinha-fila-preparo",
  "pageName": "cozinhaFilaPreparo",
  "actor": "staff",
  "purpose": "Fila de produção da cozinha com atualização de status e tempos-alvo.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "cozinhaFilaPreparoListaPedidos",
          "purpose": "Exibir fila de preparo com status e tempos-alvo.",
          "rulesApplied": [
            "rule-order-status",
            "rule-target-time-per-stage",
            "rule-real-time-tracking"
          ]
        },
        {
          "organismName": "cozinhaFilaPreparoAtualizacaoStatus",
          "purpose": "Permitir atualização de status dos pedidos em preparo.",
          "rulesApplied": [
            "rule-order-status",
            "rule-real-time-tracking"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
