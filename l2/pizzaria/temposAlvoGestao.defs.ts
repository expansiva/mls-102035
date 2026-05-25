/// <mls fileReference="_102035_/l2/pizzaria/temposAlvoGestao.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "tempos-alvo-gestao",
  "pageName": "temposAlvoGestao",
  "actor": "admin",
  "purpose": "Configurar tempos-alvo por etapa.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "temposAlvoGestaoConfiguracao",
          "purpose": "Definir tempos-alvo por etapa do pedido.",
          "rulesApplied": [
            "rule-target-time-per-stage"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
