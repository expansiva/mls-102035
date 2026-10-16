/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/tarefas/journeys/revisarTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const revisarTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "revisarTarefa",
  "business": {
    "actorRef": "gestor",
    "title": "Revisar tarefa",
    "goal": "Aceitar a tarefa ou devolvê-la para ajuste.",
    "entry": { "mode": "fromNotification" },
    "steps": [
      {
        "stepId": "concluir",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "concluir",
        "title": "Concluir",
        "description": "Aceita a tarefa revisada."
      },
      {
        "stepId": "devolver",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "devolver",
        "title": "Devolver",
        "description": "Devolve a tarefa para quem executa."
      }
    ],
    "outcome": {
      "statement": "A revisão terminou em conclusão ou em devolução.",
      "evidence": ["A tarefa está concluída ou em andamento."]
    }
  },
  "businessHash": "sha256:0000000000000000000000000000000000000000000000000000000000000003"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export default revisarTarefaJourney;
