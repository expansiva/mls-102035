/// <mls fileReference="_102047_/l4/comandaRestaurante5/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestaurante5Access = {
  "schemaVersion": "2026-09-10-ns5-access-v2",
  "moduleName": "comandaRestaurante5",
  "actors": [
    {
      "actorId": "garcom",
      "kind": "internal",
      "origin": "named",
      "title": "Garçom",
      "description": "Abre comandas nas mesas e registra ou cancela itens pedidos."
    },
    {
      "actorId": "caixa",
      "kind": "internal",
      "origin": "named",
      "title": "Caixa",
      "description": "Confere comandas, aplica descontos pontuais e recebe pagamentos para fechar contas."
    }
  ],
  "authorities": [
    {
      "authorityId": "gerenciarComandasEmAtendimento",
      "title": "Gerenciar comandas em atendimento",
      "description": "Permite abrir comandas em mesas, consultar o cardápio e registrar ou cancelar itens lançados nas comandas."
    },
    {
      "authorityId": "fecharContas",
      "title": "Fechar contas",
      "description": "Permite conferir comandas, registrar descontos pontuais, receber pagamentos divididos e encerrar contas quitadas."
    }
  ],
  "grants": [
    {
      "grantId": "garcomGerenciaComandas",
      "actorRef": "garcom",
      "authorityRef": "gerenciarComandasEmAtendimento",
      "entityRefs": [
        "Mesa",
        "ItemCardapio",
        "Comanda",
        "ItemComanda"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Comandas, mesas, itens do cardápio e lançamentos do restaurante necessários ao atendimento das mesas.",
        "anchorEntity": "Comanda"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Acesso completo aos registros necessários para abrir comandas e lançar ou cancelar itens."
      }
    },
    {
      "grantId": "caixaFechaContas",
      "actorRef": "caixa",
      "authorityRef": "fecharContas",
      "entityRefs": [
        "Comanda",
        "ItemComanda",
        "Desconto",
        "Pagamento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Comandas e seus lançamentos, descontos e pagamentos do restaurante necessários à conferência e ao fechamento.",
        "anchorEntity": "Comanda"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Acesso completo aos registros necessários para conferir, descontar, receber pagamentos e encerrar comandas."
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type ComandaRestaurante5AccessType = typeof comandaRestaurante5Access;

export default comandaRestaurante5Access;
