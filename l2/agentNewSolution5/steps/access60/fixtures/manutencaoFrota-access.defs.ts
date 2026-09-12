/// <mls fileReference="_102047_/l4/manutencaoFrota/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "manutencaoFrota",
  "actors": [
    {
      "actorId": "motorista",
      "kind": "internal",
      "origin": "named",
      "title": "Motorista",
      "description": "Motorista da transportadora que registra abastecimentos dos veículos atribuídos a ele."
    },
    {
      "actorId": "gestorFrota",
      "kind": "internal",
      "origin": "named",
      "title": "Gestor de frota",
      "description": "Responsável pela gestão da frota, pelos planos preventivos e pelas ordens de manutenção."
    }
  ],
  "grants": [
    {
      "grantId": "gestaoCompletaFrota",
      "actorRef": "gestorFrota",
      "title": "Gestão completa da frota",
      "description": "Permite ao gestor cadastrar e consultar os cadastros da frota, planos preventivos, abastecimentos e ordens de manutenção de toda a organização.",
      "entityRefs": [
        "Motorista",
        "Oficina",
        "Veiculo",
        "Abastecimento",
        "PlanoManutencao",
        "OrdemManutencao"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os registros de toda a transportadora."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Permite acesso a todos os campos dos registros abrangidos pela gestão da frota."
      }
    },
    {
      "grantId": "veiculosAtribuidosMotorista",
      "actorRef": "motorista",
      "title": "Consulta dos veículos atribuídos",
      "description": "Permite ao motorista consultar os veículos que estão atribuídos a ele para condução e registro de abastecimento.",
      "entityRefs": [
        "Veiculo"
      ],
      "dataScope": {
        "mode": "assigned",
        "description": "Abrange somente veículos cuja atribuição aponta diretamente para o motorista da sessão.",
        "anchorEntity": "Motorista"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Permite consultar integralmente os dados dos veículos atribuídos ao motorista."
      }
    },
    {
      "grantId": "abastecimentosPropriosMotorista",
      "actorRef": "motorista",
      "title": "Registro dos próprios abastecimentos",
      "description": "Permite ao motorista registrar e consultar os abastecimentos realizados por ele nos veículos atribuídos.",
      "entityRefs": [
        "Abastecimento"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Abrange somente abastecimentos vinculados ao motorista da sessão.",
        "anchorEntity": "Motorista"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Permite acesso integral aos registros de abastecimento do próprio motorista."
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type ManutencaoFrotaAccessType = typeof manutencaoFrotaAccess;

export default manutencaoFrotaAccess;
