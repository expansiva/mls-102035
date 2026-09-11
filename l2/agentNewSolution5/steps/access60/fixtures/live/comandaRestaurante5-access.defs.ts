/// <mls fileReference="_102047_/l4/comandaRestaurante5/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestaurante5Access = {
  "schemaVersion": "2026-09-10-ns5-access-v1",
  "moduleName": "comandaRestaurante5",
  "profiles": [
    {
      "profileId": "garcom",
      "actorRefs": [
        "garcom"
      ],
      "kind": "internal"
    },
    {
      "profileId": "caixa",
      "actorRefs": [
        "caixa"
      ],
      "kind": "internal"
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
      "profileRef": "garcom",
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
      "profileRef": "caixa",
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
