/// <mls fileReference="_102035_/l2/pizzaria/painelEntregas.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "painel-entregas",
  "pageName": "painelEntregas",
  "actor": "staff",
  "purpose": "Atribuir entregador e acompanhar status de entrega.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "painelEntregasQueue",
          "purpose": "Listar pedidos prontos para entrega com status permitido.",
          "rulesApplied": [
            "ruleProcessosPrincipais",
            "rulePedidoStatusPermitidos",
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao"
          ]
        },
        {
          "organismName": "painelEntregasAssignment",
          "purpose": "Atribuir entregador e permitir avanço de status com responsável.",
          "rulesApplied": [
            "ruleResponsavelObrigatorioParaAvancarStatus",
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
