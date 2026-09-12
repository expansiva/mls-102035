/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaOntologyIndex = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "manutencaoFrota",
  "businessDomain": "Gestão de abastecimentos, manutenção preventiva e ordens de manutenção da frota de uma transportadora.",
  "entities": [
    "Abastecimento",
    "Motorista",
    "Oficina",
    "Veiculo",
    "PlanoManutencao",
    "OrdemManutencao"
  ],
  "relationships": [
    {
      "relationshipId": "veiculoMotoristaAtribuido",
      "fromEntity": "Veiculo",
      "toEntity": "Motorista",
      "type": "manyToOne",
      "required": false,
      "description": "O veículo pode estar atribuído a um motorista responsável por conduzi-lo.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Veiculo",
        "from": {
          "entityId": "Veiculo",
          "fieldIds": [
            "motoristaId"
          ]
        },
        "to": {
          "entityId": "Motorista",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "abastecimentoVeiculo",
      "fromEntity": "Abastecimento",
      "toEntity": "Veiculo",
      "type": "manyToOne",
      "required": true,
      "description": "O abastecimento é registrado para um veículo da frota.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Abastecimento",
        "from": {
          "entityId": "Abastecimento",
          "fieldIds": [
            "veiculoId"
          ]
        },
        "to": {
          "entityId": "Veiculo",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "abastecimentoMotorista",
      "fromEntity": "Abastecimento",
      "toEntity": "Motorista",
      "type": "manyToOne",
      "required": true,
      "description": "O abastecimento é registrado pelo motorista que realizou o lançamento.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "Abastecimento",
        "from": {
          "entityId": "Abastecimento",
          "fieldIds": [
            "motoristaId"
          ]
        },
        "to": {
          "entityId": "Motorista",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "planoManutencaoVeiculo",
      "fromEntity": "PlanoManutencao",
      "toEntity": "Veiculo",
      "type": "manyToOne",
      "required": true,
      "description": "O plano preventivo define a manutenção de um veículo específico.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "PlanoManutencao",
        "from": {
          "entityId": "PlanoManutencao",
          "fieldIds": [
            "veiculoId"
          ]
        },
        "to": {
          "entityId": "Veiculo",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "ordemManutencaoVeiculo",
      "fromEntity": "OrdemManutencao",
      "toEntity": "Veiculo",
      "type": "manyToOne",
      "required": true,
      "description": "A ordem de manutenção encaminha um veículo para serviço.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "OrdemManutencao",
        "from": {
          "entityId": "OrdemManutencao",
          "fieldIds": [
            "veiculoId"
          ]
        },
        "to": {
          "entityId": "Veiculo",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "ordemManutencaoPlano",
      "fromEntity": "OrdemManutencao",
      "toEntity": "PlanoManutencao",
      "type": "manyToOne",
      "required": false,
      "description": "A ordem pode ser aberta em decorrência do vencimento de um plano preventivo.",
      "persistence": {
        "mode": "moduleReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "OrdemManutencao",
        "from": {
          "entityId": "OrdemManutencao",
          "fieldIds": [
            "planoManutencaoId"
          ]
        },
        "to": {
          "entityId": "PlanoManutencao",
          "fieldIds": [
            "id"
          ]
        }
      }
    },
    {
      "relationshipId": "ordemManutencaoOficina",
      "fromEntity": "OrdemManutencao",
      "toEntity": "Oficina",
      "type": "manyToOne",
      "required": true,
      "description": "A ordem de manutenção é executada por uma oficina.",
      "persistence": {
        "mode": "crossStoreReference"
      },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "OrdemManutencao",
        "from": {
          "entityId": "OrdemManutencao",
          "fieldIds": [
            "oficinaId"
          ]
        },
        "to": {
          "entityId": "Oficina",
          "fieldIds": [
            "id"
          ]
        }
      }
    }
  ]
} as const satisfies Ns5OntologyIndexArtifact;

export type ManutencaoFrotaOntologyIndexType = typeof manutencaoFrotaOntologyIndex;

export default manutencaoFrotaOntologyIndex;
