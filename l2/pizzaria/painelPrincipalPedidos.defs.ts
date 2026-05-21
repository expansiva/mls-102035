/// <mls fileReference="_102035_/l2/pizzaria/painelPrincipalPedidos.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "painel-principal-pedidos",
  "pageName": "painelPrincipalPedidos",
  "actor": "staff",
  "purpose": "Acompanhar pedidos com filtro rápido por status e prioridade.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "painelPrincipalPedidosQuickFilters",
          "purpose": "Aplicar filtros rápidos por status e prioridade de pedidos.",
          "rulesApplied": [
            "ruleProcessosPrincipais",
            "rulePedidoStatusPermitidos",
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao"
          ]
        },
        {
          "organismName": "painelPrincipalPedidosList",
          "purpose": "Listar pedidos com status, prioridade e indicadores essenciais.",
          "rulesApplied": [
            "ruleProcessosPrincipais",
            "rulePedidoStatusPermitidos",
            "ruleRegistroPagamentoPedido",
            "ruleComunicacaoObservacaoCritica",
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
