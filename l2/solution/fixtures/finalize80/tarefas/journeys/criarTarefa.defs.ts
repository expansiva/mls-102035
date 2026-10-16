/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/tarefas/journeys/criarTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const criarTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "criarTarefa",
  "business": {
    "actorRef": "membro",
    "title": "Criar tarefa",
    "goal": "Abrir uma tarefa e passar a vez para a execução.",
    "entry": { "mode": "coldStart" },
    "steps": [
      {
        "stepId": "criar",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "create",
        "title": "Criar tarefa",
        "description": "Grava a tarefa a fazer, com responsável, prazo e lista."
      },
      {
        "stepId": "encaminharExecucao",
        "kind": "handoff",
        "entity": "Tarefa",
        "handoffTo": "membro",
        "title": "Encaminhar para execução",
        "description": "Passa a vez para quem vai executar a tarefa."
      }
    ],
    "outcome": {
      "statement": "A tarefa existe e a execução foi avisada.",
      "evidence": ["A tarefa está a fazer."]
    }
  },
  "businessHash": "sha256:0000000000000000000000000000000000000000000000000000000000000001"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export default criarTarefaJourney;
