/// <mls fileReference="_102035_/l2/pizzaria/displayCozinha.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "display-cozinha",
  "pageName": "displayCozinha",
  "actor": "staff",
  "purpose": "Exibir pedidos em preparo e prontos para a cozinha.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "displayCozinhaOrdersBoard",
          "purpose": "Exibir pedidos em preparo e prontos em formato de painel de cozinha.",
          "rulesApplied": [
            "ruleDisplayCozinha",
            "rulePedidoStatusPermitidos",
            "ruleIdiomaPt"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
