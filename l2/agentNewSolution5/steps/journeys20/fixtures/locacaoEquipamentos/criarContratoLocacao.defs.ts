/// <mls fileReference="_102047_/l4/locacaoEquipamentos/journeys/criarContratoLocacao.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const criarContratoLocacaoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "criarContratoLocacao",
  "business": {
    "actorRef": "atendente",
    "title": "Criar contrato de locação",
    "goal": "Formalizar a locação de um cliente para um ou mais equipamentos em um período definido.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarCliente",
        "kind": "locate",
        "entity": "Cliente",
        "title": "x",
        "description": "Localiza o cliente para quem será feita a locação ou informa seus dados para criação ou vinculação."
      },
      {
        "stepId": "consultarEquipamentos",
        "kind": "locate",
        "entity": "Equipamento",
        "title": "x",
        "description": "Localiza os equipamentos solicitados para a locação."
      },
      {
        "stepId": "verificarEquipamentos",
        "kind": "inspect",
        "entity": "Equipamento",
        "title": "x",
        "description": "Confere a situação dos equipamentos e sua disponibilidade para as datas de retirada e devolução prevista."
      },
      {
        "stepId": "registrarContrato",
        "kind": "act",
        "entity": "ContratoLocacao",
        "affects": [
          "Cliente",
          "Equipamento"
        ],
        "effect": "create",
        "title": "x",
        "description": "Cria o contrato com o cliente, os equipamentos, a data de retirada e a data prevista de devolução."
      }
    ],
    "outcome": {
      "statement": "O contrato de locação é registrado para os equipamentos disponíveis no período solicitado.",
      "evidence": [
        "Contrato de locação criado com cliente, equipamentos e período de locação.",
        "Equipamentos vinculados ao contrato passam a constar como locados para o período registrado."
      ]
    }
  },
  "businessHash": "sha256:a8e12be4223a6ab77910233bdd0520e657517fb2a1cc1731da2e415481cd13b9"
} as const satisfies Ns5JourneyArtifact;

export type CriarContratoLocacaoJourneyType = typeof criarContratoLocacaoJourney;

export default criarContratoLocacaoJourney;
