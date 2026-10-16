/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/tarefas/journeys/executarTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const executarTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "executarTarefa",
  "business": {
    "actorRef": "membro",
    "title": "Executar tarefa",
    "goal": "Começar ou retomar a tarefa e enviá-la para revisão.",
    "entry": { "mode": "fromNotification" },
    "steps": [
      {
        "stepId": "iniciar",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "iniciar",
        "title": "Iniciar",
        "description": "Marca a tarefa como em andamento."
      },
      {
        "stepId": "enviarParaRevisao",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "enviarParaRevisao",
        "title": "Enviar para revisão",
        "description": "Entrega a tarefa ao gestor."
      }
    ],
    "outcome": {
      "statement": "A tarefa foi enviada para revisão.",
      "evidence": ["A tarefa está em revisão."]
    }
  },
  "businessHash": "sha256:0000000000000000000000000000000000000000000000000000000000000002"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export default executarTarefaJourney;
