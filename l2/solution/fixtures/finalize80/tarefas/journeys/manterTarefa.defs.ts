/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/tarefas/journeys/manterTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manterTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "manterTarefa",
  "business": {
    "actorRef": "membro",
    "title": "Manter tarefa",
    "goal": "Cancelar uma tarefa fora do ciclo de revisão.",
    "entry": { "mode": "contextOrLookup" },
    "steps": [
      {
        "stepId": "localizar",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Localizar tarefa",
        "description": "Localiza a tarefa a cancelar."
      },
      {
        "stepId": "cancelar",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "cancelar",
        "title": "Cancelar",
        "description": "Cancela a tarefa."
      }
    ],
    "outcome": {
      "statement": "A tarefa foi cancelada.",
      "evidence": ["A tarefa está cancelada."]
    }
  },
  "businessHash": "sha256:0000000000000000000000000000000000000000000000000000000000000004"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export default manterTarefaJourney;
