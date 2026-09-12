/// <mls fileReference="_102047_/l4/comandaRestaurante/journeys/abrirComanda.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const abrirComandaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "abrirComanda",
  "business": {
    "actorRef": "garcom",
    "title": "Abrir comanda para uma mesa",
    "goal": "Iniciar uma comanda para uma mesa disponível.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarMesa",
        "kind": "locate",
        "entity": "Mesa",
        "title": "x",
        "description": "Localiza a mesa que receberá a comanda."
      },
      {
        "stepId": "inspecionarMesa",
        "kind": "inspect",
        "entity": "Mesa",
        "title": "x",
        "description": "Confirma que a mesa está disponível."
      },
      {
        "stepId": "criarComanda",
        "kind": "act",
        "entity": "Comanda",
        "affects": [
          "Mesa"
        ],
        "effect": "create",
        "title": "x",
        "description": "Abre uma comanda vinculada à mesa e a deixa ocupada."
      }
    ],
    "outcome": {
      "statement": "A comanda fica aberta para a mesa selecionada.",
      "evidence": [
        "Comanda criada e vinculada à mesa.",
        "Mesa identificada como ocupada."
      ]
    }
  },
  "businessHash": "sha256:2829d350a65fa60859c7e2167b658e6240876990cae99fec884eed2ac3d72dad"
} as const satisfies Ns5JourneyArtifact;

export type AbrirComandaJourneyType = typeof abrirComandaJourney;

export default abrirComandaJourney;
