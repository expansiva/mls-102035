/// <mls fileReference="_102035_/l2/pizzaria/entregadorMinhasEntregas.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "entregador-minhas-entregas",
  "pageName": "entregadorMinhasEntregas",
  "actor": "staff",
  "purpose": "Lista de entregas atribuídas ao entregador com atualização de status.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "entregadorMinhasEntregasLista",
          "purpose": "Exibir entregas atribuídas com status em tempo real.",
          "rulesApplied": [
            "rule-order-status",
            "rule-real-time-tracking"
          ]
        },
        {
          "organismName": "entregadorMinhasEntregasAtualizacaoStatus",
          "purpose": "Permitir atualização de status das entregas.",
          "rulesApplied": [
            "rule-order-status",
            "rule-real-time-tracking"
          ]
        },
        {
          "organismName": "entregadorMinhasEntregasWhatsApp",
          "purpose": "Apoiar comunicação do pedido via WhatsApp quando necessário.",
          "rulesApplied": [
            "rule-whatsapp-integration"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
