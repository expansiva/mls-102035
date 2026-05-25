/// <mls fileReference="_102035_/l2/pizzaria/zonasEntregaGestao.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "zonas-entrega-gestao",
  "pageName": "zonasEntregaGestao",
  "actor": "admin",
  "purpose": "Configurar zonas e taxas de entrega.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "zonasEntregaGestaoListaZonas",
          "purpose": "Exibir zonas de entrega com taxas e prazos.",
          "rulesApplied": [
            "rule-delivery-zones-fees"
          ]
        },
        {
          "organismName": "zonasEntregaGestaoEdicaoZona",
          "purpose": "Criar e atualizar zonas de entrega.",
          "rulesApplied": [
            "rule-delivery-zones-fees"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
