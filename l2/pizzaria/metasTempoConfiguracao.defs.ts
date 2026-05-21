/// <mls fileReference="_102035_/l2/pizzaria/metasTempoConfiguracao.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "metas-tempo-configuracao",
  "pageName": "metasTempoConfiguracao",
  "actor": "admin",
  "purpose": "Definir metas de tempo por etapa do pedido.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "metasTempoConfiguracaoForm",
          "purpose": "Definir metas de tempo para etapas recebido, pronto e entregue.",
          "rulesApplied": [
            "ruleMetasTempoEtapas",
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
