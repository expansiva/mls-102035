/// <mls fileReference="_102047_/l4/comandaRestaurante/journeys/cancelarItemLancado.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cancelarItemLancadoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cancelarItemLancado",
  "business": {
    "actorRef": "garcom",
    "title": "Cancelar item lançado por engano",
    "goal": "Cancelar um lançamento incorreto enquanto a comanda estiver aberta.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarComandaParaCancelamento",
        "kind": "locate",
        "entity": "Comanda",
        "title": "x",
        "description": "Localiza a comanda aberta que contém o lançamento incorreto."
      },
      {
        "stepId": "inspecionarLancamentos",
        "kind": "inspect",
        "entity": "ItemComanda",
        "title": "x",
        "description": "Identifica o item lançado por engano na comanda."
      },
      {
        "stepId": "cancelarLancamento",
        "kind": "act",
        "entity": "ItemComanda",
        "affects": [
          "Comanda"
        ],
        "effect": "transition",
        "transitionRef": "cancelarItemComanda",
        "title": "x",
        "description": "Cancela o lançamento incorreto enquanto a comanda permanece aberta."
      }
    ],
    "outcome": {
      "statement": "O lançamento incorreto é cancelado e deixa de compor a comanda.",
      "evidence": [
        "Item da comanda identificado como cancelado.",
        "Total da comanda reflete a exclusão do lançamento cancelado."
      ]
    }
  },
  "businessHash": "sha256:b9b486a4dd4639f4b6b019d2e416c3348e522f64576e37ca888a796dd0dae71e"
} as const satisfies Ns5JourneyArtifact;

export type CancelarItemLancadoJourneyType = typeof cancelarItemLancadoJourney;

export default cancelarItemLancadoJourney;
