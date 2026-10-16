/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/tarefas/journeys/gerenciarTarefas.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const gerenciarTarefasJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "gerenciarTarefas",
  "business": {
    "actorRef": "gestor",
    "title": "Gerenciar tarefas",
    "goal": "Consultar as tarefas da organização sem avançar o ciclo.",
    "entry": { "mode": "coldStart" },
    "steps": [
      {
        "stepId": "listar",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Listar tarefas",
        "description": "Lista as tarefas."
      },
      {
        "stepId": "consultar",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Consultar tarefa",
        "description": "Mostra título, situação, responsável, prazo e lista."
      }
    ],
    "outcome": {
      "statement": "O gestor consultou as tarefas.",
      "evidence": ["A consulta mostra a situação atual."]
    }
  },
  "businessHash": "sha256:0000000000000000000000000000000000000000000000000000000000000005"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export default gerenciarTarefasJourney;
