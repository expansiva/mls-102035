/// <mls fileReference="_102035_/l2/pizzaria/confirmacaoImpressaoComanda.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "confirmacao-impressao-comanda",
  "pageName": "confirmacaoImpressaoComanda",
  "actor": "staff",
  "purpose": "Confirmar e executar impressão de comanda.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "confirmacaoImpressaoComandaSummary",
          "purpose": "Apresentar resumo do pedido para confirmação da impressão.",
          "rulesApplied": [
            "ruleImpressaoComanda",
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao"
          ]
        },
        {
          "organismName": "confirmacaoImpressaoComandaAction",
          "purpose": "Confirmar e acionar a impressão da comanda.",
          "rulesApplied": [
            "ruleImpressaoComanda",
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
