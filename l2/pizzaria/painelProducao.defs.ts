/// <mls fileReference="_102035_/l2/pizzaria/painelProducao.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "painel-producao",
  "pageName": "painelProducao",
  "actor": "staff",
  "purpose": "Gerenciar pedidos em produção e designar cozinheiro responsável.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "painelProducaoQueue",
          "purpose": "Listar pedidos em produção por status permitido.",
          "rulesApplied": [
            "ruleProcessosPrincipais",
            "rulePedidoStatusPermitidos",
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao"
          ]
        },
        {
          "organismName": "painelProducaoAssignment",
          "purpose": "Designar cozinheiro responsável antes de avançar status.",
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
