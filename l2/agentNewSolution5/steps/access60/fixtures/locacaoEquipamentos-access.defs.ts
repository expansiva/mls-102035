/// <mls fileReference="_102047_/l4/locacaoEquipamentos/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "locacaoEquipamentos",
  "actors": [
    {
      "actorId": "atendente",
      "kind": "internal",
      "origin": "named",
      "title": "Atendente",
      "description": "Profissional da locadora que cria contratos de locação e registra devoluções."
    },
    {
      "actorId": "gerente",
      "kind": "internal",
      "origin": "named",
      "title": "Gerente",
      "description": "Responsável por acompanhar a disponibilidade, locações e manutenção dos equipamentos."
    }
  ],
  "grants": [
    {
      "grantId": "atendenteGerenciaLocacoes",
      "actorRef": "atendente",
      "title": "Gerenciar contratos de locação",
      "description": "Permite ao atendente localizar clientes e equipamentos, criar contratos e itens de locação, registrar devoluções e consultar os valores calculados da locação.",
      "entityRefs": [
        "Cliente",
        "Equipamento",
        "ContratoLocacao",
        "RentalItem"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os clientes, equipamentos, contratos e itens de locação da locadora."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Permite consultar todos os campos dos registros necessários para formalizar e encerrar locações."
      }
    },
    {
      "grantId": "atendenteConsultaCadastroProprio",
      "actorRef": "atendente",
      "title": "Consultar cadastro próprio de atendente",
      "description": "Permite ao atendente acessar seu próprio vínculo cadastral na locadora.",
      "entityRefs": [
        "Atendente"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Restringe o acesso ao registro de atendente vinculado à pessoa autenticada.",
        "anchorEntity": "Atendente"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Permite consultar integralmente o próprio registro de atendente."
      }
    },
    {
      "grantId": "gerenteAcompanhaEquipamentos",
      "actorRef": "gerente",
      "title": "Acompanhar situação dos equipamentos",
      "description": "Permite ao gerente localizar e consultar os equipamentos para acompanhar sua disponibilidade, locação ou manutenção.",
      "entityRefs": [
        "Equipamento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange todos os equipamentos cadastrados pela locadora."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Permite consultar todos os dados cadastrais e a situação operacional dos equipamentos."
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type LocacaoEquipamentosAccessType = typeof locacaoEquipamentosAccess;

export default locacaoEquipamentosAccess;
