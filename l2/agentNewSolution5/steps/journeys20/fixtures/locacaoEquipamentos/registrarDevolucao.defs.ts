/// <mls fileReference="_102047_/l4/locacaoEquipamentos/journeys/registrarDevolucao.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarDevolucaoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarDevolucao",
  "business": {
    "actorRef": "atendente",
    "title": "Registrar devolução de equipamentos",
    "goal": "Registrar a devolução efetiva e concluir a locação, incluindo a multa por atraso quando aplicável.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarContrato",
        "kind": "locate",
        "entity": "ContratoLocacao",
        "title": "x",
        "description": "Localiza o contrato em aberto, caso ele não esteja previamente em contexto."
      },
      {
        "stepId": "conferirContrato",
        "kind": "inspect",
        "entity": "ContratoLocacao",
        "title": "x",
        "description": "Confere os equipamentos locados e a data prevista de devolução."
      },
      {
        "stepId": "registrarDevolucaoReal",
        "kind": "act",
        "entity": "ContratoLocacao",
        "affects": [
          "Equipamento"
        ],
        "effect": "transition",
        "transitionRef": "registrarDevolucao",
        "title": "x",
        "description": "Registra a data real de devolução, conclui o contrato e torna os equipamentos devolvidos disponíveis conforme sua situação."
      },
      {
        "stepId": "consultarMultaCalculada",
        "kind": "inspect",
        "entity": "ContratoLocacao",
        "title": "x",
        "description": "Consulta a multa calculada quando a devolução ocorreu após a data prevista."
      }
    ],
    "outcome": {
      "statement": "A devolução é registrada e a multa por atraso, quando houver, fica disponível no contrato.",
      "evidence": [
        "Contrato marcado como devolvido com a data real de devolução.",
        "Multa exibida no contrato quando houver dias de atraso.",
        "Equipamentos devolvidos deixam de constar como locados."
      ]
    }
  },
  "businessHash": "sha256:5c8eceb98d96a9dbf6b273f31fb176d4ac3b2e34a0dc0690192fe52f03cf9a07"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarDevolucaoJourneyType = typeof registrarDevolucaoJourney;

export default registrarDevolucaoJourney;
