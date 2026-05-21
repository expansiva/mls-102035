/// <mls fileReference="_102035_/l2/pizzaria/metasTempoMonitoramento.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "metas-tempo-monitoramento",
  "pageName": "metasTempoMonitoramento",
  "actor": "staff",
  "purpose": "Monitorar desvios de tempo em relação às metas.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "metasTempoMonitoramentoSummary",
          "purpose": "Exibir indicadores de cumprimento de metas de tempo.",
          "rulesApplied": [
            "ruleMetasTempoEtapas",
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao",
            "ruleModuloInterno"
          ]
        },
        {
          "organismName": "metasTempoMonitoramentoDeviations",
          "purpose": "Listar pedidos com desvios em relação às metas.",
          "rulesApplied": [
            "ruleMetasTempoEtapas",
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao",
            "ruleModuloInterno"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
