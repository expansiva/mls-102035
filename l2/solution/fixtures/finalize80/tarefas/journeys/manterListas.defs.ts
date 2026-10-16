/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/tarefas/journeys/manterListas.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manterListasJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "manterListas",
  "business": {
    "actorRef": "gestor",
    "title": "Manter listas",
    "goal": "Consultar as listas. A gravação é o cadastro crud da Lista.",
    "entry": { "mode": "coldStart" },
    "steps": [
      {
        "stepId": "listar",
        "kind": "locate",
        "entity": "Lista",
        "title": "Listar listas",
        "description": "Lista os agrupamentos de tarefas."
      },
      {
        "stepId": "consultar",
        "kind": "inspect",
        "entity": "Lista",
        "title": "Consultar lista",
        "description": "Mostra o nome da lista."
      }
    ],
    "outcome": {
      "statement": "O gestor consultou as listas.",
      "evidence": ["A lista mostra o nome."]
    }
  },
  "businessHash": "sha256:0000000000000000000000000000000000000000000000000000000000000006"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export default manterListasJourney;
